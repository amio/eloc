import { test as base, expect, type Page } from '@playwright/test'

export const test = base.extend({
  page: async ({ page }, use) => {
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    await use(page)
    expect(errors, 'Browser runtime errors').toEqual([])
  }
})
export { expect }

export async function revealControls(page: Page) {
  await page.locator('.toolbar-reveal').hover()
}

export const staticURL = `http://127.0.0.1:${Number(process.env.ELOC_E2E_PORT ?? 51737) + 1}`
