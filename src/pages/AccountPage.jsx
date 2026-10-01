import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { createApiClient } from '../services/apiClient';
import { createProductApi } from '../services/productApi';

function AccountPage() {
  const auth = useAuth();
  const api = useMemo(() => createProductApi(createApiClient(auth.getToken)), [auth.getToken]);
  const [account, setAccount] = useState(null);
  const [confirmation, setConfirmation] = useState('');
  const [status, setStatus] = useState('');
  const [pendingAction, setPendingAction] = useState('');
  useEffect(() => {
    if (!auth.cloudEnabled) { setAccount({ entitlements: { plan: 'development' } }); return; }
    api.me().then(setAccount).catch(() => setAccount({ entitlements: { plan: 'indisponível' } }));
  }, [api, auth.cloudEnabled]);
  const portal = async () => {
    setPendingAction('portal'); setStatus('Abrindo assinatura…');
    try { window.location.assign((await api.openPortal()).url); }
    catch { setStatus('Não foi possível abrir a assinatura. Tente novamente.'); setPendingAction(''); }
  };
  const signOut = async () => {
    setPendingAction('signout'); setStatus('Saindo…');
    try { await auth.signOut(); }
    catch { setStatus('Não foi possível sair agora. Tente novamente.'); setPendingAction(''); }
  };
  const remove = async () => {
    setPendingAction('delete'); setStatus('Excluindo conta…');
    try { await api.deleteAccount(confirmation); await auth.signOut(); }
    catch { setStatus('Não foi possível excluir a conta. Seus dados não foram removidos; tente novamente.'); setPendingAction(''); }
  };
  return <section className="account-page"><p className="eyebrow">Conta</p><h1>{auth.user?.email}</h1><p>Plano: <strong>{account?.entitlements.plan || '…'}</strong></p><button type="button" data-ui-text-reason="workflow" aria-label="Abrir assinatura" title="Abrir assinatura" disabled={Boolean(pendingAction)} onClick={portal}>{pendingAction === 'portal' ? 'Abrindo…' : 'Assinatura'}</button><button type="button" data-ui-text-reason="workflow" className="secondary" aria-label="Sair da conta" title="Sair da conta" disabled={Boolean(pendingAction)} onClick={signOut}>{pendingAction === 'signout' ? 'Saindo…' : 'Sair'}</button><details><summary>Excluir conta</summary><p>Digite EXCLUIR para apagar permanentemente seus dados e acesso.</p><input aria-label="Confirmação de exclusão" value={confirmation} onChange={event => setConfirmation(event.target.value)} /><button type="button" data-ui-text-reason="destructive" aria-label="Excluir conta" title="Excluir conta" disabled={confirmation !== 'EXCLUIR' || Boolean(pendingAction)} onClick={remove}>{pendingAction === 'delete' ? 'Excluindo…' : 'Excluir'}</button></details><p aria-live="polite">{status}</p></section>;
}
export default AccountPage;
