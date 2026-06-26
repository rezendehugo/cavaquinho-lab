import { useEffect, useMemo, useState } from 'react';
import SequenceLab from './components/SequenceLab';
import { getRoutes } from './config';
import HomePage from './pages/HomePage';
import { FretboardPage, PracticePage } from './pages/PlaceholderPages';
import ShapesPage from './pages/ShapesPage';

const getInitialRoute = () => window.location.hash.replace('#', '') || '/cavaquinho/sequences';

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
  const [route, setRoute] = useState(getInitialRoute);

  useEffect(() => {
    const handleHash = () => setRoute(getInitialRoute());
    window.addEventListener('hashchange', handleHash);
    if (!window.location.hash) window.location.hash = '#/cavaquinho/sequences';
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const visibleRoute = routes.some(item => item.path === route) ? route : '/cavaquinho';
  const page = visibleRoute === '/cavaquinho/shapes' ? <ShapesPage />
    : visibleRoute === '/cavaquinho/sequences' ? <SequenceLab />
      : visibleRoute === '/cavaquinho/fretboard' ? <FretboardPage />
        : visibleRoute === '/cavaquinho/practice' ? <PracticePage />
          : <HomePage />;

  return (
    <main className="app-shell">
      <header className="hero">
        <p className="eyebrow">Cavaquinho Lab</p>
        <h1>Estudo prático de acordes, formas e sequências.</h1>
        <p>Um laboratório para estudar cavaquinho com diagramas reais, análise harmônica, cores de apoio e exercícios guiados.</p>
        <NavTabs route={visibleRoute} routes={routes} />
      </header>
      {page}
    </main>
  );
}

export default App;
