import { defineConfig } from 'vitest/config'

// https://vitest.dev/config/
export default defineConfig({
  test: {
    // Use global to avoid globals imports (describe, test, expect)
    globals: true,
    include: ['src/**/*.spec.ts'],
    testTimeout: 10 * 60 * 1000, // 10 minutes
  },
})
