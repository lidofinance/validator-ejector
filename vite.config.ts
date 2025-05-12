/// <reference types="vitest" />

import { defineConfig } from 'vite'

// https://vitest.dev/config/
export default defineConfig({
  test: {
    // Use global to avoid globals imports (describe, test, expect)
    globals: true,
    testTimeout: 10 * 60 * 1000, // 10 minutes
  },
})
