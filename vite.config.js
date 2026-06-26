import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/cavaquinho-lab/',
  plugins: [react()],
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