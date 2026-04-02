import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.ts'],
    setupFiles: ['vitest.setup.ts'],
    testTimeout: 30000,
    pool: 'forks',
    sequence: {
      concurrent: false,
    },
  },
  esbuild: {
    target: 'es2019',
  },
})
