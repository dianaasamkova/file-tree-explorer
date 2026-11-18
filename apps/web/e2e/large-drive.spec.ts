import { expect, test } from '@playwright/test'

test('10,000 items stay fast: only visible rows are rendered', async ({ page }) => {
  await page.goto('/?latency=0&dataset=large')
  await expect(page.getByRole('status')).toHaveText('10,000 items')
  const tree = page.getByRole('tree')
  await tree.focus()
  await page.keyboard.press('*')
  await page.keyboard.press('End')

  for (let step = 0; step < 5; step += 1) await tree.hover().then(() => page.mouse.wheel(0, -3000))
  expect(await page.getByRole('treeitem').count()).toBeLessThan(80)

  await page.getByRole('searchbox').fill('report 1')
  await expect(page.getByRole('status')).toContainText(/matches for “report 1” in 10,000 items/)
  await expect(page.locator('mark').first()).toBeVisible()
})
