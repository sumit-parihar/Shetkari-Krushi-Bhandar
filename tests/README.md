# SKB — Playwright E2E Test Suite

Automated end-to-end tests for **Shetkari Krushi Bhandar** using [Playwright](https://playwright.dev/).

---

## Prerequisites

Both servers must be running before executing tests:

```powershell
# Terminal 1 — Frontend (http://localhost:3000)
cd frontend
npm run dev

# Terminal 2 — Backend (http://localhost:8000)
cd backend
uvicorn app.main:app --reload --port 8000
```

---

## Test Accounts

These credentials must exist in the database:

| Role          | Email                 | Password  |
|---------------|-----------------------|-----------|
| Admin         | admin@gmail.com       | admin123  |
| Customer      | ramesh@gmail.com      | 123456    |
| Delivery Boy  | delivery@gmail.com    | 123456    |

Run `Databases/seed_dev.sql` for admin + customer.

> **Note:** Delivery boy tests have been removed from the optimized test suite.

---

## Setup

```powershell
cd tests
npm install
npx playwright install chromium
```

---

## Running Tests

```powershell
# Run all 5 suites (recommended — full run)
npm test

# Run individual suites
npm run test:public      # 01 — Public pages
npm run test:auth        # 02 — Login / Register / Logout / Route protection
npm run test:customer    # 03 — Customer dashboard, orders, cart, checkout
npm run test:admin       # 04 — Admin dashboard, products, categories, orders, users
npm run test:delivery    # 05 — Delivery dashboard (skipped if user not in DB)

# Run with a visible browser window
npm run test:headed

# Interactive Playwright UI mode
npm run test:ui

# View HTML report after run
npm run test:report
```

---

## Test Output & Evidence

| Evidence Type                | Location                       | Description                               |
|------------------------------|--------------------------------|-------------------------------------------|
| **Manual Screenshots**       | `tests/screenshots/*.png`      | Captured at key moments by each test      |
| **Auto Screenshots**         | `tests/test-results/`          | Playwright captures for all tests (on)    |
| **Videos** (on failure)      | `tests/test-results/`          | Retained on failure                       |
| **Traces** (on failure)      | `tests/test-results/`          | Full trace for debugging                  |
| **HTML Report**              | `tests/reports/index.html`     | Open with `npm run test:report`           |
| **JSON Results**             | `tests/reports/results.json`   | Machine-readable results                  |

---

## Test Suite Overview (Optimized - Top 10 Essential Tests)

| File                          | Tests | Coverage                                                       |
|-------------------------------|-------|----------------------------------------------------------------|
| `01-public-pages.spec.js`     | 2     | Home page, 404 handling                                        |
| `02-auth.spec.js`             | 3     | Customer login, admin login, route protection                  |
| `03-customer-flows.spec.js`   | 2     | Customer dashboard, orders page                                |
| `04-admin-flows.spec.js`      | 3     | Admin dashboard, products, orders                              |
| `05-delivery-flows.spec.js`   | 0     | Removed (requires special DB setup)                            |
| **Total**                     | **10** | Core e-commerce flows only                                    |

---

## Folder Structure

```
tests/
├── e2e/
│   ├── 01-public-pages.spec.js
│   ├── 02-auth.spec.js
│   ├── 03-customer-flows.spec.js
│   ├── 04-admin-flows.spec.js
│   └── 05-delivery-flows.spec.js
├── utils/
│   └── helpers.js          ← takeScreenshot(), loginViaUI(), CREDENTIALS
├── screenshots/            ← 📸 Evidence screenshots (committed to git)
├── .auth/                  ← Auth state files (gitignored, auto-generated)
├── test-results/           ← Playwright output (gitignored)
├── reports/                ← HTML + JSON reports (gitignored)
├── global-setup.js         ← Runs once before all tests (saves auth states)
├── playwright.config.js
├── package.json
└── README.md
```

---

## Notes

- Tests run **sequentially** (`workers: 1`) to avoid DB conflicts.
- `retries: 1` — each failing test gets one automatic retry.
- Delivery boy tests auto-skip if the user doesn't exist in the DB.
- Screenshots are captured for every test regardless of pass/fail (`screenshot: 'on'`).
