import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@fencetastic/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
  },
  test: {
    environment: 'node',
  },
});
