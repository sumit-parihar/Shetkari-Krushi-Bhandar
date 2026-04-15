import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SCREENSHOTS_DIR = path.join(__dirname, '..', 'screenshots')

export const CREDENTIALS = {
  admin:    { email: 'admin@gmail.com',    password: 'admin123', name: 'Admin'        },
  customer: { email: 'ramesh@gmail.com',   password: '123456',   name: 'Ramesh Patil' },
  delivery: { email: 'delivery@gmail.com', password: '123456',   name: 'Delivery Boy' },
}

/**
 * Save a full-page screenshot to the screenshots/ folder.
 * @param {import('@playwright/test').Page} page
 * @param {string} name  filename without extension
 */
export async function takeScreenshot(page, name) {
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true })
  }
  const filePath = path.join(SCREENSHOTS_DIR, `${name}.png`)
  await page.screenshot({ path: filePath, fullPage: true })
  console.log(`  📸  screenshots/${name}.png`)
}

/**
 * Login via the UI login page.
 * @param {import('@playwright/test').Page} page
 * @param {'admin'|'customer'|'delivery'} role
 */
export async function loginViaUI(page, role) {
  const creds = CREDENTIALS[role]
  await page.goto('/login')
  await page.waitForSelector('input[type="email"]', { timeout: 15000 })
  await page.fill('input[type="email"]', creds.email)
  await page.fill('input[type="password"]', creds.password)
  await page.click('button[type="submit"]')
  await page.waitForURL('/', { timeout: 15000 })
}

/**
 * Click the user avatar in the navbar and then "Sign Out".
 * @param {import('@playwright/test').Page} page
 */
export async function logout(page) {
  // The navbar user button contains a rounded-full div with the user's initial
  await page.locator('nav button').filter({ has: page.locator('div.rounded-full') }).click()
  await page.click('text=Sign Out')
  await page.waitForURL('/', { timeout: 8000 })
}

/**
 * Check if a saved auth state file contains valid session data.
 * Returns false when the delivery boy doesn't exist in DB.
 * @param {string} filePath absolute path to the .json state file
 */
export function isAuthValid(filePath) {
  try {
    const state = JSON.parse(fs.readFileSync(filePath, 'utf8'))
    return Array.isArray(state.origins) && state.origins.length > 0
  } catch {
    return false
  }
}
