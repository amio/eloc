import { execFile } from 'node:child_process'
import { readFile, rm, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { test, expect, staticURL, revealControls } from './test'

const exec = promisify(execFile)
const output = 'test-results/cli-build-output'
const fixture = 'tests/e2e/fixtures/build-deck.md'

async function buildDeck(extra: string[] = []) {
  const title = extra.includes('--title') ? [] : ['--title', 'E2E Build']
  await exec(process.execPath, ['dist/index.js', 'build', fixture, '--out-dir', output,
    '--include', 'assets/**', '--css', 'custom.css', ...title,
    '--dark', '--progress-bar', ...extra])
}

test.describe('Eloc CLI export', () => {
  test.beforeEach(async () => { await rm(output, { recursive: true, force: true }) })
  test.afterEach(async () => { await rm(output, { recursive: true, force: true }) })

  test('exports and runs the deck with configured assets, CSS, and flags', async ({ page }) => {
    await buildDeck()
    for (const [file, content] of [
      ['build-deck.md', '# Build deck'], ['custom.css', 'rgb(12, 34, 56)'],
      ['diagram.svg', '<circle'], ['assets/notes.txt', 'included by --include']
    ]) {
      await stat(join(output, file))
      expect(await readFile(join(output, file), 'utf8')).toContain(content)
    }
    await page.goto(`${staticURL}/${output}/index.html`)
    await expect(page).toHaveTitle('E2E Build')
    await expect(page.locator('.slide-host h1')).toHaveText('Build deck')
    await expect(page.locator('.slide-host img')).toBeVisible()
    expect(await page.locator('.slide-host img').evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0)
    await expect(page.locator('.slide-host .content')).toHaveCSS('color', 'rgb(12, 34, 56)')
    await expect(page.locator('#deck')).toHaveClass(/dark/)
    await page.keyboard.press('End')
    await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2')
    await expect(page.locator('.progress')).toHaveAttribute('style', /100%/)
    await expect(page.locator('.slide-host a')).toHaveAttribute('href', 'assets/notes.txt')
  })

  test('the exported editor downloads changes without calling a save API', async ({ page }) => {
    await buildDeck()
    const saveRequests: string[] = []
    page.on('request', request => { if (request.url().includes('/api/save')) saveRequests.push(request.url()) })
    await page.goto(`${staticURL}/${output}/index.html`)
    await expect(page.locator('.slide-host')).toBeVisible()
    await page.keyboard.press('Escape')
    await page.getByRole('textbox').fill('# Browser demo\n---\n# New slide')
    await expect(page.locator('.slide-host h1')).toHaveText('New slide')
    const downloaded = page.waitForEvent('download')
    await revealControls(page)
    await page.getByRole('button', { name: 'Download', exact: true }).click()
    const file = await downloaded
    expect(file.suggestedFilename()).toBe('build-deck.md')
    expect(await readFile((await file.path())!, 'utf8')).toBe('# Browser demo\n---\n# New slide')
    expect(saveRequests).toEqual([])
    expect(await readFile(join(output, 'build-deck.md'), 'utf8')).toContain('# Build deck')
  })

  test('escapes HTML and inline script configuration', async ({ page }) => {
    const title = '</title><script>window.injected=true</script><script>'
    await buildDeck(['--title', title])
    await page.goto(`${staticURL}/${output}/index.html`)
    await expect(page).toHaveTitle(title)
    await expect(page.locator('.slide-host h1')).toHaveText('Build deck')
    expect(await page.evaluate(() => 'injected' in window)).toBe(false)
  })

  test('rejects missing input and assets outside the deck root', async () => {
    for (const args of [
      ['build', 'missing-deck.md', '--out-dir', output],
      ['build', fixture, '--out-dir', output, '--include', '../private/**']
    ]) {
      await expect(exec(process.execPath, ['dist/index.js', ...args])).rejects.toThrow()
    }
  })
})

test('the root deck exports into a fully interactive offline-capable site', async ({ page, context }) => {
  await context.route(/https:\/\//, route => route.abort())
  await page.goto(`${staticURL}/public/index.html`)
  await expect(page).toHaveTitle('eloc — Markdown presentations')
  await expect(page.locator('.slide-host h2')).toHaveText('eloc')
  expect(await readFile('public/deck.md', 'utf8')).toBe(await readFile('deck.md', 'utf8'))
  const count = await page.getByRole('status', { name: 'Slide count' }).textContent()
  expect(Number(count?.split('/')[1])).toBeGreaterThan(5)
  // After the initial HTML and Markdown load, the renderer requires no network.
  await context.setOffline(true)
  await page.keyboard.press('ArrowRight')
  await expect(page).toHaveURL(/#1$/)
  await page.keyboard.press('Escape')
  const editor = page.getByRole('textbox')
  await editor.fill('# Offline edit\n---\n<style>.slide { background: rgb(10, 20, 30) }</style>\n# Styled')
  await page.keyboard.press('Escape')
  await page.keyboard.press('KeyP')
  await expect(page.locator('.slide-host')).toHaveCount(2)
  await expect(page.locator('.slide-host').nth(0).locator('.slide')).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  await expect(page.locator('.slide-host').nth(1).locator('.slide')).toHaveCSS('background-color', 'rgb(10, 20, 30)')
  await page.keyboard.press('KeyP')
  await page.keyboard.press('Escape')
  await editor.fill('# Code\n```md\n---\n```\n---\n```javascript\nconst answer = 42;\n```')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('status', { name: 'Slide count' })).toHaveText('2 / 2')
  await expect(page.locator('.slide-host .token.keyword')).toHaveText('const')
  await context.setOffline(false)
})
