import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

const item = (page: Page, name: string) =>
  page.getByRole('treeitem', { name: new RegExp(`^${name.replace('.', '\\.')}`) })
const activeItem = (page: Page) =>
  page.locator('[role=tree]').evaluate((tree) => {
    const id = tree.getAttribute('aria-activedescendant')
    return id ? document.getElementById(id)?.textContent : null
  })

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

for (const theme of ['light', 'dark'] as const) {
  test(`no accessibility violations in ${theme} mode`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: theme })
    await page.goto('/?latency=0&q=invoice&file=finance%2Finvoices%2Finvoice-2026-09-pdf')
    await expect(item(page, 'Invoice 2026-09.pdf')).toHaveAttribute('aria-selected', 'true')
    await expect(page.locator('html')).toHaveClass(theme === 'dark' ? /dark/ : /^(?!.*dark)/)

    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()
    expect(results.violations).toEqual([])
  })
}
