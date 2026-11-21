/**
 * Starts the full stack for the browser tests and returns a teardown function:
 *   1. throwaway PostgreSQL (Docker) — or TEST_DATABASE_URL — initialised with init_db.py
 *   2. the backend (backend/tests/_server.py, email stubbed, rate limits off)
 *   3. a production build of the frontend served by `vite preview`
 * Never reads backend/.env and refuses Neon URLs, so the live database is never touched.
 */
import { spawn, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const FRONTEND = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ROOT = path.resolve(FRONTEND, '..')
const BACKEND = path.join(ROOT, 'backend')
const VITE = path.join(FRONTEND, 'node_modules', 'vite', 'bin', 'vite.js')
export const PASSWORD = 'Test@12345'

function pythonExe() {
  if (process.env.PYTHON) return process.env.PYTHON
  for (const p of [path.join(BACKEND, 'venv', 'Scripts', 'python.exe'), path.join(BACKEND, 'venv', 'bin', 'python')]) {
    if (fs.existsSync(p)) return p
  }
  return process.platform === 'win32' ? 'python' : 'python3'
}

const freePort = () => new Promise(resolve => {
  const srv = net.createServer().listen(0, '127.0.0.1', () => { const { port } = srv.address(); srv.close(() => resolve(port)) })
})
const sleep = ms => new Promise(r => setTimeout(r, ms))

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', ...opts })
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(' ')} failed:\n${r.stdout}\n${r.stderr}`)
  return r.stdout
}

async function waitFor(url, proc, timeoutMs = 60_000) {
  const end = Date.now() + timeoutMs
  while (Date.now() < end) {
    try { if ((await fetch(url)).ok) return } catch {}
    if (proc && proc.exitCode !== null) throw new Error(`process for ${url} exited early`)
    await sleep(300)
  }
  throw new Error(`timed out waiting for ${url}`)
}

export default async function globalSetup() {
  const PY = pythonExe()
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'skb-e2e-'))
  const cleanups = []

  // 1. database
  let dbUrl = process.env.TEST_DATABASE_URL
  if (!dbUrl) {
    const name = `skb-e2e-${Date.now()}`
    const port = await freePort()
    run('docker', ['run', '-d', '--rm', '--name', name, '-e', 'POSTGRES_PASSWORD=test', '-e', 'POSTGRES_DB=skbtest',
      '-p', `127.0.0.1:${port}:5432`, 'postgres:16', '-c', 'ssl=on',
      '-c', 'ssl_cert_file=/etc/ssl/certs/ssl-cert-snakeoil.pem', '-c', 'ssl_key_file=/etc/ssl/private/ssl-cert-snakeoil.key'],
      { env: { ...process.env, MSYS_NO_PATHCONV: '1' } })
    cleanups.push(() => spawnSync('docker', ['rm', '-f', name]))
    dbUrl = `postgresql://postgres:test@127.0.0.1:${port}/skbtest`
  }
  if (dbUrl.includes('neon.tech')) throw new Error('Refusing to run browser tests against the live Neon database')

  const pyEnv = { ...process.env, DATABASE_URL: dbUrl, PYTHONIOENCODING: 'utf-8' }
  const ping = 'import sys, psycopg2; psycopg2.connect(sys.argv[1], sslmode="require", connect_timeout=3).close()'
  for (let ok = 0, i = 0; ok < 2; i++) {          // postgres restarts once after initdb
    if (i > 90) throw new Error('test database did not start')
    ok = spawnSync(PY, ['-c', ping, dbUrl]).status === 0 ? ok + 1 : 0
    await sleep(1000)
  }
  run(PY, [path.join(ROOT, 'init_db.py')], { cwd: ROOT, env: pyEnv })
  run(PY, ['-c', `
import sys, bcrypt, psycopg2
h = bcrypt.hashpw(b"${PASSWORD}", bcrypt.gensalt(rounds=4)).decode()
c = psycopg2.connect(sys.argv[1], sslmode="require"); c.autocommit = True; cur = c.cursor()
cur.execute("UPDATE Users SET password = %s", (h,))
cur.execute("INSERT INTO Users (name, email, password, role, is_verified) VALUES ('Delivery One', 'delivery@test.local', %s, 'delivery_boy', TRUE)", (h,))
`, dbUrl], { env: pyEnv })

  // 2. backend
  const apiPort = await freePort(), webPort = await freePort()
  const otpFile = path.join(work, 'otps.json')
  const backend = spawn(PY, [path.join(BACKEND, 'tests', '_server.py')], {
    cwd: BACKEND, stdio: ['ignore', fs.openSync(path.join(work, 'backend.log'), 'w'), 'pipe'],
    env: { ...pyEnv, SECRET_KEY: 'e2e-secret-key-0123456789abcdef0123456789abcdef', FRONTEND_URL: `http://localhost:${webPort}`,
      ENV: 'production', BREVO_API_KEY: '', SENDER_EMAIL: '', SENDER_NAME: '', RATE_LIMIT_ENABLED: 'false',
      SKB_TEST_OTP_FILE: otpFile, PORT: String(apiPort) },
  })
  cleanups.push(() => backend.kill())
  await waitFor(`http://127.0.0.1:${apiPort}/health`, backend)

  // 3. frontend: production build pointed at the test backend, served by vite preview
  const outDir = path.join(work, 'dist')
  run(process.execPath, [VITE, 'build', '--outDir', outDir, '--emptyOutDir', '--logLevel', 'error'],
    { cwd: FRONTEND, env: { ...process.env, VITE_API_URL: `http://127.0.0.1:${apiPort}` } })
  const preview = spawn(process.execPath, [VITE, 'preview', '--outDir', outDir, '--port', String(webPort), '--strictPort', '--host', 'localhost'],
    { cwd: FRONTEND, stdio: 'ignore' })
  cleanups.push(() => preview.kill())
  await waitFor(`http://localhost:${webPort}/`, preview)

  // values for the tests (workers inherit these)
  process.env.E2E_BASE_URL = `http://localhost:${webPort}`
  process.env.E2E_API_URL = `http://127.0.0.1:${apiPort}/api/v1`
  process.env.E2E_OTP_FILE = otpFile
  process.env.E2E_PASSWORD = PASSWORD

  return async () => {
    for (const fn of cleanups.reverse()) { try { await fn() } catch {} }
    await sleep(500)
    fs.rmSync(work, { recursive: true, force: true })
  }
}
