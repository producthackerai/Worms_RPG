import { defineConfig } from 'vite';
import { resolve } from 'path';
import { cpSync } from 'fs';

export default defineConfig({
  server: {
    port: 3006,
    proxy: {
      '/api': {
        target: 'http://localhost:3007',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html')
      }
    }
  },
  plugins: [
    {
      name: 'copy-game-js',
      closeBundle() {
        // Copy js/game.js and css/style.css to dist (not bundled by Vite)
        cpSync('js', 'dist/js', { recursive: true });
      }
    }
  ]
});
