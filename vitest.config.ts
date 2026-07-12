import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.test.ts', '**/*.spec.ts'],
    exclude: ['node_modules', 'functions/lib', '.next'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      thresholds: {
        lines: 80,
        branches: 75,
        functions: 80,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      'firebase-functions/logger': path.resolve(__dirname, '__mocks__/firebase-functions-logger.ts'),
    },
  },
});
