import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    fileParallelism: false,
    include: ['server/src/tests/**/*.test.ts'],
    exclude: ['**/dist/**', '**/node_modules/**', '**/client/**'],
    env: {
      DATABASE_FILE: path.resolve(__dirname, 'server/caresphere_test.db'),
    },
  },
});
