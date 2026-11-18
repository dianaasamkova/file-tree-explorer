import type { Page } from '@playwright/test'

/** A tree item by the start of its accessible name (names also include the size). */
export const item = (page: Page, name: string) =>
  page.getByRole('treeitem', { name: new RegExp(`^${name.replace('.', '\\.')}`) })
/** The text of the item that `aria-activedescendant` points at: the keyboard focus. */
export const activeItem = (page: Page) =>
  page.locator('[role=tree]').evaluate((tree) => {
    const id = tree.getAttribute('aria-activedescendant')
    return id ? document.getElementById(id)?.textContent : null
  })
