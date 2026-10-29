import { execFile, spawn, type ChildProcess } from 'node:child_process'
import { once } from 'node:events'
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { promisify } from 'node:util'
import { test as base, expect, revealControls } from './test'

const exec = promisify(execFile)
const cli = resolve('dist/index.js')
const saveShortcut = process.platform === 'darwin' ? 'Meta+s' : 'Control+s'
const original = '# Document A'

const test = base.extend<{
  workspace: { root: string; start: (filename?: string, options?: string[]) => Promise<string> }
}>({
  workspace: async ({}, use, worker) => {
    const root = await mkdtemp(join(tmpdir(), 'eloc-boundaries-'))
    const children: ChildProcess[] = []
    try {
      await writeFile(join(root, 'a.md'), original)
      await writeFile(join(root, 'b.md'), '# Document B')
      const start = async (filename = 'a.md', options: string[] = []) => {
        const child = spawn(process.execPath, [cli, filename, '--port', String(51837 + worker.parallelIndex * 100), ...options], {
          cwd: root, stdio: ['ignore', 'pipe', 'pipe']
        })
        children.push(child)
        return new Promise<string>((fulfill, reject) => {
          let output = ''
          const timer = setTimeout(() => reject(new Error(`CLI startup timed out: ${output}`)), 10000)
          child.stdout!.on('data', chunk => {
            output += chunk
            const url = output.match(/http:\/\/127\.0\.0\.1:\d+/)?.[0]
            if (url) { clearTimeout(timer); fulfill(url) }
          })
          child.stderr!.on('data', chunk => { output += chunk })
          child.once('error', error => { clearTimeout(timer); reject(error) })
          child.once('exit', code => { clearTimeout(timer); reject(new Error(`CLI exited (${code}): ${output}`)) })
        })
      }
      await use({ root, start })
    } finally {
      await Promise.all(children.map(async child => {
        if (child.exitCode !== null || child.signalCode !== null) return
        const exited = once(child, 'exit')
        child.kill('SIGTERM')
        await exited
      }))
      await rm(root, { recursive: true, force: true })
    }
  }
})

test('source overrides download the displayed document without overwriting the CLI document', async ({ page, workspace }) => {
  const url = await workspace.start()
  const saves: string[] = []
  page.on('request', request => { if (request.url().endsWith('/api/save')) saves.push(request.url()) })
  await page.goto(`${url}/?src=b.md`)
  await expect(page.locator('.slide-host h1')).toHaveText('Document B')
  await page.keyboard.press('Escape')
  await page.getByRole('textbox').fill('# Edited B')
  await revealControls(page)
  await expect(page.getByRole('button', { name: 'Download', exact: true })).toBeVisible()
  const downloaded = page.waitForEvent('download')
  await page.keyboard.press(saveShortcut)
  const file = await downloaded
  expect(file.suggestedFilename()).toBe('b.md')
  expect(await readFile((await file.path())!, 'utf8')).toBe('# Edited B')
  expect(saves).toEqual([])
  expect(await readFile(join(workspace.root, 'a.md'), 'utf8')).toBe(original)
  expect(await readFile(join(workspace.root, 'b.md'), 'utf8')).toBe('# Document B')

  await page.goto(`${url}/?src=./a.md`)
  await expect(page.locator('.slide-host h1')).toHaveText('Document A')
  await page.keyboard.press('Escape')
  await page.getByRole('textbox').fill('# Canonical A')
  const saved = page.waitForResponse(response => response.url().endsWith('/api/save'))
  await page.keyboard.press(saveShortcut)
  await saved
  expect(await readFile(join(workspace.root, 'a.md'), 'utf8')).toBe('# Canonical A')
})

test('failed reads allow recovery downloads without granting disk-write permission', async ({ page, workspace }) => {
  const url = await workspace.start()
  const saves: string[] = []
  page.on('request', request => { if (request.url().endsWith('/api/save')) saves.push(request.url()) })
  for (const status of [403, 404, 503]) {
    await page.route(`${url}/a.md`, route => route.fulfill({ status, body: 'Read unavailable' }))
    await page.goto(url)
    await expect(page.getByRole('alert')).toContainText(`(${status})`)
    await page.keyboard.press('Escape')
    await page.getByRole('textbox').fill('# Recovery')
    await revealControls(page)
    await expect(page.getByRole('button', { name: 'Download', exact: true })).toBeVisible()
    const downloaded = page.waitForEvent('download')
    await page.keyboard.press(saveShortcut)
    expect(await readFile((await (await downloaded).path())!, 'utf8')).toBe('# Recovery')
    expect(await readFile(join(workspace.root, 'a.md'), 'utf8')).toBe(original)
    await page.unroute(`${url}/a.md`)
  }
  expect(saves).toEqual([])
})

test('a server-confirmed missing document can be created and reloaded with a literal filename', async ({ page, workspace }) => {
  const filename = 'new#100%23.md'
  const url = await workspace.start(filename)
  await page.goto(url)
  await expect(page.locator('.slide-host')).toBeVisible()
  await expect(page.getByRole('alert')).toHaveCount(0)
  await page.keyboard.press('Escape')
  await page.getByRole('textbox').fill('# Created')
  await revealControls(page)
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect.poll(() => readFile(join(workspace.root, filename), 'utf8')).toBe('# Created')
  await page.reload()
  await expect(page.locator('.slide-host h1')).toHaveText('Created')
})

