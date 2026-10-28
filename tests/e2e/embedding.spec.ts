import { createServer } from 'node:http'
import { test as base, expect, staticURL } from './test'

const markdown = '# First\n---\n# Second'
const saveShortcut = process.platform === 'darwin' ? 'Meta+s' : 'Control+s'

// Real cross-origin HTTP responses exercise browser CORS and redirect behavior;
// route fulfillment is intentionally reserved for non-network persistence tests.
const test = base.extend<{ source: { url: string; fetched: Set<string> } }>({
  source: async ({}, use) => {
    const fetched = new Set<string>()
    const server = createServer((req, res) => {
      const pathname = new URL(req.url!, 'http://source').pathname
      fetched.add(pathname)
      res.setHeader('Connection', 'close')
      if (pathname !== '/blocked.md') res.setHeader('Access-Control-Allow-Origin', '*')
      if (pathname === '/start.md') {
        res.writeHead(302, { Location: '/talk/actual.md' }).end()
      } else if (pathname === '/talk/actual.md') {
        res.setHeader('Content-Type', 'text/markdown')
        res.end(`
<style>.slide { background-image: url(./background.svg) } .content { color: rgb(12, 34, 56) }</style>
# Remote
![Cover](./cover.svg)
<a href="#target">Jump</a><span id="target">Target</span>
<a href="#1">Next</a>
<script>window.injected = true</script>
<img src="./cover.svg" onload="window.injected = true">
<a href="javascript:window.injected=true">Unsafe</a>
<base href="https://evil.example/">
<form action="https://evil.example/"><input name="secret"></form>
<iframe srcdoc="<script>parent.injected=true</script>"></iframe>
---
# Second
`)
      } else if (['/talk/cover.svg', '/talk/background.svg'].includes(pathname)) {
        res.setHeader('Content-Type', 'image/svg+xml')
        res.end('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" fill="red"/></svg>')
      } else if (pathname === '/blocked.md') res.end(markdown)
      else res.writeHead(404).end()
    })
    await new Promise<void>((fulfill, reject) => {
      server.once('error', reject)
      server.listen(0, '127.0.0.1', fulfill)
    })
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('Expected a TCP source server')
    try {
      await use({ url: `http://127.0.0.1:${address.port}`, fetched })
    } finally {
      await new Promise<void>((fulfill, reject) => {
        server.close(error => error ? reject(error) : fulfill())
        server.closeAllConnections()
      })
    }
  }
})

test('two editable embeds keep focus, state, shortcuts, and persistence inside their own frames', async ({ page, baseURL }) => {
  const saves: string[] = []
  const downloads: string[] = []
  page.on('request', request => { if (request.url().includes('/api/save')) saves.push(request.url()) })
  page.on('download', download => downloads.push(download.suggestedFilename()))
  await page.route('**/embed-source.md', route => route.fulfill({ contentType: 'text/markdown', body: markdown }))
  await page.setContent('<input aria-label="Host input"><div id="embeds"></div>')
  const hostInput = page.getByRole('textbox', { name: 'Host input' })
  await hostInput.focus()
  const hostURL = page.url()
  const url = new URL('/embed.html', baseURL)
  url.searchParams.set('src', './embed-source.md')
  await page.evaluate(src => {
    for (const id of ['first', 'second']) {
      const frame = document.createElement('iframe')
      frame.id = id
      frame.src = src
      frame.style.cssText = 'width:600px;height:480px;border:0'
      document.getElementById('embeds')!.append(frame)
    }
  }, url.href)
  const first = page.frameLocator('#first')
  const second = page.frameLocator('#second')
  for (const frame of [first, second]) {
    await expect(frame.getByRole('textbox', { name: 'Markdown', exact: true })).toHaveValue(markdown)
    await expect(frame.locator('.slide-host h1')).toHaveText('First')
    await expect(frame.locator('.slide-column')).toBeVisible()
    await expect(frame.getByRole('button', { name: /^(Save|Download|Saving…)/ })).toHaveCount(0)
  }
  await expect(hostInput).toBeFocused()
  await hostInput.pressSequentially('d p ')
  await expect(first.locator('#deck')).not.toHaveClass(/dark/)
  await expect(second.locator('#deck')).not.toHaveClass(/dark/)
  const editor = first.getByRole('textbox', { name: 'Markdown', exact: true })
  await editor.fill('# Temporary draft')
  await expect(first.locator('.slide-host h1')).toHaveText('Temporary draft')
  await expect(second.locator('.slide-host h1')).toHaveText('First')
  await editor.press(saveShortcut)
  await editor.press('Escape')
  await expect(editor).toHaveCount(0)
  await second.getByRole('textbox', { name: 'Markdown', exact: true }).press('Escape')
  await second.locator('.toolbar-reveal').hover()
  await second.getByRole('button', { name: 'Next slide' }).click()
  await expect(second.locator('.slide-host h1')).toHaveText('Second')
  await expect(first.locator('.slide-host h1')).toHaveText('Temporary draft')
  expect(page.url()).toBe(hostURL)
  expect(saves).toEqual([])
  expect(downloads).toEqual([])
})

