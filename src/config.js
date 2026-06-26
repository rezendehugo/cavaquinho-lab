export const showEmptyPages = import.meta.env.MODE === 'development' || import.meta.env.VITE_SHOW_EMPTY_PAGES === 'true';

export const getRoutes = (includeEmptyPages = showEmptyPages) => [
  { path: '/cavaquinho', label: 'Cavaquinho', complete: true },
  { path: '/cavaquinho/shapes', label: 'Formas', complete: true },
  { path: '/cavaquinho/sequences', label: 'Sequências', complete: true },
  ...(includeEmptyPages ? [
    { path: '/cavaquinho/fretboard', label: 'Braço', complete: false },
    { path: '/cavaquinho/practice', label: 'Prática', complete: false }
  ] : [])
];
