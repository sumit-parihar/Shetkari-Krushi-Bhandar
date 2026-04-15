/**
 * 03 — Customer Flows (TOP 10 ESSENTIAL TESTS)
 * Core customer dashboard and orders functionality.
 * Uses saved auth state from global-setup (ramesh@gmail.com / 123456).
 * Screenshots saved to tests/screenshots/03-*.png
 */
import { test, expect } from '@playwright/test'
import { takeScreenshot } from '../utils/helpers.js'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

test.use({ storageState: path.join(__dirname, '..', '.auth', 'customer.json') })

test.describe('Customer — Dashboard', () => {

  test('03-01 Customer dashboard loads with welcome message', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('h1').first()).toContainText('Welcome')
    await takeScreenshot(page, '03-01-customer-dashboard')
  })
})

test.describe('Customer — Orders', () => {

  test('03-06 Orders page loads with My Orders heading', async ({ page }) => {
    await page.goto('/orders')
    await page.waitForLoadState('networkidle')
    // Verify the page loads - heading "My Orders" should be visible
    await expect(page.locator('text=My Orders')).toBeVisible()
    await takeScreenshot(page, '03-06-orders-page')
  })
})
