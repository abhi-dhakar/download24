/**
 * TeraBox engine self-test — no network, no TeraBox account.
 *
 * TeraBox cannot be reached from most CI sandboxes (and hits change shape
 * constantly), so this harness compiles `lib/terabox.ts` to CommonJS, swaps
 * `globalThis.fetch` for a configurable fake TeraBox and asserts the behaviour
 * that matters:
 *
 *   1. the modern signed flow (jsToken → shorturlinfo → share/list → dlink) resolves;
 *   2. **the reported bug**: a link whose signed calls are verification-walled
 *      still resolves, instead of failing with "TeraBox rejected the share list";
 *   3. an unmapped errno from one mirror no longer aborts the whole sweep;
 *   4. errnos are mapped honestly (expired ≠ dead-browser-link, -9 = password);
 *   5. a stale token (4000020) is refreshed and retried once.
 *
 * Run with `npm run test:terabox`.
 */

import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import assert from 'node:assert/strict'
import path from 'node:path'
import fs from 'node:fs'
import process from 'node:process'

const ROOT = path.resolve(import.meta.dirname, '..')
const OUT = path.join(ROOT, '.selftest-build')

/* -------------------------------------------------------------------------- */
/*                                  Compile                                   */
/* -------------------------------------------------------------------------- */

if (!fs.existsSync(path.join(OUT, 'terabox.js')) || process.argv.includes('--rebuild')) {
  console.log('[selftest] compiling lib/ for the harness…')
  execFileSync('npx', ['tsc', '-p', 'tsconfig.selftest.json'], { cwd: ROOT, stdio: 'inherit' })
}

const require = createRequire(import.meta.url)
const terabox = require(path.join(OUT, 'terabox.js'))
const {
  resolveTeraboxShare,
  buildTeraboxPayload,
  openTeraboxFile,
  extractTeraboxTokens,
  teraboxSurlFrom
} = terabox

/* -------------------------------------------------------------------------- */
/*                               Fake TeraBox                                 */
/* -------------------------------------------------------------------------- */

/**
 * Fixtures below are the real shapes captured from live TeraBox/terabox.app
 * responses while reproducing the reported link (2026-09-17): the anonymous
 * `/share/list` payload, the `{"code":460020}` verification body and the
 * `{"errno":400210}` "need verify_v2" wall.
 */
const SHARE_URL = 'https://teraboxlink.com/s/1G1XrCeqCRYjd7y2G8-5l4Q'
const SURL = 'G1XrCeqCRYjd7y2G8-5l4Q'
const FILE_NAME = 'GirlNextDoorNeha-.mp4'
const FS_ID = '85932598413983'
const SHARE_ID = '429292563186'
const UK = '81366033583407'
const FILE_SIZE = 341738236
const DLINK = 'https://dm-data.teraboxlink.com/download/85932598413983?sign=cafebabe'

const fileEntry = (overrides = {}) => ({
  category: '1',
  fs_id: FS_ID,
  isdir: '0',
  md5: '8bd43a7eaf06c1a50ae125c3146bc404',
  path: `/2026-09-17 10-54/${FILE_NAME}`,
  server_filename: FILE_NAME,
  size: String(FILE_SIZE),
  width: 1920,
  height: 1080,
  duration: 846,
  ...overrides
})

const json = (body, init = {}) =>
  new Response(JSON.stringify(body), {
    status: 200,
    ...init,
    headers: { 'content-type': 'application/json', ...(init.headers ?? {}) }
  })

const html = (body) =>
  new Response(body, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } })

const jsTokenBlob = (token) =>
  `"jsToken":"function%20fn%28a%29%7Bwindow.jsToken%20%3D%20a%7D%3Bfn%28%22${token}%22%29"`

const MAIN_HTML = `<html><head></head><body><script>var templateData = ${JSON.stringify({ jsToken: `fn("%28%22${'a'.repeat(40)}%22%29")`, uk: UK, bdstoken: 'bdstokenvalue1' })};</script></body></html>`

const SHARE_HTML = `<html><head>
<meta property="og:title" content="${FILE_NAME} - Share Files Online" />
<meta property="og:image" content="https://dm-data.teraboxlink.com/thumbnail/8bd43a7eaf06c1a50ae125c3146bc404" />
</head><body><script>${jsTokenBlob('a'.repeat(40))}</script></body></html>`

let calls = []

/**
 * @param {object} spec
 * @param {string} spec.origin       mirror origin, e.g. https://teraboxlink.com
 * @param {boolean} [spec.tokens]    serve a usable jsToken on /main + share page
 * @param {object} [spec.responses]  overrides: fn(url, init) → Response | undefined
 */
