export const getRoutes = () => [
  { path: '/shapes', label: 'Formas', complete: true },
  { path: '/sequences', label: 'Sequências', complete: true },
  { path: '/fretboard', label: 'Braço', complete: true }
];

export const fallbackRoute = '/sequences';

export const routeRedirects = {
  '/cavaquinho': fallbackRoute,
  '/cavaquinho/practice': fallbackRoute,
  '/cavaquinho/sequences': '/sequences',
  '/cavaquinho/shapes': '/shapes',
  '/cavaquinho/fretboard': '/fretboard',
  '/practice': fallbackRoute
};
