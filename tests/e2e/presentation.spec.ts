/// <reference types="node" />
import { readFile, writeFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';

const TEST_DECK_PATH = 'tests/e2e/test-deck.md';

test.describe('Eloc Presentation', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      (window as Window & { mddSkipLoadingFont?: boolean }).mddSkipLoadingFont = true;
    });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('markdown-deck');
  });

  test('should display the first slide', async ({ page }) => {
    const deck = page.locator('markdown-deck');
    await expect(deck).toBeVisible();
    // Check if the first slide content is present
    // The test deck starts with ## eloc
    const heading = page.locator('markdown-deck').locator('#deck h2:has-text("eloc")');
    // Note: markdown-deck renders into shadow DOM, so we might need to pierce it
    // Playwright locator pierces shadow DOM by default.
    await expect(heading).toBeVisible();
  });

  test('should navigate between slides using keyboard', async ({ page }) => {
    await page.keyboard.press('ArrowRight');
    await expect(page).toHaveURL(/.*#1/);

    await page.keyboard.press('ArrowLeft');
    await expect(page).toHaveURL(/.*#0/);
  });

  test('should toggle editor using ESC', async ({ page }) => {
    await page.keyboard.press('Escape');
    const editor = page.locator('markdown-deck textarea.editor');
    await expect(editor).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(editor).not.toBeVisible();
  });

  test('should sync with location hash', async ({ page }) => {
    await page.goto('/#2');
    await expect(page).toHaveURL(/.*#2/);
    // The index property of markdown-deck should be 2
    const deck = page.locator('markdown-deck');
    await expect(deck).toHaveJSProperty('index', 2);
  });

  test('should save changes using CTRL+S', async ({ page }) => {
    const originalDeck = await readFile(TEST_DECK_PATH, 'utf8');

    try {
      await page.keyboard.press('Escape'); // Open editor
      const editor = page.locator('markdown-deck textarea.editor');
      await editor.fill('# New Content\n---\n# Slide 2');

      // Intercept the save request
      const savePromise = page.waitForResponse(response =>
        response.url().includes('/api/save') && response.status() === 200
      );

      if (process.platform === 'darwin') {
        await page.keyboard.press('Meta+s');
      } else {
        await page.keyboard.press('Control+s');
      }

      const response = await savePromise;
      expect(response.ok()).toBe(true);
    } finally {
      await writeFile(TEST_DECK_PATH, originalDeck);
    }
  });
});
