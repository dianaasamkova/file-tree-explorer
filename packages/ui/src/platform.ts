/** The label of the shortcut modifier: ⌘ on Apple devices, Ctrl elsewhere. Both keys work everywhere. */
export const MOD_KEY = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl'
