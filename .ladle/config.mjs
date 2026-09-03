/** @type {import('@ladle/react').UserConfig} */
export default {
  // Anchored one level deep on purpose: a `**` before `src` follows the workspace
  // symlinks under each project's node_modules and discovers every story twice.
  stories: ['apps/*/src/**/*.stories.{ts,tsx}', 'packages/*/src/**/*.stories.{ts,tsx}', 'packages/*/*/src/**/*.stories.{ts,tsx}'],
  viteConfig: '.ladle/vite.config.mts',
  outDir: 'dist/ladle',
  port: 61000,
};
