import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base so the build works from any static host or sub-folder.
  base: './',
  build: {
    assetsInlineLimit: 0,
  },
});
