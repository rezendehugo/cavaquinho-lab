import { useState } from 'react';
import { LogIn, Mail } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

function LoginPage() {
  const auth = useAuth();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');
  const submit = async event => {
    event.preventDefault(); setStatus('Enviando…');
    const { error } = await auth.signInWithEmail(email);
    setStatus(error ? 'Não foi possível enviar o acesso.' : 'Confira seu email para continuar.');
  };
  return <section className="auth-panel"><p className="eyebrow">Sua prática</p><h1>Entre no Cavaquinho Lab</h1><p>Salve sequências e continue em qualquer dispositivo.</p>
    {!auth.configured ? <p className="error-banner">Autenticação ainda não foi configurada neste ambiente.</p> : <>
      <form onSubmit={submit}><label><span>Email</span><input type="email" required value={email} onChange={event => setEmail(event.target.value)} /></label><button type="submit" data-ui-text-reason="workflow"><Mail aria-hidden="true" />Enviar acesso</button></form>
      <button type="button" data-ui-text-reason="workflow" className="secondary" onClick={() => auth.signInWithGoogle()}><LogIn aria-hidden="true" />Continuar com Google</button><p aria-live="polite">{status}</p>
    </>}
  </section>;
}
export default LoginPage;
