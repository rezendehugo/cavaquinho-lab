import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

const developmentSession = import.meta.env.DEV ? { user: { id: 'development-user', email: 'dev@localhost' }, access_token: 'dev:browser' } : null;
const fallbackAuth = { session: developmentSession, user: developmentSession?.user ?? null, loading: false, configured: import.meta.env.DEV, cloudEnabled: false, getToken: async () => developmentSession?.access_token ?? null, signInWithEmail: async () => ({ error: new Error('auth_not_configured') }), signInWithGoogle: async () => ({ error: new Error('auth_not_configured') }), signOut: async () => {} };
const AuthContext = createContext(fallbackAuth);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(developmentSession);
  const [loading, setLoading] = useState(Boolean(supabase));

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false); });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  const value = useMemo(() => ({
    session, user: session?.user ?? null, loading, configured: Boolean(supabase) || import.meta.env.DEV, cloudEnabled: Boolean(supabase),
    getToken: async () => session?.access_token ?? null,
    signInWithEmail: async email => {
      if (!supabase) throw new Error('auth_not_configured');
      return supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}${import.meta.env.BASE_URL}shapes` } });
    },
    signInWithGoogle: async () => {
      if (!supabase) throw new Error('auth_not_configured');
      return supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}shapes` } });
    },
    signOut: async () => { if (supabase) await supabase.auth.signOut(); else setSession(null); }
  }), [loading, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  return value;
}