function fakeTeraBox(spec) {
  return async function fetchMock(input, init = {}) {
    const url = new URL(typeof input === 'string' ? input : input.url)
    calls.push(`${init.method ?? 'GET'} ${url.origin}${url.pathname}${url.search}`)
    if (spec.responses) {
      const override = await spec.responses(url, init)
      if (override) return override
    }
    if (url.origin === 'https://cdn.example.test' || url.hostname.startsWith('dm-data.')) {
      return new Response(new Uint8Array(16), {
        status: 200,
        headers: { 'content-length': '16', 'content-type': 'video/mp4' }
      })
    }
    if (url.origin !== spec.origin) {
      return new Response('blocked', { status: 403 })
    }

    if (url.pathname === '/main') {
      if (!spec.tokens) return html('<html><body>no tokens here</body></html>')
      return html(MAIN_HTML)
    }
    if (url.pathname === '/sharing/link' || url.pathname === '/sharing/embed') {
      if (!spec.tokens) return html(`<html><head><meta property="og:image" content="https://img.test/t.jpg" /></head><body>share</body></html>`)
      return html(SHARE_HTML)
    }
    if (url.pathname === '/api/shorturlinfo') {
      if (!spec.tokens) return json({ errmsg: 'need verify_v2', errno: 400210 })
      return json({
        errno: 0,
        shareid: SHARE_ID,
        uk: UK,
        sign: 'fakesign+/=',
        timestamp: '1789617600',
        randsk: '',
        title: `/${FILE_NAME}`,
        list: [fileEntry(!spec.signed ? {} : { dlink: DLINK })]
      })
    }
    if (url.pathname === '/share/list') {
      const token = url.searchParams.get('jsToken')
      const signed = url.searchParams.get('sign')
      if (!spec.tokens && token) return json({ errmsg: 'need verify', code: 460020 })
      if (!token && !signed) return json({ errno: 0, list: [fileEntry()], share_id: SHARE_ID, uk: UK })
      return json({ errno: 0, list: [fileEntry(signed ? { dlink: DLINK } : {})] })
    }
    if (url.pathname === '/share/download') {
      return json({ errno: 0, dlink: DLINK })
    }
    if (url.pathname.includes('/rest/2.0/share/download')) {
      return json({ errno: 0, list: [{ dlink: DLINK }] })
    }
    return new Response('not found', { status: 404 })
  }
}

const scenarios = []
const scenario = (name, fn) => scenarios.push({ name, fn })
let currentFetch = null
const fetchImpl = (...args) => currentFetch(...args)

/* -------------------------------------------------------------------------- */
/*                                 Scenarios                                  */
/* -------------------------------------------------------------------------- */

scenario('token + metadata scraping (real page shapes)', async () => {
  const escaped = extractTeraboxTokens(
    `<script>${jsTokenBlob('c1a2b3d4e5f60718293a4b5c6d7e8f90112233445566')}</script>`
  )
  assert.equal(escaped.jsToken, 'c1a2b3d4e5f60718293a4b5c6d7e8f90112233445566')

  const template = extractTeraboxTokens(MAIN_HTML)
  assert.equal(template.jsToken, 'a'.repeat(40))
  assert.equal(template.uk, UK)

  const inline = extractTeraboxTokens(
    `<script>var x = fn%28%22d4e5f60718293a4b5c6d7e8f90112233445566778%22%29;</script>`
  )
  assert.equal(inline.jsToken, 'd4e5f60718293a4b5c6d7e8f90112233445566778')

  const metadata = extractTeraboxTokens(
    `<script>shareid="${SHARE_ID}"; uk="${UK}"; sign="fakesign+/="; timestamp="1789617600";</script>`
  )
  assert.equal(metadata.shareid, SHARE_ID)
  assert.equal(metadata.uk, UK)
  assert.equal(metadata.sign, 'fakesign+/=')
  assert.equal(metadata.timestamp, '1789617600')

  // The routing `1` is stripped, so API calls use the id TeraBox itself uses.
  assert.equal(teraboxSurlFrom(SHARE_URL), SURL)
})

