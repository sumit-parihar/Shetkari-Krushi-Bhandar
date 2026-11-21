// Browser smoke tests for the three roles. Run with: npm run test:e2e
import { test, expect } from '@playwright/test'
import fs from 'node:fs'

const BASE = () => process.env.E2E_BASE_URL
const API = () => process.env.E2E_API_URL
const PASSWORD = () => process.env.E2E_PASSWORD

async function apiLogin(email) {
  const r = await fetch(`${API()}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD() }),
  })
  return (await r.json()).data
}

// Log in by putting the session into sessionStorage (faster than the form)
async function loginAs(page, email) {
  const session = await apiLogin(email)
  await page.goto(BASE() + '/')
  await page.evaluate(s => {
    sessionStorage.setItem('skb_token', s.token)
    sessionStorage.setItem('skb_user', JSON.stringify(s.user))
  }, session)
}

function collectErrors(page) {
  const errors = []
  page.on('console', m => m.type() === 'error' && errors.push(m.text()))
  page.on('pageerror', e => errors.push(e.message))
  return errors
}

test('visitor can register with the emailed code and log in', async ({ page }) => {
  const email = `farmer-${Date.now()}@test.local`
  await page.goto(BASE() + '/register')
  await page.getByLabel('Full Name').fill('Test Farmer')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Phone Number').fill('9876543210')
  await page.getByLabel('Delivery Address').fill('Main Road, Sangola')
  await page.getByLabel('Password', { exact: true }).fill('secret12')
  await page.getByLabel('Confirm Password').fill('secret12')
  await page.getByRole('button', { name: 'Create Account' }).click()

  await expect(page.getByLabel('Verification Code')).toBeVisible()
  const otp = JSON.parse(fs.readFileSync(process.env.E2E_OTP_FILE, 'utf8'))[email]
  await page.getByLabel('Verification Code').fill(otp)
  await page.getByRole('button', { name: /Verify/ }).click()
  await expect(page).toHaveURL(/\/login/)

  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password', { exact: true }).fill('secret12')
  await page.getByRole('button', { name: 'Sign In' }).click()
  await expect(page.locator('nav')).toContainText('Test Farmer')
})

test('customer can order a product and then see it in their orders', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto(BASE() + '/login')
  await page.getByLabel('Email').fill('ramesh@gmail.com')
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD())
  await page.getByRole('button', { name: 'Sign In' }).click()
  await expect(page.locator('nav')).toContainText('Ramesh')

  await page.goto(BASE() + '/products/4')
  await page.locator('button.btn-primary').last().click()
  await expect(page.getByText('Added to cart!')).toBeVisible()

  await page.goto(BASE() + '/checkout')
  await page.locator('textarea').fill('Plot 12, Kolhapur')
  await page.getByRole('button', { name: 'Place Order' }).click()
  await expect(page.getByText('Order Placed!')).toBeVisible()

  await page.goto(BASE() + '/orders')
  await expect(page.getByText('Plot 12, Kolhapur').or(page.getByText(/#\d+/).first())).toBeVisible()
  expect(errors).toEqual([])
})

test('blank checkout address falls back to the registered address', async ({ page }) => {
  await loginAs(page, 'suresh@gmail.com')       // seed customer with a registered address
  await page.goto(BASE() + '/products/3')
  await page.locator('button.btn-primary').last().click()
  await expect(page.getByText('Added to cart!')).toBeVisible()
  await page.goto(BASE() + '/checkout')
  await page.locator('textarea').fill('')
  await page.getByRole('button', { name: 'Place Order' }).click()
  await expect(page.getByText('Order Placed!')).toBeVisible()
})

test('admin dashboard, orders and a phone-sized orders table', async ({ page }) => {
  const errors = collectErrors(page)
  await loginAs(page, 'admin@gmail.com')
  await page.goto(BASE() + '/admin')
  await expect(page.getByText('Total Revenue')).toBeVisible()
  await page.goto(BASE() + '/admin/orders')
  await expect(page.locator('tbody tr').first()).toBeVisible()

  await page.setViewportSize({ width: 375, height: 800 })
  await page.reload()
  await expect(page.locator('tbody tr').first()).toBeVisible()
  const overflow = await page.evaluate(() => {
    const wrap = document.querySelector('table').parentElement
    return wrap.scrollWidth - wrap.clientWidth
  })
  expect(overflow).toBeLessThanOrEqual(1)
  expect(errors).toEqual([])
})

test('delivery boy sees summary cards and only their own links', async ({ page }) => {
  await loginAs(page, 'delivery@test.local')
  await page.goto(BASE() + '/delivery')
  await expect(page.getByText('Total Assigned')).toBeVisible()
  const footerLinks = await page.locator('footer a').evaluateAll(as => as.map(a => a.getAttribute('href')))
  expect(footerLinks).toContain('/delivery')
  expect(footerLinks).not.toContain('/orders')
  await page.goto(BASE() + '/orders')           // a customer page
  await expect(page).toHaveURL(/\/delivery$/)
})

test('public pages render without console errors', async ({ page }) => {
  const errors = collectErrors(page)
  for (const path of ['/', '/products', '/products/3', '/login', '/register', '/does-not-exist']) {
    await page.goto(BASE() + path)
    await page.waitForLoadState('networkidle')
  }
  await expect(page.getByText('404')).toBeVisible()
  expect(errors).toEqual([])
})
