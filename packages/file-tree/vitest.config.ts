import { defineConfig } from 'vitest/config'
import { vitestConfig } from '../config/vitest'

export default defineConfig({
  test: vitestConfig({
    setupFiles: ['./src/test/setup.ts'],
    // The data logic must be fully covered; the UI at 95%, with behaviour tests rather than line-chasing.
    thresholds: {
      statements: 95,
      branches: 95,
      functions: 95,
      lines: 95,
      'src/{model,state}/**': { statements: 100, branches: 100, functions: 100, lines: 100 },
    },
  }),
})
