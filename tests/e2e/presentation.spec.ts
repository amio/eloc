import { readFile, writeFile } from 'node:fs/promises'
import { test, expect, revealControls } from './test'

const TEST_DECK_PATH = 'tests/e2e/test-deck.md'

test.describe('Eloc presentation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.slide-host')).toBeVisible()
  })

  test('renders the first slide and navigates with keyboard and controls', async ({ page }) => {
    await expect(page.locator('.slide-host h2')).toHaveText('eloc')
    await page.keyboard.press('ArrowRight')
    await expect(page).toHaveURL(/#1$/)
    await expect(page.locator('.slide-host h1')).toHaveText('Slide 2')
    await page.keyboard.press('ArrowLeft')
    await expect(page).toHaveURL(/#0$/)
    await expect(page.getByRole('button', { name: 'Previous slide' })).toBeDisabled()
    await revealControls(page)
    await page.getByRole('button', { name: 'Next slide' }).click()
    await expect(page).toHaveURL(/#1$/)
    await page.locator('body').click({ position: { x: 5, y: 5 } })
    await page.keyboard.press('End')
    await expect(page).toHaveURL(/#2$/)
    await expect(page.getByRole('button', { name: 'Next slide' })).toBeDisabled()
    await page.keyboard.press('Home')
    await page.keyboard.press('Space')
    await expect(page).toHaveURL(/#1$/)
    await page.keyboard.press('Shift+Space')
    await expect(page).toHaveURL(/#0$/)
  })

  test('syncs and clamps hashes on load and external hash changes', async ({ page }) => {
    await page.goto('/#2')
    await expect(page.locator('.slide-host h1')).toHaveText('Slide 3')
    await page.evaluate(() => { location.hash = '#999' })
    await expect(page).toHaveURL(/#2$/)
    await page.evaluate(() => { location.hash = '#-1' })
    await expect(page).toHaveURL(/#0$/)
    await page.goto('/#not-a-number')
    await expect(page).toHaveURL(/#0$/)
    await expect(page.locator('.slide-host h2')).toHaveText('eloc')
  })

  test('selects the active slide in the editor and previews caret navigation', async ({ page }) => {
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('Escape')
    const editor = page.getByRole('textbox', { name: 'Markdown', exact: true })
    await expect(editor).toBeFocused()
    expect(await editor.evaluate((element: HTMLTextAreaElement) => element.value.slice(element.selectionStart, element.selectionEnd))).toBe('# Slide 2')
    await editor.fill('# Edited\n---\n# Another')
    await expect(page.locator('.slide-host h1')).toHaveText('Another')
    await expect(page).toHaveURL(/#1$/)
    await editor.press(process.platform === 'darwin' ? 'Meta+ArrowUp' : 'Control+Home')
    await expect(page).toHaveURL(/#0$/)
    await expect(page.locator('.slide-host h1')).toHaveText('Edited')
    await editor.press('ArrowRight')
    await expect(page).toHaveURL(/#0$/)
    await page.keyboard.press('Escape')
    await expect(editor).not.toBeVisible()
  })

  test('toggles dark mode, print view, and native print media', async ({ page }) => {
    await page.keyboard.press('KeyD')
    await expect(page.locator('#deck')).toHaveClass(/dark/)
    await expect(page.locator('.slide-host .slide')).toHaveCSS('filter', 'invert(1)')
    await page.keyboard.press('KeyP')
    await expect(page.locator('.print-wrap .slide-host')).toHaveCount(3)
    await expect(page.locator('.print-wrap h1')).toHaveCount(2)
    await page.keyboard.press('KeyP')
    await expect(page.locator('.slide-host')).toHaveCount(1)
    await page.emulateMedia({ media: 'print' })
    await expect(page.locator('.slide-host')).toHaveCount(3)
    await expect(page.getByRole('navigation')).not.toBeVisible()
    await page.emulateMedia({ media: 'screen' })
    await expect(page.locator('.slide-host')).toHaveCount(1)
  })

  test('handles mobile editor, orientation changes, and deliberate swipes', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await expect(page.locator('.slide-host h2')).toBeVisible()
    const column = page.locator('.slide-column')
    const swipe = async (startX: number, endX: number, endY: number) => column.evaluate((element, coordinates) => {
      const start = new Touch({ identifier: 1, target: element, clientX: coordinates.startX, clientY: 200 })
      const end = new Touch({ identifier: 1, target: element, clientX: coordinates.endX, clientY: coordinates.endY })
      element.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, touches: [start], changedTouches: [start] }))
      element.dispatchEvent(new TouchEvent('touchend', { bubbles: true, touches: [], changedTouches: [end] }))
    }, { startX, endX, endY })
    await swipe(300, 100, 210)
    await expect(page).toHaveURL(/#1$/)
    await swipe(100, 103, 201)
    await expect(page).toHaveURL(/#1$/)
    await revealControls(page)
    await page.getByRole('button', { name: 'Edit', exact: true }).click()
    await expect(page.getByRole('textbox')).toBeVisible()
    await expect(column).not.toBeVisible()
    await page.keyboard.press('Escape')
    await page.setViewportSize({ width: 844, height: 390 })
    await expect(page.locator('.slide-host h1')).toBeVisible()
    await expect(page.locator('.slide-host .content')).toHaveCSS('width', '1280px')
  })

  test('rejects save requests without a valid token', async ({ request }) => {
    const attempts: Record<string, string>[] = [{}, { 'X-Eloc-Save-Token': 'incorrect' }]
    for (const headers of attempts) {
      const response = await request.post('/api/save', { headers, data: { markdown: '# Unauthorized' } })
      expect(response.status()).toBe(403)
    }
  })

  test('saves edited Markdown and empty documents with keyboard and button', async ({ page }) => {
    const original = await readFile(TEST_DECK_PATH, 'utf8')
    try {
      await page.keyboard.press('Escape')
      const editor = page.getByRole('textbox')
      await editor.fill('# Saved content\n---\n# Slide 2')
      const saved = page.waitForResponse(response => response.url().endsWith('/api/save') && response.ok())
      await page.keyboard.press(process.platform === 'darwin' ? 'Meta+s' : 'Control+s')
      await saved
      expect(await readFile(TEST_DECK_PATH, 'utf8')).toBe('# Saved content\n---\n# Slide 2')
      await editor.fill('')
      await revealControls(page)
      await page.getByRole('button', { name: 'Save', exact: true }).click()
      await expect.poll(() => readFile(TEST_DECK_PATH, 'utf8')).toBe('')
      await expect(page.getByRole('status').filter({ hasText: 'Saved to' })).toBeVisible()
    } finally {
      await writeFile(TEST_DECK_PATH, original)
    }
  })

  test('shows save failures while retaining the edited text', async ({ page }) => {
    await page.route('**/api/save', route => route.fulfill({ status: 500, body: 'Disk unavailable' }))
    await page.keyboard.press('Escape')
    await page.getByRole('textbox').fill('# Unsaved')
    await revealControls(page)
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page.getByRole('alert')).toHaveText('Disk unavailable')
    await expect(page.getByRole('textbox')).toHaveValue('# Unsaved')
  })
})

test('reveals controls on hover and keyboard focus, then hides after pointer exit', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.slide-host')).toBeVisible()
  const toolbar = page.getByRole('navigation', { name: 'Presentation controls' })
  await expect(toolbar).toHaveCSS('opacity', '0')
  expect(await page.locator('.workspace').evaluate(element => element.getBoundingClientRect().height)).toBe(page.viewportSize()!.height)
  await page.keyboard.press('Tab')
  await expect(page.locator('.toolbar-reveal')).toBeFocused()
  await expect(toolbar).toHaveCSS('opacity', '1')
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Next slide' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/#1$/)
  await page.locator('body').click({ position: { x: 5, y: 5 } })
  await expect(toolbar).toHaveCSS('opacity', '0')
  await revealControls(page)
  await expect(toolbar).toHaveCSS('opacity', '1')
  await page.locator('.toolbar-reveal').click({ position: { x: 5, y: 5 } })
  await page.mouse.move(5, 5)
  await expect(toolbar).toHaveCSS('opacity', '0')
  await revealControls(page)
  for (const [label, key] of [['Edit', 'Esc'], ['Dark', 'D'], ['Print', 'P']]) {
    await expect(page.getByRole('button', { name: label, exact: true }).locator('kbd')).toHaveText(key)
  }
  await page.getByRole('button', { name: 'Dark', exact: true }).click()
  await expect(page.locator('#deck')).toHaveClass(/dark/)
  await page.mouse.move(5, 5)
  await expect(toolbar).toHaveCSS('opacity', '0')
})

test.describe('Touch controls', () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } })
  test('reveals with a bottom tap and dismisses when tapping the slide', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.slide-host')).toBeVisible()
    const toolbar = page.getByRole('navigation', { name: 'Presentation controls' })
    await expect(toolbar).toHaveCSS('opacity', '0')
    await page.locator('.toolbar-reveal').tap()
    await expect(toolbar).toHaveCSS('opacity', '1')
    await page.getByRole('button', { name: 'Dark', exact: true }).tap()
    await expect(page.locator('#deck')).toHaveClass(/dark/)
    await page.touchscreen.tap(5, 5)
    await expect(toolbar).toHaveCSS('opacity', '0')
  })
})
