import fs from 'node:fs';
import path from 'node:path';

const graphPath = path.resolve('dist/practice-import-graph.json');
if (!fs.existsSync(graphPath)) {
  throw new Error(`Practice import graph was not generated at ${graphPath}`);
}

const graph = JSON.parse(fs.readFileSync(graphPath, 'utf8'));
const entry = Object.entries(graph).find(([, chunk]) => chunk.isEntry);
const practice = Object.entries(graph).find(([, chunk]) => chunk.modules.includes('src/pages/PracticePage.jsx'));
if (!entry || !practice) throw new Error('Could not find the app entry and PracticePage chunks.');

const staticClosure = start => {
  const visited = new Set();
  const visit = file => {
    if (visited.has(file) || !graph[file]) return;
    visited.add(file);
    for (const dependency of graph[file].imports) visit(dependency);
  };
  visit(start);
  return visited;
};

const modulesFor = files => new Set([...files].flatMap(file => graph[file]?.modules || []));
const appFiles = staticClosure(entry[0]);
const practiceFiles = staticClosure(practice[0]);
const appModules = modulesFor(appFiles);
const practiceModules = modulesFor(practiceFiles);
const appForbidden = [
  'src/components/SequenceLab.jsx',
  'src/components/CloudSequenceLab.jsx',
  'src/pages/FretboardPage.jsx',
  'src/pages/ShapesPage.jsx',
  'src/pages/LandingPage.jsx',
  'src/pages/ScoreImportPage.jsx',
  'src/domain/chords.js',
  'node_modules/@tombatossals/chords-db/lib/cavaquinho.json',
  'src/storage/sequences.js'
];
const scaleForbidden = [
  'src/domain/chords.js',
  'node_modules/@tombatossals/chords-db/lib/cavaquinho.json',
  'src/storage/sequences.js',
  'src/components/SequencePracticePanel.jsx',
  'src/components/FreeSoloPracticePanel.jsx',
  'src/components/EarTrainingPanel.jsx',
  'src/pages/ScoreImportPage.jsx'
];
const violations = [
  ...appForbidden.filter(module => appModules.has(module)).map(module => `app shell eagerly imports ${module}`),
  ...scaleForbidden.filter(module => practiceModules.has(module)).map(module => `default Escala load eagerly imports ${module}`),
  ...['src/components/SequencePracticePanel.jsx', 'src/components/FreeSoloPracticePanel.jsx', 'src/components/EarTrainingPanel.jsx', 'src/pages/ScoreImportPage.jsx']
    .filter(module => !practice[1].dynamicImports.some(file => graph[file]?.modules.includes(module)))
    .map(module => `PracticePage no longer defers ${module}`)
];

if (violations.length) {
  throw new Error(`Practice startup import boundary failed:\n- ${violations.join('\n- ')}`);
}
