import { fileURLToPath } from 'node:url'
import type { ViteUserConfig } from 'vitest/config'

type Thresholds = NonNullable<NonNullable<NonNullable<ViteUserConfig['test']>['coverage']>['thresholds']>

/**
 * The test settings every package shares: jsdom, the common setup file, and V8 coverage of
 * `src/` with the package's own thresholds.
 */
export function vitestConfig({
  thresholds,
  setupFiles = [],
}: {
  thresholds: Thresholds
  setupFiles?: string[]
}): ViteUserConfig['test'] {
  return {
    globals: true,
    environment: 'jsdom',
    setupFiles: [fileURLToPath(new URL('./vitest.setup.ts', import.meta.url)), ...setupFiles],
    include: ['src/**/*.test.{ts,tsx}'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/testing/**'],
      thresholds,
    },
  }
}
