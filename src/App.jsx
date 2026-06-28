import { useEffect, useMemo, useState } from 'react';
import SequenceLab from './components/SequenceLab';
import { fallbackRoute, getRoutes, routeRedirects } from './config';
import PomodoroTimer from './features/pomodoro/PomodoroTimer';
import FretboardPage from './pages/FretboardPage';
import ShapesPage from './pages/ShapesPage';

const getRouteFromHash = () => window.location.hash.replace('#', '') || fallbackRoute;

const normalizeRoute = (route, routes) => {
  if (routeRedirects[route]) return routeRedirects[route];
  return routes.some(item => item.path === route) ? route : fallbackRoute;
};

function NavTabs({ route, routes }) {
  return (
    <nav className="tabs" aria-label="Navegação principal">
      {routes.map(item => (
        <a key={item.path} href={'#' + item.path} className={route === item.path ? 'active' : ''}>{item.label}</a>
      ))}
    </nav>
  );
}

function App() {
  const routes = useMemo(() => getRoutes(), []);
  const [route, setRoute] = useState(() => normalizeRoute(getRouteFromHash(), routes));

  useEffect(() => {
    const syncRoute = () => {
      const nextRoute = normalizeRoute(getRouteFromHash(), routes);
      setRoute(nextRoute);
      if (window.location.hash !== '#' + nextRoute) window.location.hash = '#' + nextRoute;
    };
    window.addEventListener('hashchange', syncRoute);
    syncRoute();
    return () => window.removeEventListener('hashchange', syncRoute);
  }, [routes]);

  const page = route === '/cavaquinho/shapes' ? <ShapesPage />
    : route === '/cavaquinho/fretboard' ? <FretboardPage />
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
