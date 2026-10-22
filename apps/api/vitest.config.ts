import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          include: ['tests/unit/**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        test: {
          name: 'integration',
          include: ['tests/integration/**/*.test.ts'],
          environment: 'node',
          setupFiles: ['tests/setup/integration.ts'],
          // The integration suite shares a single PostgreSQL database, so the
          // files must not run concurrently.
          fileParallelism: false,
          pool: 'forks',
          testTimeout: 20_000,
          hookTimeout: 30_000,
        },
      },
    ],
  },
});