scenario('signed flow resolves and downloads (jsToken → shorturlinfo → share/list → dlink)', async () => {
  currentFetch = fakeTeraBox({ origin: 'https://teraboxlink.com', tokens: true, signed: true })
  const share = await resolveTeraboxShare(SHARE_URL, { timeoutMs: 3000 })
  assert.equal(share.files.length, 1)
  assert.equal(share.files[0].name, FILE_NAME)
  assert.equal(share.files[0].size, FILE_SIZE)
  assert.equal(share.files[0].width, 1920)
  assert.equal(share.files[0].durationSeconds, 846)
  assert.equal(share.signed, true)
  assert.equal(share.meta.shareid, SHARE_ID)
  assert.ok(share.meta.sign, 'share record must carry the signing material')
  assert.ok(share.files[0].dlink, 'signed listing must carry a dlink')

  const opened = await openTeraboxFile(SHARE_URL, { path: share.files[0].path, name: FILE_NAME }, { timeoutMs: 3000 })
  assert.equal(opened.size, 16)
  assert.equal(opened.ext, 'mp4')
  await opened.response.body.cancel()
})

scenario('REGRESSION: verification-walled mirror still resolves the share (the reported bug)', async () => {
  currentFetch = fakeTeraBox({ origin: 'https://teraboxlink.com', tokens: false })
  const payload = await buildTeraboxPayload(SHARE_URL, { timeoutMs: 3000 })

  assert.equal(payload.options.length, 1, 'the file list must resolve')
  assert.equal(payload.options[0].label, FILE_NAME)
  assert.equal(payload.options[0].bytes, FILE_SIZE)
  assert.equal(payload.meta.platformId, 'terabox')
  assert.equal(payload.meta.title.includes(FILE_NAME), true)
  assert.match(payload.meta.warning ?? '', /TERABOX_COOKIE/)

  // The download link is genuinely withheld — say that, do not claim the link is dead.
  await assert.rejects(
    () => openTeraboxFile(SHARE_URL, { path: payload.options[0].remoteFile.path }, { timeoutMs: 3000 }),
    (error) => {
      assert.equal(error.code, 'VERIFICATION_REQUIRED')
      assert.doesNotMatch(error.message, /rejected the share list/i)
      assert.doesNotMatch(error.hint ?? '', /confirm the link still opens in a browser/i)
      assert.match(error.hint ?? '', /TERABOX_COOKIE/)
      return true
    }
  )
})

scenario('an unmapped errno on one mirror no longer aborts the sweep', async () => {
  const healthy = fakeTeraBox({ origin: 'https://www.terabox.com', tokens: false })
  currentFetch = async (input, init = {}) => {
    const url = new URL(typeof input === 'string' ? input : input.url)
    if (url.origin === 'https://teraboxlink.com') return json({ errno: 10001, errmsg: 'unknown' })
    return healthy(input, init)
  }
  const share = await resolveTeraboxShare(SHARE_URL, { timeoutMs: 3000 })
  assert.equal(share.files.length, 1)
  assert.equal(share.files[0].name, FILE_NAME)
  assert.equal(share.signed, false, 'an anonymous listing is not signed')
})

scenario('dead share reports an expired link, not a browser suggestion', async () => {
  currentFetch = async (input) => {
    const url = new URL(typeof input === 'string' ? input : input.url)
    if (url.pathname === '/main' || url.pathname.startsWith('/sharing/')) return html('<html></html>')
    return json({ errno: 115, errmsg: 'share expired' })
  }
  await assert.rejects(
    () => resolveTeraboxShare(SHARE_URL, { timeoutMs: 3000 }),
    (error) => {
      assert.equal(error.code, 'NOT_FOUND')
      assert.match(error.message, /expired/i)
      assert.doesNotMatch(error.hint ?? '', /confirm the link still opens in a browser/i)
      return true
    }
  )
})

scenario('password-protected share says so', async () => {
  currentFetch = async (input) => {
    const url = new URL(typeof input === 'string' ? input : input.url)
    if (url.pathname === '/main' || url.pathname.startsWith('/sharing/')) return html('<html></html>')
    if (url.pathname === '/api/shorturlinfo') return json({ errno: -9 })
    return json({ errno: -9 })
  }
  await assert.rejects(
    () => resolveTeraboxShare(SHARE_URL, { timeoutMs: 3000 }),
    (error) => {
      assert.equal(error.code, 'PASSWORD_REQUIRED')
      assert.match(error.message, /password/i)
      return true
    }
  )
})

scenario('an unknown errno everywhere is retryable, never "dead link"', async () => {
  currentFetch = async (input) => {
    const url = new URL(typeof input === 'string' ? input : input.url)
    if (url.pathname === '/main' || url.pathname.startsWith('/sharing/')) return html('<html></html>')
    return json({ errno: 424242, errmsg: 'who knows' })
  }
  await assert.rejects(
    () => resolveTeraboxShare(SHARE_URL, { timeoutMs: 3000 }),
    (error) => {
      assert.equal(error.code, 'UPSTREAM_ERROR')
      assert.match(error.message, /424242/)
      return true
    }
  )
})

