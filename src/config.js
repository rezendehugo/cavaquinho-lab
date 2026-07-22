export const getRoutes = () => [
  { path: '/shapes', label: 'Formas', complete: true },
  { path: '/sequences', label: 'Sequências', complete: true },
  { path: '/fretboard', label: 'Braço', complete: true },
  { path: '/practice', label: 'Prática', complete: true }
];

export const fallbackRoute = '/shapes';

export const routeRedirects = {
  '/cavaquinho': fallbackRoute,
  '/cavaquinho/practice': '/practice',
  '/cavaquinho/sequences': '/sequences',
  '/cavaquinho/shapes': '/shapes',
  '/cavaquinho/fretboard': '/fretboard',
  '/practice': '/practice'
};
