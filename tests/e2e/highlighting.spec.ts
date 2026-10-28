import { test, expect } from './test'

const source = '# Heading\n\n**Bold** and `code`'

test.beforeEach(async ({ page }) => {
  await page.route(url => url.pathname === '/highlight-source.md', route => route.fulfill({ contentType: 'text/markdown', body: source }))
})

test('native source highlights follow edits and theme changes and are released with the editor', async ({ page }) => {
  await page.goto('/embed.html?src=./highlight-source.md')
  const editor = page.getByRole('textbox', { name: 'Markdown', exact: true })
  await expect(editor).toHaveValue(source)
  const supported = await editor.evaluate(element => typeof Reflect.get(element, 'createValueRange') === 'function')
  test.skip(!supported, 'Native textarea highlights require createValueRange; run with ELOC_E2E_CHANNEL=chrome on a supported Chrome version')

  const count = (name: string) => page.evaluate(name => CSS.highlights.get(`md-ink-${name}`)?.size ?? 0, name)
  for (const kind of ['heading', 'strong', 'code']) await expect.poll(() => count(kind)).toBe(1)
  await page.evaluate(() => CSS.highlights.set('third-party', new Highlight()))

  const updated = '# 中文 😀\n\n**Updated** with `inline code`'
  await editor.evaluate((element: HTMLTextAreaElement, value) => {
    element.value = value
    element.setSelectionRange(2, 7, 'backward')
    element.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertCompositionText', isComposing: true }))
  }, updated)
  await expect(page.locator('.slide-host h1')).toHaveText('中文 😀')
  expect(await editor.evaluate((element: HTMLTextAreaElement) => [element.selectionStart, element.selectionEnd, element.selectionDirection])).toEqual([2, 7, 'backward'])
  expect(await page.evaluate(() => [...CSS.highlights.get('md-ink-heading')!].map(range => [range.startOffset, range.endOffset]))).toEqual([[0, '# 中文 😀'.length]])
  for (const kind of ['heading', 'strong', 'code']) expect(await count(kind)).toBe(1)

  const color = () => editor.evaluate(element => getComputedStyle(element, '::highlight(md-ink-heading)').color)
  const light = await color()
  await page.locator('.toolbar-reveal').hover()
  await page.getByRole('button', { name: 'Dark', exact: true }).click()
  await expect.poll(color).not.toBe(light)
  await expect(editor).toHaveValue(updated)

  await page.keyboard.press('Escape')
  await expect(editor).toHaveCount(0)
  expect(await page.evaluate(() => [...CSS.highlights.keys()].filter(name => name.startsWith('md-ink-')))).toEqual([])
  expect(await page.evaluate(() => CSS.highlights.has('third-party'))).toBe(true)

  await page.keyboard.press('Escape')
  await expect(editor).toHaveValue(updated)
  for (const kind of ['heading', 'strong', 'code']) await expect.poll(() => count(kind)).toBe(1)
  await page.emulateMedia({ media: 'print' })
  await expect(page.locator('textarea.editor')).toHaveCount(0)
  expect(await page.evaluate(() => [...CSS.highlights.keys()].filter(name => name.startsWith('md-ink-')))).toEqual([])
  await page.emulateMedia({ media: 'screen' })
  await expect(editor).toHaveValue(updated)
  await expect.poll(() => count('heading')).toBe(1)
})

test('unsupported textarea highlighting preserves editing, preview, selection, and embed persistence boundaries', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(HTMLTextAreaElement.prototype, 'createValueRange', { configurable: true, value: undefined })
  })
  await page.goto('/embed.html?src=./highlight-source.md')
  const editor = page.getByRole('textbox', { name: 'Markdown', exact: true })
  await expect(editor).toHaveValue(source)
  await editor.fill('# Plain editor\n---\n# Second slide')
  await expect(page.locator('.slide-host h1')).toHaveText('Second slide')
  await editor.press(process.platform === 'darwin' ? 'Meta+ArrowUp' : 'Control+Home')
  await expect(page.locator('.slide-host h1')).toHaveText('Plain editor')
  await expect(editor).toBeFocused()
  expect(await page.evaluate(() => [...(CSS.highlights?.keys() ?? [])].filter(name => name.startsWith('md-ink-')))).toEqual([])
  await expect(page.getByRole('button', { name: /^(Save|Download|Saving…)/ })).toHaveCount(0)
})
