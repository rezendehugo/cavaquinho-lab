import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const allowedHosts = (process.env.VITE_ALLOWED_HOSTS || '')
  .split(',')
  .map(host => host.trim())
  .filter(Boolean);

export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/cavaquinho-lab/',
  plugins: [react()],
  server: {
    allowedHosts
  },
  resolve: {
    preserveSymlinks: true
  },
  optimizeDeps: {
    include: ['@tombatossals/react-chords/lib/Chord/ChordBlock/index.js']
  },
  build: {
    commonjsOptions: {
      include: [/node_modules/, /react-chords/]
    }
  },
  test: {
    globals: true,
    setupFiles: './src/testSetup.js'
  }
});
