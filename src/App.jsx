import { useEffect, useMemo, useState } from 'react';
import SequenceLab from './components/SequenceLab';
import { fallbackRoute, getRoutes, routeRedirects } from './config';
import PomodoroTimer from './features/pomodoro/PomodoroTimer';
import MetronomeWidget from './features/metronome/MetronomeWidget';
import { MetronomeProvider } from './features/metronome/MetronomeContext';
import FretboardPage from './pages/FretboardPage';
import PracticePage from './pages/PracticePage';
import ShapesPage from './pages/ShapesPage';
import ErrorBoundary from './components/ErrorBoundary';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import PricingPage from './pages/PricingPage';
import AccountPage from './pages/AccountPage';
import LegalPage from './pages/LegalPage';
import { useAuth } from './auth/AuthContext';
import { useCloudSequences } from './hooks/useCloudSequences';
import { LogIn, UserRound } from 'lucide-react';

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
      {routes.filter(item => item.primary !== false).map(item => (
        <a key={item.path} href={getPublicPath(item.path)} className={route === item.path ? 'active' : ''} onClick={(event) => {
          event.preventDefault();
          pushBrowserRoute(item.path);
        }}>{item.label}</a>
      ))}
    </nav>
  );
}

function CloudSequenceLab() {
  const cloud = useCloudSequences();
  if (cloud.status === 'loading') return <section className="panel"><p>Carregando suas sequências…</p></section>;
  return <SequenceLab cloud={cloud} />;
}

function PublicHeader({ authenticated }) {
  return <header className="public-header"><a className="brand-link" href={getPublicPath('/')} onClick={event => { event.preventDefault(); pushBrowserRoute('/'); }}><span>Cavaquinho Lab</span><small>Acordes e prática</small></a><nav aria-label="Navegação pública"><a href={getPublicPath('/pricing')} onClick={event => { event.preventDefault(); pushBrowserRoute('/pricing'); }}>Planos</a><a href={getPublicPath(authenticated ? '/shapes' : '/login')} onClick={event => { event.preventDefault(); pushBrowserRoute(authenticated ? '/shapes' : '/login'); }}>{authenticated ? <UserRound aria-hidden="true" /> : <LogIn aria-hidden="true" />} {authenticated ? 'Abrir app' : 'Entrar'}</a></nav></header>;
}

function App() {
  const routes = useMemo(() => getRoutes(), []);
  const auth = useAuth();
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

  const publicRoute = ['/', '/login', '/pricing', '/terms', '/privacy', '/cancellation', '/contact'].includes(route);
  const protectedRoute = !publicRoute;

  useEffect(() => {
    if (!auth.loading && protectedRoute && !auth.user) pushBrowserRoute('/login');
  }, [auth.loading, auth.user, protectedRoute]);

  if (auth.loading) return <main className="app-shell"><p>Preparando sua conta…</p></main>;

  const page = route === '/' ? <LandingPage />
    : route === '/login' ? <LoginPage />
      : route === '/pricing' ? <PricingPage />
        : ['/terms', '/privacy', '/cancellation', '/contact'].includes(route) ? <LegalPage type={route.slice(1)} />
        : route === '/account' ? <AccountPage />
          : route === '/shapes' ? <ShapesPage />
    : route === '/fretboard' ? <FretboardPage />
      : route === '/practice' ? <PracticePage />
        : route === '/imports' ? <PracticePage initialMode="score" />
      : auth.cloudEnabled ? <CloudSequenceLab /> : <SequenceLab />;

  if (protectedRoute && !auth.user) return <main className="public-shell"><PublicHeader authenticated={false} /><LoginPage /></main>;

  if (publicRoute) return <main className="public-shell"><PublicHeader authenticated={Boolean(auth.user)} /><ErrorBoundary>{page}</ErrorBoundary></main>;

  return (
    <MetronomeProvider><main className="app-shell">
      <header className="hero">
        <div className="hero-topline">
          <div>
            <p className="eyebrow">Cavaquinho Lab</p>
            <h1>Acordes e prática no cavaquinho</h1>
          </div>
          <div className="practice-tools">
            <MetronomeWidget />
            <PomodoroTimer />
            <a className="account-link" href={getPublicPath('/account')} onClick={event => { event.preventDefault(); pushBrowserRoute('/account'); }} aria-label="Conta"><UserRound aria-hidden="true" /></a>
          </div>
        </div>
        <NavTabs route={route} routes={routes} />
      </header>
      <ErrorBoundary>{page}</ErrorBoundary>
    </main></MetronomeProvider>
  );
}

export default App;
