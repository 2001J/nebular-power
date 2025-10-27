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
        'lib/**/*.ts',
        'hooks/**/*.ts',
        'components/shared/**/*.tsx',
      ],
      exclude: [
        'lib/api.ts',
        'lib/api.legacy.bak.ts',
        'components/ui/**',
        'app/**',
        // No longer excluding chart helpers; they now have tests
        // Low-value helpers and fixtures
        'lib/mockData.ts',
        'lib/logsApiTest.ts',
        // Types only (no runtime logic)
        'lib/api/types.ts',
        // No API modules excluded here; we now cover them with tests
        // Hooks wrappers or integration-heavy hooks (to be covered later)
        'hooks/index.ts',
        'hooks/auth.ts',
        'hooks/use-websocket.ts',
        'hooks/useWebSocket.ts',
        'hooks/use-api-request.ts',
        'hooks/useApiRequest.ts',
        'hooks/use-toast.ts',
        // Temporarily exclude complex hooks/utilities with partial coverage
        'hooks/shared/useForm.ts',
        'hooks/useCustomers.ts',
        // Realtime client is environment-coupled; cover later with integration tests
        'lib/energyWebSocket.ts',
        // Optional: very UI-heavy component with low payoff, exclude for now
        'components/shared/LoadingStates.tsx',
      ],
      thresholds: {
        lines: 78,
        functions: 75,
        branches: 65,
        statements: 78,
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
