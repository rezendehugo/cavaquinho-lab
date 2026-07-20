import { useEffect, useMemo, useState } from 'react';
import SequenceLab from './components/SequenceLab';
import { fallbackRoute, getRoutes, routeRedirects } from './config';
import PomodoroTimer from './features/pomodoro/PomodoroTimer';
import FretboardPage from './pages/FretboardPage';
import ShapesPage from './pages/ShapesPage';

const normalizeBasePath = (basePath) => {
  if (!basePath || basePath === '/') return '';
  return basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;
};

const basePath = normalizeBasePath(import.meta.env.BASE_URL);

const ensureLeadingSlash = (route) => route.startsWith('/') ? route : '/' + route;

const stripBasePath = (pathname) => {
  if (!basePath || !pathname.startsWith(basePath)) return pathname;
  return pathname.slice(basePath.length) || '/';
};

const getLegacyHashRoute = () => {
  const hashRoute = window.location.hash.replace('#', '');
  return hashRoute ? ensureLeadingSlash(hashRoute) : '';
};

const getRouteFromLocation = () => getLegacyHashRoute() || stripBasePath(window.location.pathname) || fallbackRoute;

const getPublicPath = (route) => basePath + route;

const normalizeRoute = (route, routes) => {
  const normalizedRoute = ensureLeadingSlash(route || fallbackRoute);
  if (routeRedirects[normalizedRoute]) return routeRedirects[normalizedRoute];
  return routes.some(item => item.path === normalizedRoute) ? normalizedRoute : fallbackRoute;
};

const replaceBrowserRoute = (route) => {
  const nextPath = getPublicPath(route);
  if (window.location.pathname === nextPath && !window.location.hash) return;
  window.history.replaceState(null, '', nextPath);
};

const pushBrowserRoute = (route) => {
  const nextPath = getPublicPath(route);
  if (window.location.pathname === nextPath && !window.location.hash) return;
  window.history.pushState(null, '', nextPath);
  window.dispatchEvent(new Event('popstate'));
};

function NavTabs({ route, routes }) {
  return (
    <nav className="tabs" aria-label="Navegação principal">
      {routes.map(item => (
        <a key={item.path} href={getPublicPath(item.path)} className={route === item.path ? 'active' : ''} onClick={(event) => {
          event.preventDefault();
          pushBrowserRoute(item.path);
        }}>{item.label}</a>
      ))}
    </nav>
  );
}

function App() {
  const routes = useMemo(() => getRoutes(), []);
  const [route, setRoute] = useState(() => normalizeRoute(getRouteFromLocation(), routes));

  useEffect(() => {
    const syncRoute = () => {
      const nextRoute = normalizeRoute(getRouteFromLocation(), routes);
      setRoute(nextRoute);
      replaceBrowserRoute(nextRoute);
    };
    window.addEventListener('popstate', syncRoute);
    syncRoute();
    return () => window.removeEventListener('popstate', syncRoute);
  }, [routes]);

  const page = route === '/shapes' ? <ShapesPage />
    : route === '/fretboard' ? <FretboardPage />
      : <SequenceLab />;

  return (
    <main className="app-shell">
      <header className="hero">
        <div className="hero-topline">
          <div>
            <p className="eyebrow">Cavaquinho Lab</p>
            <h1>Estudo prático de acordes, formas e sequências.</h1>
            <p>Um laboratório para estudar cavaquinho com diagramas reais, análise harmônica, cores de apoio e exercícios guiados.</p>
          </div>
          <PomodoroTimer />
        </div>
        <NavTabs route={route} routes={routes} />
      </header>
      {page}
    </main>
  );
}

export default App;
