import { chromium } from '@playwright/test'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const BASE = 'http://localhost:3000'
const AUTH_DIR = path.join(__dirname, '.auth')
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots')

const CREDENTIALS = {
  admin:    { email: 'admin@gmail.com',    password: 'admin123' },
  customer: { email: 'user1@gmail.com',   password: '123456'   },
  delivery: { email: 'delivery1@gmail.com', password: '123456'   },
}

async function saveAuthState(browser, role) {
  const creds = CREDENTIALS[role]
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } })
  const page = await ctx.newPage()
  try {
    await page.goto(`${BASE}/login`)
    await page.waitForSelector('input[type="email"]', { timeout: 15000 })
    await page.fill('input[type="email"]', creds.email)
    await page.fill('input[type="password"]', creds.password)
    await page.click('button[type="submit"]')
    await page.waitForURL(`${BASE}/`, { timeout: 15000 })
    await ctx.storageState({ path: path.join(AUTH_DIR, `${role}.json`) })
    console.log(`  ✅ [${role}] auth state saved`)
  } catch (e) {
    console.warn(`  ⚠️  [${role}] login failed: ${e.message}`)
    // Write empty state so test files don't crash on file-not-found
    fs.writeFileSync(
      path.join(AUTH_DIR, `${role}.json`),
      JSON.stringify({ cookies: [], origins: [] })
    )
  } finally {
    await ctx.close()
  }
}

export default async function globalSetup() {
  // Create required directories
  if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true })
  if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true })

  console.log('\n🔐 Setting up authentication states...')
  const browser = await chromium.launch({ headless: true })

  await saveAuthState(browser, 'admin')
  await saveAuthState(browser, 'customer')
  await saveAuthState(browser, 'delivery')

  await browser.close()
  console.log('✅ Global setup complete\n')
}
