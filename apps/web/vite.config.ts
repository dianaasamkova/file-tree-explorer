/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { vitestConfig } from '../../packages/config/vitest'

export default defineConfig({
  // GitHub Pages serves the site from /<repository>/; the deploy workflow sets BASE_PATH.
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), tailwindcss()],
  test: vitestConfig({ thresholds: { statements: 95, branches: 95, functions: 95, lines: 95 } }),
})
