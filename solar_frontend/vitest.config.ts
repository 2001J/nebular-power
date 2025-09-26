import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: './setupTests.ts',
    globals: true,
    include: ['__tests__/**/*.test.{ts,tsx}'],
    css: false,
    coverage: {
      reporter: ['text', 'lcov'],
      provider: 'v8',
      all: true,
      // Focus coverage on core modules we actively maintain
      include: [
        'lib/utils.ts',
        'lib/exportUtils.ts',
        'lib/api/*.ts',
        'hooks/shared/**/*.ts',
        'components/shared/**/*.tsx',
      ],
      exclude: [
        'lib/api.ts',
        'lib/api.legacy.bak.ts',
        'components/ui/**',
        'app/**',
      ],
      thresholds: {
        lines: 70,
        functions: 65,
        branches: 60,
        statements: 70,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  esbuild: {
    jsx: 'automatic',
  },
});
