# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: presentation.spec.ts >> Eloc Presentation >> should navigate between slides using keyboard
- Location: tests/e2e/presentation.spec.ts:25:7

# Error details

```
Test timeout of 30000ms exceeded while running "beforeEach" hook.
```

```
Error: page.goto: Test timeout of 30000ms exceeded.
Call log:
  - navigating to "http://127.0.0.1:51737/", waiting until "load"

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - main [ref=e3]:
    - heading "eloc" [level=2] [ref=e7]
  - generic:
    - generic:
      - generic:
        - generic:
          - heading "eloc" [level=2]
      - generic:
        - generic:
          - heading "Slide 2" [level=1]
      - generic:
        - generic:
          - heading "Slide 3" [level=1]
```

# Test source

```ts
  1  | /// <reference types="node" />
  2  | import { readFile, writeFile } from 'node:fs/promises';
  3  | import { test, expect } from '@playwright/test';
  4  | 
  5  | const TEST_DECK_PATH = 'tests/e2e/test-deck.md';
  6  | 
  7  | test.describe('Eloc Presentation', () => {
  8  |   test.describe.configure({ mode: 'serial' });
  9  |   test.beforeEach(async ({ page }) => {
> 10 |     await page.goto('/');
     |                ^ Error: page.goto: Test timeout of 30000ms exceeded.
  11 |     await page.waitForSelector('markdown-deck');
  12 |   });
  13 | 
  14 |   test('should display the first slide', async ({ page }) => {
  15 |     const deck = page.locator('markdown-deck');
  16 |     await expect(deck).toBeVisible();
  17 |     // Check if the first slide content is present
  18 |     // The test deck starts with ## eloc
  19 |     const heading = page.locator('markdown-deck').locator('#deck h2:has-text("eloc")');
  20 |     // Note: markdown-deck renders into shadow DOM, so we might need to pierce it
  21 |     // Playwright locator pierces shadow DOM by default.
  22 |     await expect(heading).toBeVisible();
  23 |   });
  24 | 
  25 |   test('should navigate between slides using keyboard', async ({ page }) => {
  26 |     await page.keyboard.press('ArrowRight');
  27 |     await expect(page).toHaveURL(/.*#1/);
  28 | 
  29 |     await page.keyboard.press('ArrowLeft');
  30 |     await expect(page).toHaveURL(/.*#0/);
  31 |   });
  32 | 
  33 |   test('should toggle editor using ESC', async ({ page }) => {
  34 |     await page.keyboard.press('Escape');
  35 |     const editor = page.locator('markdown-deck textarea.editor');
  36 |     await expect(editor).toBeVisible();
  37 | 
  38 |     await page.keyboard.press('Escape');
  39 |     await expect(editor).not.toBeVisible();
  40 |   });
  41 | 
  42 |   test('should sync with location hash', async ({ page }) => {
  43 |     await page.goto('/#2');
  44 |     await expect(page).toHaveURL(/.*#2/);
  45 |     // The index property of markdown-deck should be 2
  46 |     const deck = page.locator('markdown-deck');
  47 |     await expect(deck).toHaveJSProperty('index', 2);
  48 |   });
  49 | 
  50 |   test('should save changes using CTRL+S', async ({ page }) => {
  51 |     const originalDeck = await readFile(TEST_DECK_PATH, 'utf8');
  52 | 
  53 |     try {
  54 |       await page.keyboard.press('Escape'); // Open editor
  55 |       const editor = page.locator('markdown-deck textarea.editor');
  56 |       await editor.fill('# New Content\n---\n# Slide 2');
  57 | 
  58 |       // Intercept the save request
  59 |       const savePromise = page.waitForResponse(response =>
  60 |         response.url().includes('/api/save') && response.status() === 200
  61 |       );
  62 | 
  63 |       if (process.platform === 'darwin') {
  64 |         await page.keyboard.press('Meta+s');
  65 |       } else {
  66 |         await page.keyboard.press('Control+s');
  67 |       }
  68 | 
  69 |       const response = await savePromise;
  70 |       expect(response.ok()).toBe(true);
  71 |     } finally {
  72 |       await writeFile(TEST_DECK_PATH, originalDeck);
  73 |     }
  74 |   });
  75 | });
  76 | 
```