test('save handlers receive one snapshot while pending and preserve newer edits after failure and retry', async ({ page }) => {
  const requests: Array<{ markdown: string }> = []
  let finish!: () => void
  const pending = new Promise<void>(fulfill => { finish = fulfill })
  await page.route('**/test-deck.md', route => route.fulfill({ contentType: 'text/markdown', body: markdown }))
  await page.route('**/api/save', async route => {
    requests.push(route.request().postDataJSON())
    if (requests.length === 1) {
      await pending
      await route.fulfill({ status: 500, body: 'Save rejected by host' })
    } else await route.fulfill({ body: 'Saved to application' })
  })
  try {
    await page.goto('/')
    await expect(page.locator('.slide-host h1')).toHaveText('First')
    await page.keyboard.press('Escape')
    const editor = page.getByRole('textbox', { name: 'Markdown', exact: true })
    await editor.fill('# Snapshot A')
    await editor.press(saveShortcut)
    await expect.poll(() => requests).toEqual([{ markdown: '# Snapshot A' }])
    await expect(page.getByRole('button', { name: 'Saving…', exact: true })).toBeDisabled()
    await editor.fill('# Newer B')
    await editor.press(saveShortcut)
    expect(requests).toHaveLength(1)
    finish()
    await expect(page.getByRole('alert')).toHaveText('Save rejected by host')
    await expect(editor).toHaveValue('# Newer B')
    await expect(page.locator('.slide-host h1')).toHaveText('Newer B')
    await page.locator('.toolbar-reveal').hover()
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expect.poll(() => requests).toEqual([{ markdown: '# Snapshot A' }, { markdown: '# Newer B' }])
    await expect(page.getByRole('status').filter({ hasText: 'Saved to application' })).toBeVisible()
    await expect(editor).toHaveValue('# Newer B')
  } finally {
    finish()
  }
})

test('remote embeds use the final source base for images, raw CSS, and fragments while sanitizing HTML', async ({ page, source }) => {
  const { fetched } = source
  const params = new URLSearchParams({ src: `${source.url}/start.md?version=1&part=2` })
  await page.goto(`/embed.html?${params}`)
  await expect(page.locator('.slide-host h1')).toHaveText('Remote')
  await expect(page.locator('.slide-host .content')).toHaveCSS('color', 'rgb(12, 34, 56)')
  await expect.poll(() => page.locator('.slide-host img').first().evaluate((image: HTMLImageElement) => image.naturalWidth)).toBe(32)
  await expect.poll(() => fetched.has('/talk/background.svg')).toBe(true)
  expect(fetched.has('/cover.svg')).toBe(false)
  expect(fetched.has('/background.svg')).toBe(false)
  expect(await page.evaluate(() => document.baseURI)).toBe(`${source.url}/talk/actual.md`)
  expect(await page.evaluate(() => 'injected' in window)).toBe(false)
  await expect(page.locator('.slide-host script, .slide-host iframe, .slide-host form, .slide-host base, .slide-host img[onload]')).toHaveCount(0)
  const unsafeLink = page.locator('.slide-host a').filter({ hasText: 'Unsafe' })
  await expect(unsafeLink).toHaveCount(1)
  expect(await unsafeLink.getAttribute('href')).toBeNull()
  await page.getByRole('link', { name: 'Jump', exact: true }).click()
  await expect(page).toHaveURL(/\/embed\.html\?/)
  await page.getByRole('link', { name: 'Next', exact: true }).click()
  await expect(page.locator('.slide-host h1')).toHaveText('Second')
  await expect(page).toHaveURL(/#1$/)
})

test('missing, malformed, and CORS-blocked sources remain editable without granting saving', async ({ page, source }) => {
  for (const src of ['', 'http://[', './missing-embed-source.md', `${source.url}/blocked.md`]) {
    const params = new URLSearchParams({ src, mode: 'standalone', saveToken: 'attacker' })
    await page.goto(`/embed.html?${params}`)
    await expect(page.getByRole('alert')).toBeVisible()
    const editor = page.getByRole('textbox', { name: 'Markdown', exact: true })
    await editor.fill('# Temporary recovery')
    await expect(page.locator('.slide-host h1')).toHaveText('Temporary recovery')
    await expect(page.getByRole('button', { name: /^(Save|Download|Saving…)/ })).toHaveCount(0)
  }
})

test('static exports include a self-contained embed with initial presentation and theme settings', async ({ page, context }) => {
  await context.route(/https:\/\//, route => route.abort())
  await page.goto(`${staticURL}/public/embed.html?src=./deck.md&view=present&theme=dark`)
  await expect(page.locator('.slide-host h2')).toHaveText('eloc')
  await expect(page.locator('#deck')).toHaveClass(/dark/)
  await expect(page.getByRole('textbox', { name: 'Markdown', exact: true })).toHaveCount(0)
  await context.setOffline(true)
  await page.keyboard.press('Escape')
  await page.getByRole('textbox', { name: 'Markdown', exact: true }).fill('# Offline embed')
  await expect(page.locator('.slide-host h1')).toHaveText('Offline embed')
  await expect(page.getByRole('button', { name: /^(Save|Download|Saving…)/ })).toHaveCount(0)
  await context.setOffline(false)
})
