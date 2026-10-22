import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // The mobile app is a React Native project, so the unit tests cover the
    // pure TypeScript modules (formatting, validation, API client behaviour).
    environment: 'node',
    include: ['src/**/*.test.ts'],
    globals: false,
    reporters: 'default',
  },
});
