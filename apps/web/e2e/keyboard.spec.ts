import { expect, test } from '@playwright/test'
import { activeItem, item } from './helpers'

test('keyboard only: skip to the tree, browse, cut and paste', async ({ page }) => {
  await page.goto('/?latency=0')
  await expect(item(page, 'Clients')).toBeVisible()

  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Skip to files' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('tree')).toBeFocused()

  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowRight')
  expect(await activeItem(page)).toBe('Acme Corp')
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowDown')
  expect(await activeItem(page)).toMatch(/^Brand guidelines\.pdf/)
  await page.keyboard.press('Enter')
  await expect(page.getByRole('complementary', { name: 'Details' })).toContainText('PDF document')

  await page.keyboard.press('ControlOrMeta+x')
  await expect(page.getByText(/is ready to move/)).toBeVisible()
  await page.keyboard.press('d')
  expect(await activeItem(page)).toBe('Drafts')
  await page.keyboard.press('ControlOrMeta+v')
  await expect(page.getByText('Moved “Brand guidelines.pdf” to Drafts')).toBeVisible()
  await expect(item(page, 'Brand guidelines.pdf')).toHaveAttribute('aria-level', '2')
  await expect(page).toHaveURL(/file=clients%2Facme-corp%2Fbrand-guidelines-pdf/)
})
