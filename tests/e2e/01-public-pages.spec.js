/**
 * 01 — Public Pages (TOP 10 ESSENTIAL TESTS)
 * Core public pages accessible without authentication.
 * Screenshots saved to tests/screenshots/01-*.png
 */
import { test, expect } from '@playwright/test'
import { takeScreenshot } from '../utils/helpers.js'

test.describe('Public Pages — No Authentication Required', () => {

  // ─── Home Page ─────────────────────────────────────────────────────────────
  test('01-01 Home page loads with hero section', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('h1').first()).toContainText('Farm')
    // Use first() to avoid strict mode violation when multiple elements contain "Maharashtra"
    await expect(page.locator('text=Maharashtra').first()).toBeVisible()
    await takeScreenshot(page, '01-01-home-hero')
  })

  // ─── 404 Page ──────────────────────────────────────────────────────────────
  test('01-13 Unknown routes show 404 page', async ({ page }) => {
    await page.goto('/this-route-does-not-exist')
    await expect(page.locator('text=404')).toBeVisible()
    await takeScreenshot(page, '01-13-404-page')
  })
})
