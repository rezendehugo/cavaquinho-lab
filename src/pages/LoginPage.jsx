import { useState } from 'react';
import { LogIn, Mail } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

function LoginPage() {
  const auth = useAuth();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submit = async event => {
    event.preventDefault(); setSubmitting(true); setStatus('Enviando acesso…');
    try {
      const { error } = await auth.signInWithEmail(email);
      setStatus(error ? 'Não foi possível enviar o acesso. Verifique o email e tente novamente.' : 'Confira seu email para continuar.');
    } catch {
      setStatus('Não foi possível enviar o acesso. Verifique sua conexão e tente novamente.');
    }
    setSubmitting(false);
  };
  const signInWithGoogle = async () => {
    setSubmitting(true); setStatus('Abrindo acesso com Google…');
    try {
      const { error } = await auth.signInWithGoogle();
      if (error) setStatus('Não foi possível iniciar o acesso com Google. Tente novamente.');
    } catch {
      setStatus('Não foi possível iniciar o acesso com Google. Verifique sua conexão e tente novamente.');
    }
    setSubmitting(false);
  };
  return <section className="auth-panel"><p className="eyebrow">Sua prática</p><h1>Entre no Cavaquinho Lab</h1><p>Salve sequências e continue em qualquer dispositivo.</p>
    {!auth.configured ? <p className="error-banner">Autenticação ainda não foi configurada neste ambiente.</p> : <>
      <form onSubmit={submit}><label><span>Email</span><input type="email" required value={email} onChange={event => setEmail(event.target.value)} /></label><button type="submit" data-ui-text-reason="workflow" aria-label="Enviar acesso por email" title="Enviar acesso por email" disabled={submitting}><Mail aria-hidden="true" />{submitting ? 'Enviando…' : 'Enviar acesso'}</button></form>
      <button type="button" data-ui-text-reason="workflow" className="secondary" aria-label="Continuar com Google" title="Continuar com Google" disabled={submitting} onClick={signInWithGoogle}><LogIn aria-hidden="true" />Continuar com Google</button><p aria-live="polite">{status}</p>
    </>}
  </section>;
}
export default LoginPage;
