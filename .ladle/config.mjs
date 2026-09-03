/** @type {import('@ladle/react').UserConfig} */
export default {
  stories: 'packages/**/src/**/*.stories.{ts,tsx}',
  viteConfig: '.ladle/vite.config.mts',
  outDir: 'dist/ladle',
  port: 61000,
};
