import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  base: "./",
  build: {
    outDir: "docs",
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        about: resolve(__dirname, 'about.html'),
        leaderboard: resolve(__dirname, 'leaderboard.html'),
        testDots: resolve(__dirname, 'test-dots.html')
      }
    },
    copyPublicDir: false
  },
  publicDir: 'assets'
});