test('malformed source URLs show a recoverable editor', async ({ page, workspace }) => {
  const url = await workspace.start()
  await page.goto(`${url}/?src=${encodeURIComponent('http://[')}`)
  await expect(page.getByRole('alert')).toContainText('Unable to load')
  await page.keyboard.press('Escape')
  await page.getByRole('textbox').fill('# Recovery')
  await revealControls(page)
  await expect(page.getByRole('button', { name: 'Download', exact: true })).toBeVisible()
  expect(await readFile(join(workspace.root, 'a.md'), 'utf8')).toBe(original)
})

test('unselected hidden paths are denied, including encoded names and nested directories', async ({ request, workspace }) => {
  await writeFile(join(workspace.root, '.env'), 'REVIEW_FIXTURE=private')
  await writeFile(join(workspace.root, '.theme.css'), '.content { color: green }')
  await mkdir(join(workspace.root, '.git'))
  await writeFile(join(workspace.root, '.git', 'config'), 'private config')
  const url = await workspace.start('a.md', ['--css', '././.theme.css'])
  for (const path of ['/.env', '/%2eenv', '/.git/config', '/%2egit%2fconfig']) {
    for (const method of ['GET', 'HEAD']) {
      expect((await request.fetch(url + path, { method })).status()).toBe(404)
    }
  }
  expect((await request.get(`${url}/a.md`)).status()).toBe(200)
  expect((await request.get(`${url}/.theme.css`)).status()).toBe(200)
  expect((await request.get(`${url}/%ZZ`)).status()).toBe(400)
})

test('slide controls retain keyboard input inside shadow roots', async ({ page, workspace }) => {
  await writeFile(join(workspace.root, 'a.md'), '<input aria-label="Slide input">\n<div contenteditable="true" role="textbox" aria-label="Slide editor">Editable</div>\n---\n# Second')
  const url = await workspace.start()
  await page.goto(url)
  const input = page.getByRole('textbox', { name: 'Slide input' })
  await input.fill('')
  await input.pressSequentially('d lj ')
  await input.press('ArrowLeft')
  await input.press('ArrowRight')
  await expect(input).toHaveValue('d lj ')
  await expect(page).toHaveURL(/#0$/)
  await expect(page.locator('#deck')).not.toHaveClass(/dark/)
  const editor = page.getByRole('textbox', { name: 'Slide editor' })
  await editor.fill('p')
  await editor.press('Space')
  await expect(page.locator('.slide-host')).toHaveCount(1)
  await expect(page).toHaveURL(/#0$/)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('textbox', { name: 'Markdown', exact: true })).toBeFocused()
})

test('external CSS keeps its base URL and isolation in presentation, editor, and print views', async ({ page, workspace }) => {
  await mkdir(join(workspace.root, 'styles'))
  await writeFile(join(workspace.root, 'styles', 'theme#100%.css'), '@import "./palette.css"; .slide { background-image: url(./asset.svg) }')
  await writeFile(join(workspace.root, 'styles', 'palette.css'), '.content { color: rgb(12, 34, 56) } textarea { background: black }')
  await writeFile(join(workspace.root, 'styles', 'asset.svg'), '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"/>')
  await writeFile(join(workspace.root, 'a.md'), '# First\n---\n# Second')
  const url = await workspace.start('a.md', ['--css', 'styles/./theme#100%.css'])
  const asset = page.waitForResponse(`${url}/styles/asset.svg`)
  await page.goto(url)
  expect((await asset).status()).toBe(200)
  await expect(page.locator('.slide-host .content')).toHaveCSS('color', 'rgb(12, 34, 56)')
  await expect(page.locator('.slide-host .slide')).toHaveCSS('background-image', `url("${url}/styles/asset.svg")`)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('textbox', { name: 'Markdown', exact: true })).toHaveCSS('background-color', 'rgb(247, 247, 247)')
  await page.keyboard.press('Escape')
  await page.keyboard.press('KeyP')
  await expect(page.locator('.slide-host')).toHaveCount(2)
  for (const slide of await page.locator('.slide-host .content').all()) {
    await expect(slide).toHaveCSS('color', 'rgb(12, 34, 56)')
  }
  await expect(page.getByRole('alert')).toHaveCount(0)
})

test('exports required literal files and honors absolute output paths', async ({ page, workspace }) => {
  const css = '!theme#100%23.css'
  await writeFile(join(workspace.root, css), '.content { color: rgb(12, 34, 56) }')
  for (const filename of ['!private.md', 'deck#100%23.md', 'deck*.md']) {
    const output = join(workspace.root, `export-${filename}`)
    await writeFile(join(workspace.root, filename), '# Literal deck')
    await exec(process.execPath, [cli, 'build', filename, '--css', css, '--include', '!*.md', '--out-dir', output], { cwd: workspace.root })
    expect(await readFile(join(output, filename), 'utf8')).toBe('# Literal deck')
    expect(await readFile(join(output, css), 'utf8')).toContain('rgb(12, 34, 56)')
    await expect(access(join(output, 'a.md'))).rejects.toThrow()
    const url = await workspace.start(join(output, filename), ['--css', css])
    await page.goto(`${url}/index.html`)
    await expect(page.locator('.slide-host h1')).toHaveText('Literal deck')
    await expect(page.locator('.slide-host .content')).toHaveCSS('color', 'rgb(12, 34, 56)')
    await page.keyboard.press('Escape')
    const downloaded = page.waitForEvent('download')
    await page.keyboard.press(saveShortcut)
    expect((await downloaded).suggestedFilename()).toBe(filename.replace(/\*/g, '_'))
  }
})
