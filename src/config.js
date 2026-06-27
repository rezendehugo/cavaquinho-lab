export const getRoutes = () => [
  { path: '/cavaquinho/shapes', label: 'Formas', complete: true },
  { path: '/cavaquinho/sequences', label: 'Sequências', complete: true },
  { path: '/cavaquinho/fretboard', label: 'Braço', complete: true }
];

export const fallbackRoute = '/cavaquinho/sequences';

export const routeRedirects = {
  '/cavaquinho': fallbackRoute,
  '/cavaquinho/practice': fallbackRoute
};
