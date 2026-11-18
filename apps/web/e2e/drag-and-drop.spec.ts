import { expect, test } from '@playwright/test'
import { item } from './helpers'

test('drag and drop, with rollback when the server refuses', async ({ page }) => {
  await page.goto('/?latency=300')
  await item(page, 'Welcome.md').dragTo(item(page, 'Drafts'))
  await expect(page.getByText('Moved “Welcome.md” to Drafts')).toBeVisible()
  await expect(item(page, 'Welcome.md')).toHaveAttribute('aria-level', '2')

  await item(page, 'Team').dragTo(item(page, 'Archive'))
  // Optimistic: moved before the server answers…
  await expect(item(page, 'Team')).toHaveAttribute('aria-level', '2')
  // …then rolled back with an explanation.
  await expect(page.getByText("Couldn't move “Team”")).toBeVisible()
  await expect(item(page, 'Team')).toHaveAttribute('aria-level', '1')
})

test('dragging near the bottom edge scrolls the tree to folders below', async ({ page }) => {
  await page.goto('/?latency=0&dataset=large')
  const tree = page.getByRole('tree')
  await tree.focus()
  await page.keyboard.press('*')
  const box = (await tree.boundingBox())!
  const first = (await page.getByRole('treeitem').first().boundingBox())!

  await page.mouse.move(first.x + 40, first.y + first.height / 2)
  await page.mouse.down()
  // Hold the item just above the tree's bottom edge.
  for (let step = 0; step < 20; step += 1) {
    await page.mouse.move(box.x + 200, box.y + box.height - 12 + (step % 2))
    await page.waitForTimeout(50)
  }
  expect(await tree.evaluate((element) => element.scrollTop)).toBeGreaterThan(200)
  await page.keyboard.press('Escape')
  await page.mouse.up()
})
