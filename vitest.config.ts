import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const serverOnlyShim = fileURLToPath(new URL('./tests/setup/server-only-shim.ts', import.meta.url));

const alias = { 'server-only': serverOnlyShim };

export default defineConfig({
  resolve: { tsconfigPaths: true, alias },
  test: {
    projects: [
      {
        resolve: { tsconfigPaths: true, alias },
        test: {
          name: 'unit',
          include: ['tests/unit/**/*.test.{ts,tsx}'],
          environment: 'node',
        },
      },
      {
        plugins: [react()],
        resolve: { tsconfigPaths: true, alias },
        test: {
          name: 'components',
          include: ['tests/components/**/*.test.{ts,tsx}'],
          environment: 'jsdom',
          setupFiles: ['./tests/setup/vitest.setup.ts'],
        },
      },
      {
        resolve: { tsconfigPaths: true, alias },
        test: {
          name: 'setup',
          include: ['tests/setup/**/*.test.{ts,tsx}'],
          environment: 'node',
        },
      },
    ],
  },
});
