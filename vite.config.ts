import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    chunkSizeWarningLimit: 1100,
    rollupOptions: {
      output: {
        // MapLibre is big and changes rarely — keep it in its own cacheable chunk.
        manualChunks: { maplibre: ['maplibre-gl'] },
      },
    },
  },
});
