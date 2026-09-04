import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // @vitejs/plugin-react 6 peers on Vite 8; Ladle 5.1 runs its own bundled Vite 6,
  // so the plugin is inert here and JSX falls back to esbuild's tsconfig lookup.
  // This file sits outside every project tsconfig, which made the Provider compile
  // classic ("React is not defined", blank built stories). Name the runtime.
  esbuild: { jsx: 'automatic', jsxImportSource: 'react' },
  // Ladle's serve and preview open a tab in the default browser unless Vite says
  // not to. Agents run these headlessly; nothing here may touch the user's screen.
  server: { open: false },
  preview: { open: false },
});
