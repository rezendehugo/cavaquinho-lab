export const getRoutes = () => [
  { path: '/shapes', label: 'Formas', complete: true },
  { path: '/sequences', label: 'Sequências', complete: true },
  { path: '/fretboard', label: 'Braço', complete: true },
  { path: '/practice', label: 'Prática', complete: true },
  { path: '/imports', label: 'Importar', complete: true, primary: false }
];

export const uiAuditScenarios = [
  { id: 'shapes', path: '/shapes' },
  { id: 'sequences', path: '/sequences' },
  { id: 'fretboard', path: '/fretboard' },
  { id: 'practice-scale', path: '/practice', tab: 'Escala' },
  { id: 'practice-solo', path: '/practice', tab: 'Solo livre' },
  { id: 'practice-sequence', path: '/practice', tab: 'Sequência' },
  { id: 'practice-score', path: '/practice', tab: 'Partitura' },
  { id: 'imports', path: '/imports' }
];

export const fallbackRoute = '/shapes';

export const routeRedirects = {
  '/cavaquinho': fallbackRoute,
  '/cavaquinho/practice': '/practice',
  '/cavaquinho/sequences': '/sequences',
  '/cavaquinho/shapes': '/shapes',
  '/cavaquinho/fretboard': '/fretboard',
  '/practice': '/practice',
  '/cavaquinho/imports': '/imports'
};
