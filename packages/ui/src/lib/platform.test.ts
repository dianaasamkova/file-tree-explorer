describe('MOD_KEY', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('is Ctrl outside Apple devices', async () => {
    vi.stubGlobal('navigator', { ...navigator, platform: 'Win32' })
    expect((await import('./platform')).MOD_KEY).toBe('Ctrl')
  })

  it('is ⌘ on a Mac', async () => {
    vi.stubGlobal('navigator', { ...navigator, platform: 'MacIntel' })
    expect((await import('./platform')).MOD_KEY).toBe('⌘')
  })
})
