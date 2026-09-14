export const getRoutes = () => [
  { path: '/', label: 'Início', complete: true, primary: false, public: true },
  { path: '/login', label: 'Entrar', complete: true, primary: false, public: true },
  { path: '/pricing', label: 'Planos', complete: true, primary: false, public: true },
  { path: '/account', label: 'Conta', complete: true, primary: false },
  { path: '/terms', label: 'Termos', complete: true, primary: false, public: true },
  { path: '/privacy', label: 'Privacidade', complete: true, primary: false, public: true },
  { path: '/cancellation', label: 'Cancelamento', complete: true, primary: false, public: true },
  { path: '/contact', label: 'Contato', complete: true, primary: false, public: true },
  { path: '/shapes', label: 'Formas', complete: true },
  { path: '/sequences', label: 'Sequências', complete: true },
  { path: '/fretboard', label: 'Braço', complete: true },
  { path: '/practice', label: 'Prática', complete: true },
  { path: '/imports', label: 'Importar', complete: true, primary: false }
];

const viteEnvironment = import.meta.env ?? {};
export const apiBaseUrl = (viteEnvironment.VITE_API_URL || 'http://127.0.0.1:8080').replace(/\/$/, '');
export const scoreImportsEnabled = viteEnvironment.VITE_ENABLE_SCORE_IMPORTS !== 'false';

export const uiAuditScenarios = [
  { id: 'landing', path: '/' },
  { id: 'login', path: '/login' },
  { id: 'pricing', path: '/pricing' },
  { id: 'account', path: '/account' },
  { id: 'terms', path: '/terms' },
  { id: 'privacy', path: '/privacy' },
  { id: 'cancellation', path: '/cancellation' },
  { id: 'contact', path: '/contact' },
  { id: 'shapes', path: '/shapes' },
  { id: 'sequences', path: '/sequences' },
  { id: 'fretboard', path: '/fretboard' },
  { id: 'practice-scale', path: '/practice', tab: 'Escala' },
  { id: 'practice-solo', path: '/practice', tab: 'Solo livre' },
  { id: 'practice-sequence', path: '/practice', tab: 'Sequência' },
  { id: 'practice-score', path: '/practice', tab: 'Partitura' },
  { id: 'imports', path: '/imports' }
];

export const fallbackRoute = '/';

export const routeRedirects = {
  '/cavaquinho': fallbackRoute,
  '/cavaquinho/practice': '/practice',
  '/cavaquinho/sequences': '/sequences',
  '/cavaquinho/shapes': '/shapes',
  '/cavaquinho/fretboard': '/fretboard',
  '/practice': '/practice',
  '/cavaquinho/imports': '/imports'
};
