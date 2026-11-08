import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

const practiceImportGraphPlugin = {
  name: 'practice-import-graph',
  apply: 'build',
  generateBundle(_options, bundle) {
    const graph = Object.fromEntries(Object.values(bundle)
      .filter(output => output.type === 'chunk')
      .map(chunk => [chunk.fileName, {
        isEntry: chunk.isEntry,
        imports: chunk.imports,
        dynamicImports: chunk.dynamicImports,
        modules: Object.keys(chunk.modules)
          .map(id => path.relative(process.cwd(), id).replaceAll('\\', '/').split('?')[0])
          .filter(id => id.startsWith('src/') || id.endsWith('node_modules/@tombatossals/chords-db/lib/cavaquinho.json'))
      }]));
    this.emitFile({ type: 'asset', fileName: 'practice-import-graph.json', source: JSON.stringify(graph) });
  }
};

const allowedHosts = (process.env.VITE_ALLOWED_HOSTS || '')
  .split(',')
  .map(host => host.trim())
  .filter(Boolean);

export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/cavaquinho-lab/',
  plugins: [react(), practiceImportGraphPlugin],
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
