import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // A fresh scaffold ships no tests yet — `npm test` must not fail before
    // /build and /qa have written the first ones.
    passWithNoTests: true,
    // Unit-Tests liegen co-located neben der Quelle (`/qa` schreibt sie so).
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    // `tests/` gehoert Playwright. Ohne diesen Ausschluss laedt Vitest die
    // Specs und bricht mit "Playwright Test did not expect test.describe()".
    exclude: ['node_modules', 'tests', '.next'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
})
