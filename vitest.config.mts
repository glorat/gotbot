import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.ts'],
    setupFiles: ['vitest.setup.ts'],
    testTimeout: 30000,
    pool: 'forks',
    fileParallelism: false,
    sequence: {
      concurrent: false,
    },
    typecheck: {
      enabled: true,
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
    },
  },
  esbuild: {
    target: 'es2019',
  },
})
