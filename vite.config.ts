import { defineConfig } from 'vite';

export default defineConfig({
  base: '/',
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 900,
  },
});
