import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Unique prefix so the gateway can route built asset requests (/cs-assets/*) to this
  // service specifically, without colliding with madoc-ts's own asset paths.
  base: '/cs-assets/',
  build: {
    outDir: 'dist',
  },
});
