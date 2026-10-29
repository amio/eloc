import { test, expect } from '@playwright/test'

const site = `http://127.0.0.1:${Number(process.env.ELOC_E2E_PORT ?? 51737) + 1}`

test('new presentations are saved locally and can be reopened', async ({ page }) => {
  await page.goto(`${site}/`)
  await expect(page.getByRole('heading', { name: /Ideas deserve/ })).toBeVisible()
  await expect(page.getByLabel('Demo presentation')).toBeVisible()
  await page.getByRole('link', { name: /Create a presentation/ }).click()
  await expect(page).toHaveURL(/\/new#0$/)
  await page.locator('textarea').fill('# First\n\n---\n\n# Second')
  await page.keyboard.press('ControlOrMeta+s')
  await expect(page).toHaveURL(/\/local\/[0-9a-f-]{36}\/#\d+$/)
  const url = page.url()
  await expect(page.getByText('Saved in this browser')).toBeVisible()
  await page.reload()
  await page.keyboard.press('Escape')
  await expect(page.locator('textarea')).toHaveValue('# First\n\n---\n\n# Second')
  await page.locator('textarea').fill('# Changed')
  await page.keyboard.press('ControlOrMeta+s')
  await expect(page).toHaveURL(new RegExp(new URL(url).pathname))
  await page.reload()
  await page.keyboard.press('Escape')
  await expect(page.locator('textarea')).toHaveValue('# Changed')
})

test('missing local presentations never create a blank document', async ({ page }) => {
  await page.goto(`${site}/local/11111111-1111-4111-8111-111111111111/#0`)
  await expect(page.getByText('This presentation is not saved in this browser.')).toBeVisible()
  expect(await page.evaluate(() => localStorage.length)).toBe(0)
})

test('failed local save keeps the new URL and draft', async ({ page }) => {
  await page.goto(`${site}/new`)
  await page.locator('textarea').fill('# Unsaved')
  await page.evaluate(() => { Storage.prototype.setItem = () => { throw new Error('Storage unavailable') } })
  await page.keyboard.press('ControlOrMeta+s')
  await expect(page.getByRole('alert')).toContainText('Storage unavailable')
  await expect(page).toHaveURL(/\/new#0$/)
  await expect(page.locator('textarea')).toHaveValue('# Unsaved')
})
