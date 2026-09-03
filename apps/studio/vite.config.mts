/// <reference types='vitest' />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// 5180, strict: 5173 and 5190 belong to the Lost Lantern reference app on this machine.
const PORT = 5180;

export default defineConfig(() => ({
  root: import.meta.dirname,
  cacheDir: '../../node_modules/.vite/apps/studio',
  server: {
    port: PORT,
    strictPort: true,
    host: 'localhost',
  },
  preview: {
    port: PORT,
    strictPort: true,
    host: 'localhost',
  },
  plugins: [react(), tailwindcss()],
  build: {
    outDir: './dist',
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
  test: {
    name: 'studio',
    watch: false,
    globals: true,
    environment: 'jsdom',
    setupFiles: ['../../tools/src/vitest/setup.ts'],
    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: './test-output/vitest/coverage',
      provider: 'v8' as const,
    },
  },
}));
