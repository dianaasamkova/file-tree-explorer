import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { item } from './helpers'

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
