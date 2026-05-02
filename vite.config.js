import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Use relative paths in the built bundle so you can just open dist/index.html
  // straight from disk (no static server needed for the parent app —
  // the iframe still pulls libs from CDNs).
  base: './',
  server: { port: 5173 },
});
