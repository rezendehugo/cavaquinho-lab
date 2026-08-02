import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { createApiClient } from '../services/apiClient';
import { createProductApi } from '../services/productApi';

function AccountPage() {
  const auth = useAuth();
  const api = useMemo(() => createProductApi(createApiClient(auth.getToken)), [auth.getToken]);
  const [account, setAccount] = useState(null);
  const [confirmation, setConfirmation] = useState('');
  useEffect(() => {
    if (!auth.cloudEnabled) { setAccount({ entitlements: { plan: 'development' } }); return; }
    api.me().then(setAccount).catch(() => setAccount({ entitlements: { plan: 'indisponível' } }));
  }, [api, auth.cloudEnabled]);
  const portal = async () => window.location.assign((await api.openPortal()).url);
  const remove = async () => { await api.deleteAccount(confirmation); await auth.signOut(); };
  return <section className="account-page"><p className="eyebrow">Conta</p><h1>{auth.user?.email}</h1><p>Plano: <strong>{account?.entitlements.plan || '…'}</strong></p><button type="button" onClick={portal}>Assinatura</button><button type="button" className="secondary" onClick={auth.signOut}>Sair</button><details><summary>Excluir conta</summary><p>Digite EXCLUIR para apagar permanentemente seus dados e acesso.</p><input aria-label="Confirmação de exclusão" value={confirmation} onChange={event => setConfirmation(event.target.value)} /><button type="button" disabled={confirmation !== 'EXCLUIR'} onClick={remove}>Excluir</button></details></section>;
}
export default AccountPage;
