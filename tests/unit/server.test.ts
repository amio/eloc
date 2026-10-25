import { test, type TestContext } from 'node:test'
import assert from 'node:assert/strict'
import { mkdir, readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import type { ServerOptions } from '../../src/server.ts'
import { createPresentationServer, readJsonBody } from '../../src/server.ts'
import { assets, readConfig, workspace } from './helpers.ts'

async function start(t: TestContext, filename = 'deck.md', options: ServerOptions = {}) {
  const files = await workspace(t)
  const saves: number[] = []
  const errors: Error[] = []
  const server = createPresentationServer(filename, options, assets, {
    cwd: files.root, onSave: bytes => saves.push(bytes), onError: error => errors.push(error)
  })
  t.after(() => new Promise<void>((fulfill, reject) => {
    server.close(error => error ? reject(error) : fulfill())
    server.closeAllConnections()
  }))
  await new Promise<void>((fulfill, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', fulfill)
  })
  const address = server.address()
  assert.ok(address && typeof address !== 'string')
  const url = `http://127.0.0.1:${address.port}`
  const config = readConfig(await (await fetch(url)).text())
  const save = (body: string, token: string | undefined = config.saveToken) => fetch(`${url}/api/save`, {
    method: 'POST', headers: token ? { 'x-eloc-save-token': token } : {}, body
  })
  return { ...files, url, config, save, saves, errors }
}

test('serves configured index, Markdown, CSS, and static assets with GET/HEAD semantics', async t => {
  const app = await start(t, 'deck#100%.md', { css: '././.theme.css', title: 'Test', dark: true, 'progress-bar': true })
  await app.write('deck#100%.md', '# 中文')
  await app.write('.theme.css', 'body {}')
  await app.write('images/picture.svg', '<svg/>')
  assert.equal(app.config.source, './deck%23100%25.md')
  assert.equal(app.config.css, './.theme.css')
  assert.equal(app.config.title, 'Test')
  assert.equal(app.config.dark, true)
  assert.equal(app.config.progressBar, true)
  assert.equal(typeof app.config.saveToken, 'string')
  for (const [path, content, mime] of [
    ['/', undefined, 'text/html'],
    ['/deck%23100%25.md', '# 中文', 'text/plain'],
    ['/.theme.css', 'body {}', 'text/css'],
    ['/images/picture.svg', '<svg/>', 'image/svg+xml']
  ]) {
    const get = await fetch(app.url + path)
    assert.equal(get.status, 200)
    assert.ok(get.headers.get('content-type')?.startsWith(mime!))
    const body = await get.text()
    if (content) assert.equal(body, content)
    if (path !== '/') assert.equal(get.headers.get('cache-control'), 'no-cache')
    const head = await fetch(app.url + path, { method: 'HEAD' })
    assert.equal(head.status, 200)
    assert.equal(head.headers.get('content-length'), String(Buffer.byteLength(body)))
    assert.equal(await head.text(), '')
  }
})

test('denies hidden paths and malformed URLs while retaining explicit hidden inputs', async t => {
  const app = await start(t, '.deck.md', { css: '.theme.css' })
  await app.write('.deck.md', '# Hidden source')
  await app.write('.theme.css', 'body {}')
  await app.write('.env', 'secret')
  await app.write('.git/config', 'secret')
  for (const path of ['/.env', '/%2eenv', '/.git/config', '/%2egit%2fconfig', '/missing', '/api/save']) {
    for (const method of ['GET', 'HEAD']) assert.equal((await fetch(app.url + path, { method })).status, 404)
  }
  for (const path of ['/.deck.md', '/.theme.css']) assert.equal((await fetch(app.url + path)).status, 200)
  assert.equal((await fetch(`${app.url}/%ZZ`)).status, 400)
  for (const [method, path] of [['POST', '/'], ['PUT', '/api/save'], ['POST', '/deck.md']]) {
    assert.equal((await fetch(app.url + path, { method })).status, 404)
  }
})

test('marks only a confirmed missing source as a new document', async t => {
  const app = await start(t, 'new.md', { css: 'missing.css' })
  for (const method of ['GET', 'HEAD']) {
    const source = await fetch(`${app.url}/new.md`, { method })
    assert.equal(source.status, 404)
    assert.equal(source.headers.get('x-eloc-new-document'), 'true')
    const css = await fetch(`${app.url}/missing.css`, { method })
    assert.equal(css.status, 404)
    assert.equal(css.headers.get('x-eloc-new-document'), null)
  }
  await mkdir(join(app.root, 'new.md'))
  const failed = await fetch(`${app.url}/new.md`)
  assert.equal(failed.status, 500)
  assert.equal(failed.headers.get('x-eloc-new-document'), null)
  assert.equal(app.errors.length, 1)
})

test('creates, overwrites, and empties only the selected source using its token', async t => {
  const app = await start(t)
  await app.write('other.md', '# Other')
  for (const markdown of ['# Created 中文', '# Replaced', '']) {
    const saved = await app.save(JSON.stringify({ markdown, path: 'other.md' }))
    assert.equal(saved.status, 200)
    assert.ok((await saved.text()).includes(`(${Buffer.byteLength(markdown)} Bytes)`))
    assert.equal(await readFile(join(app.root, 'deck.md'), 'utf8'), markdown)
    assert.equal(await readFile(join(app.root, 'other.md'), 'utf8'), '# Other')
  }
  assert.deepEqual(app.saves, [Buffer.byteLength('# Created 中文'), 10, 0])
  assert.deepEqual(app.errors, [])
})

test('rejects missing, incorrect, and foreign server tokens without modifying disk', async t => {
  const app = await start(t)
  const other = await start(t)
  await app.write('deck.md', '# Original')
  assert.notEqual(app.config.saveToken, other.config.saveToken)
  for (const token of ['', 'wrong', 'x'.repeat(app.config.saveToken.length), other.config.saveToken]) {
    assert.equal((await app.save('{"markdown":"overwrite"}', token)).status, 403)
    assert.equal(await readFile(join(app.root, 'deck.md'), 'utf8'), '# Original')
  }
  assert.deepEqual(app.saves, [])
})

test('rejects malformed JSON and invalid Markdown types without modifying disk', async t => {
  const app = await start(t)
  await app.write('deck.md', '# Original')
  for (const body of ['', '{', 'null', '{}', '[]', '{"markdown":null}', '{"markdown":123}', '{"markdown":true}']) {
    const response = await app.save(body)
    assert.equal(response.status, 500)
    assert.equal(await readFile(join(app.root, 'deck.md'), 'utf8'), '# Original')
  }
  assert.deepEqual(app.saves, [])
  assert.equal(app.errors.length, 8)
})

test('reports write failures without reporting a successful save', async t => {
  const app = await start(t)
  await mkdir(join(app.root, 'deck.md'))
  const response = await app.save('{"markdown":"new"}')
  assert.equal(response.status, 500)
  assert.match(await response.text(), /EISDIR/)
  assert.deepEqual(app.saves, [])
  assert.equal(app.errors.length, 1)
})

test('reads source changes on subsequent requests without restarting', async t => {
  const app = await start(t)
  await app.write('deck.md', '# First')
  assert.equal(await (await fetch(`${app.url}/deck.md`)).text(), '# First')
  await app.write('deck.md', '# Second')
  assert.equal(await (await fetch(`${app.url}/deck.md`)).text(), '# Second')
  await rm(join(app.root, 'deck.md'))
  assert.equal((await fetch(`${app.url}/deck.md`)).headers.get('x-eloc-new-document'), 'true')
})

async function* chunks(...values: Array<Buffer | string>) {
  yield* values
}

test('parses streamed JSON across UTF-8 byte boundaries and accepts the exact byte limit', async () => {
  const body = Buffer.from('{"markdown":"中文"}')
  assert.deepEqual(await readJsonBody(chunks(body.subarray(0, 14), body.subarray(14)), body.length), { markdown: '中文' })
  assert.deepEqual(await readJsonBody(chunks('{"markdown":', '""}')), { markdown: '' })
})

test('rejects oversized, malformed, and failed streams', async () => {
  const body = Buffer.from('{"markdown":"中文"}')
  await assert.rejects(readJsonBody(chunks(body.subarray(0, 5), body.subarray(5)), body.length - 1), /Request body too large/)
  await assert.rejects(readJsonBody(chunks('{')), SyntaxError)
  async function* failed() { yield '{'; throw new Error('disconnected') }
  await assert.rejects(readJsonBody(failed()), /disconnected/)
})
