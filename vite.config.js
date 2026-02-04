import { defineConfig } from "vite";
import { resolve } from "path";
import { copyFileSync } from "fs";

export default defineConfig({
  base: "./",
  build: {
    outDir: "docs",
    sourcemap: false,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        about: resolve(__dirname, 'about.html'),
        leaderboard: resolve(__dirname, 'leaderboard.html'),
        testDots: resolve(__dirname, 'test-dots.html')
      },
      output: {
        manualChunks: undefined
      }
    },
    // Keep public assets available in `docs/` for static hosting.
    // Our `publicDir` is `assets`, and the app references those files at runtime.
    copyPublicDir: true
  },
  publicDir: 'assets',
  plugins: [
    {
      name: 'copy-version-json',
      closeBundle() {
        // Copy version.json to the output directory after build
        try {
          copyFileSync(
            resolve(__dirname, 'version.json'),
            resolve(__dirname, 'docs', 'version.json')
          );
          console.log('✓ Copied version.json to docs/');
        } catch (error) {
          console.error('Failed to copy version.json:', error);
        }
      }
    }
  ]
});
