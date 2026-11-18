import { defineConfig } from 'vitest/config'
import { vitestConfig } from '../config/vitest'

export default defineConfig({
  test: vitestConfig({ thresholds: { statements: 95, branches: 95, functions: 95, lines: 95 } }),
})
