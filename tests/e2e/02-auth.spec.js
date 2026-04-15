/**
 * 02 — Authentication Flows (TOP 10 ESSENTIAL TESTS)
 * Core login, logout, and route protection tests.
 * Screenshots saved to tests/screenshots/02-*.png
 */
import { test, expect } from '@playwright/test'
import { takeScreenshot, CREDENTIALS, logout } from '../utils/helpers.js'

test.describe('Authentication — Login', () => {

  test('02-05 Login — customer login succeeds and redirects to home', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', CREDENTIALS.customer.email)
    await page.fill('input[type="password"]', CREDENTIALS.customer.password)
    await page.click('button[type="submit"]')
    await page.waitForURL('/', { timeout: 15000 })
    await expect(page).toHaveURL('http://localhost:3000/')
    await expect(page.locator('nav').locator(`text=${CREDENTIALS.customer.name}`)).toBeVisible()
    await takeScreenshot(page, '02-05-login-customer-success')
  })

  test('02-06 Login — admin login succeeds, user menu shows Admin badge', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', CREDENTIALS.admin.email)
    await page.fill('input[type="password"]', CREDENTIALS.admin.password)
    await page.click('button[type="submit"]')
    await page.waitForURL('/', { timeout: 15000 })

    await page.locator('nav button').filter({ has: page.locator('div.rounded-full') }).click()
    await expect(page.locator('text=Admin').first()).toBeVisible()
    await takeScreenshot(page, '02-06-login-admin-success')
  })
})

test.describe('Authentication — Route Protection', () => {

  test('02-18 Unauthenticated /dashboard redirects to /login', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForURL('**/login', { timeout: 10000 })
    await expect(page).toHaveURL(/login/)
    await takeScreenshot(page, '02-18-protected-dashboard')
  })
})
