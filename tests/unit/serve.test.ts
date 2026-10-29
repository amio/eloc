import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer, type Server } from 'node:http'
import type { TestContext } from 'node:test'
import serve, { HOST, listenOnAvailablePort, resolveInitialPort } from '../../src/serve.ts'
import { assets, workspace } from './helpers.ts'

for (const [option, env, expected] of [[undefined, undefined, 5000], [undefined, '5100', 5100], [5200, 'invalid', 5200], [' 5300 ', '5100', 5300], [1, undefined, 1], ['65535', undefined, 65535]] as const) {
  test(`resolves port option=${option} env=${env}`, () => {
    assert.equal(resolveInitialPort(option, env), expected)
  })
}

for (const value of [true, false, null, '', ' ', 'abc', 0, -1, 65536, 1.5, '1.5', Infinity, NaN, [5000, 5001]]) {
  test(`rejects invalid --port ${String(value)}`, () => {
    assert.throws(() => resolveInitialPort(value), /Invalid --port/)
  })
}

test('identifies invalid PORT environment values separately', () => {
  assert.throws(() => resolveInitialPort(undefined, 'bad'), /Invalid PORT/)
})

function trackedServer(t: TestContext): Server {
  const server = createServer()
  t.after(() => new Promise<void>((fulfill, reject) => {
    if (!server.listening) return fulfill()
    server.close(error => error ? reject(error) : fulfill())
  }))
  return server
}

async function occupyPort(t: TestContext) {
  const server = trackedServer(t)
  await new Promise<void>(fulfill => server.listen(0, HOST, fulfill))
  const address = server.address()
  assert.ok(address && typeof address !== 'string')
  return address.port
}

test('binds the real HTTP server on loopback and skips occupied ports', async t => {
  const occupied = await occupyPort(t)
  const server = trackedServer(t)
  const listeningListeners = server.listenerCount('listening')
  const port = await listenOnAvailablePort(server, occupied)
  assert.ok(port > occupied)
  const address = server.address()
  assert.ok(address && typeof address !== 'string')
  assert.equal(address.port, port)
  assert.equal(address.address, HOST)
  assert.equal(server.listenerCount('error'), 0)
  assert.equal(server.listenerCount('listening'), listeningListeners)
})

test('rejects when attempts are exhausted and leaves no listener running', async t => {
  const occupied = await occupyPort(t)
  const server = trackedServer(t)
  const listeningListeners = server.listenerCount('listening')
  await assert.rejects(listenOnAvailablePort(server, occupied, 1), new RegExp(`No available ports found from ${occupied} to ${occupied}`))
  assert.equal(server.listening, false)
  assert.equal(server.listenerCount('error'), 0)
  assert.equal(server.listenerCount('listening'), listeningListeners)
})

test('propagates non-conflict listen errors without retrying', async t => {
  const server = trackedServer(t)
  const failure = Object.assign(new Error('Permission denied'), { code: 'EACCES' })
  const listeningListeners = server.listenerCount('listening')
  const listen = t.mock.method(server, 'listen', () => {
    queueMicrotask(() => server.emit('error', failure))
    return server
  })
  await assert.rejects(listenOnAvailablePort(server, 5000), failure)
  assert.equal(listen.mock.callCount(), 1)
  assert.equal(server.listenerCount('error'), 0)
  assert.equal(server.listenerCount('listening'), listeningListeners)
})

test('the serve adapter opens the bound URL and honors quiet logs', async t => {
  const { write } = await workspace(t)
  const file = await write('deck.md', '# Deck')
  const occupied = await occupyPort(t)
  const info = t.mock.method(console, 'info', () => {})
  let opened = ''
  const server = await serve(file, { port: occupied, open: true, quiet: true }, assets, async url => { opened = url })
  t.after(() => new Promise<void>(fulfill => {
    server.close(() => fulfill())
    server.closeAllConnections()
  }))
  assert.equal((await fetch(opened)).status, 200)
  assert.equal(info.mock.callCount(), 1)
  assert.ok(info.mock.calls[0].arguments[0].includes(opened))
})

test('closes the server when the browser opener fails', async t => {
  const { write } = await workspace(t)
  const file = await write('deck.md', '# Deck')
  const occupied = await occupyPort(t)
  const info = t.mock.method(console, 'info', () => {})
  let opened = ''
  await assert.rejects(serve(file, { port: occupied, open: true }, assets, async url => {
    opened = url
    throw new Error('Browser unavailable')
  }), /Browser unavailable/)
  await assert.rejects(fetch(opened))
  assert.ok(info.mock.callCount() > 1)
})
