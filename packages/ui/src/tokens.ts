/** The colour roles defined in tokens.css. Components use these roles, never raw colours. */
export const colorTokens = [
  { name: 'background', role: 'Page background behind panels' },
  { name: 'surface', role: 'Panels, header, inputs' },
  { name: 'surface-raised', role: 'Toasts and other floating layers' },
  { name: 'foreground', role: 'Body text' },
  { name: 'muted', role: 'Secondary text and icons' },
  { name: 'border', role: 'Dividers and control outlines' },
  { name: 'hover', role: 'Hovered rows and ghost buttons' },
  { name: 'accent', role: 'Selection, focus rings, primary actions' },
  { name: 'accent-foreground', role: 'Text on the accent colour' },
  { name: 'accent-soft', role: 'Selected rows and drop targets' },
  { name: 'folder', role: 'Folder icons, the one decorative colour' },
  { name: 'mark', role: 'Search match highlight' },
  { name: 'danger', role: 'Errors and failed actions' },
  { name: 'guide', role: 'Tree indentation guides' },
] as const

export type ColorToken = (typeof colorTokens)[number]['name']
