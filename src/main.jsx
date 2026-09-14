import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { AuthProvider } from './auth/AuthContext.jsx';
import * as Sentry from '@sentry/react';
import { startBrowserTracing } from './observability.js';
import './styles.css';

if (import.meta.env.VITE_SENTRY_DSN) Sentry.init({ dsn: import.meta.env.VITE_SENTRY_DSN, environment: import.meta.env.MODE, release: import.meta.env.VITE_APP_VERSION });
startBrowserTracing();

createRoot(document.getElementById('root')).render(<AuthProvider><App /></AuthProvider>);