scenario('a stale token (4000020) is refreshed from /main and retried', async () => {
  let listCalls = 0
  let mainCalls = 0
  currentFetch = async (input) => {
    const url = new URL(typeof input === 'string' ? input : input.url)
    if (url.pathname === '/main') {
      mainCalls += 1
      return html(MAIN_HTML)
    }
    if (url.pathname.startsWith('/sharing/')) return html(SHARE_HTML)
    if (url.pathname === '/api/shorturlinfo') {
      // Folders-only record: the files themselves come from `/share/list`.
      return json({ errno: 0, shareid: SHARE_ID, uk: UK, sign: 's', timestamp: '1', list: [] })
    }
    if (url.pathname === '/share/list') {
      listCalls += 1
      return listCalls === 1
        ? json({ errno: 4000020 })
        : json({ errno: 0, list: [fileEntry({ dlink: DLINK })] })
    }
    if (url.pathname === '/share/download') return json({ errno: 0, dlink: DLINK })
    return new Response('not found', { status: 404 })
  }
  const share = await resolveTeraboxShare(SHARE_URL, { timeoutMs: 3000 })
  assert.equal(listCalls, 2, 'the throttled listing must be retried once')
  assert.ok(mainCalls >= 2, 'the retry must fetch a fresh token')
  assert.equal(share.files.length, 1)
})

scenario('password-protected shares replay randsk as the TSID cookie + sekey param', async () => {
  let listingCookies = ''
  let listingQuery = null
  currentFetch = async (input, init = {}) => {
    const url = new URL(typeof input === 'string' ? input : input.url)
    if (url.pathname === '/main') return html(MAIN_HTML)
    if (url.pathname.startsWith('/sharing/')) return html(SHARE_HTML)
    if (url.pathname === '/api/shorturlinfo') {
      return json({
        errno: 0,
        shareid: SHARE_ID,
        uk: UK,
        sign: 's',
        timestamp: '1',
        randsk: 'enc%2Bkey',
        list: []
      })
    }
    if (url.pathname === '/share/list') {
      listingCookies = init.headers?.Cookie ?? init.headers?.cookie ?? ''
      listingQuery = url.searchParams
      return json({ errno: 0, list: [fileEntry({ dlink: DLINK })] })
    }
    return new Response('not found', { status: 404 })
  }
  const share = await resolveTeraboxShare(SHARE_URL, { timeoutMs: 3000 })
  assert.equal(share.files.length, 1)
  assert.equal(listingQuery.get('sekey'), 'enc+key', 'sekey must be the URL-decoded randsk')
  assert.match(listingCookies, /TSID=enc\+key/, 'TSID cookie must mirror the decoded randsk')
})

scenario('with a session configured, a signed mirror wins over an unsigned one', async () => {
  const unsigned = fakeTeraBox({ origin: 'https://teraboxlink.com', tokens: false })
  const signed = fakeTeraBox({ origin: 'https://www.terabox.com', tokens: true, signed: true })
  currentFetch = async (input, init = {}) => {
    const url = new URL(typeof input === 'string' ? input : input.url)
    return url.origin === 'https://teraboxlink.com' ? unsigned(input, init) : signed(input, init)
  }
  process.env.TERABOX_COOKIE = 'ndus=session-cookie-value'
  const share = await resolveTeraboxShare(SHARE_URL, { timeoutMs: 3000 })
  assert.equal(share.signed, true, 'the signed mirror must be preferred')
  assert.ok(share.files[0].dlink, 'a signed listing carries the dlink the UI needs')
})

/* -------------------------------------------------------------------------- */
/*                                   Runner                                   */
/* -------------------------------------------------------------------------- */

let failed = 0
for (const { name, fn } of scenarios) {
  const started = Date.now()
  calls = []
  process.env.TERABOX_API_BASE = ''
  delete process.env.TERABOX_API_BASE
  delete process.env.TERABOX_COOKIE
  delete process.env.TERABOX_RESOLVE_PROXY
  globalThis.fetch = fetchImpl
  try {
    await fn()
    console.log(`  ok   ${name}  (${Date.now() - started}ms)`)
  } catch (error) {
    failed += 1
    console.error(`  FAIL ${name}`)
    console.error(`       ${error?.message?.split('\n').join('\n       ')}`)
  }
}
globalThis.fetch = undefined

console.log(
  failed === 0
    ? `\n[selftest] ${scenarios.length} scenarios passed.`
    : `\n[selftest] ${failed}/${scenarios.length} scenarios failed.`
)
process.exit(failed === 0 ? 0 : 1)
