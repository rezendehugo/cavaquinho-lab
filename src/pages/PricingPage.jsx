import { Check } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { createApiClient } from '../services/apiClient';
import { createProductApi } from '../services/productApi';
import { commerceEnabled } from '../config';

const benefits = ['Sequências ilimitadas', 'Até 500 acordes', 'Prática avançada', 'Histórico e exportação'];
function PricingPage() {
  const auth = useAuth();
  const [pendingPrice, setPendingPrice] = useState('');
  const [error, setError] = useState('');
  const checkout = async price => {
    if (!auth.user) { window.history.pushState(null, '', `${import.meta.env.BASE_URL}login`); window.dispatchEvent(new Event('popstate')); return; }
    setPendingPrice(price);
    setError('');
    try {
      const { url } = await createProductApi(createApiClient(auth.getToken)).createCheckout(price);
      window.location.assign(url);
    } catch {
      setError('Não foi possível abrir o checkout. Verifique sua conexão e tente novamente.');
      setPendingPrice('');
    }
  };
  return <section className="pricing-page"><p className="eyebrow">Planos</p><h1>Comece grátis. Pratique sem limites quando precisar.</h1><div className="pricing-grid"><article><h2>Free</h2><p className="price">R$ 0</p><ul><li><Check /> Biblioteca completa</li><li><Check /> 3 sequências</li><li><Check /> 20 acordes por sequência</li></ul></article><article className="pricing-featured"><h2>Pro</h2><p className="price">{commerceEnabled ? 'Mensal ou anual' : 'Em breve'}</p><ul>{benefits.map(item => <li key={item}><Check />{item}</li>)}</ul>{commerceEnabled ? <><p className="pricing-explainer">O valor é mostrado antes da confirmação no checkout seguro.</p><div className="pricing-actions"><button type="button" data-ui-text-reason="workflow" aria-label="Ver plano mensal" title="Ver plano mensal" disabled={Boolean(pendingPrice)} onClick={() => checkout('monthly')}>{pendingPrice === 'monthly' ? 'Abrindo…' : 'Ver plano mensal'}</button><button type="button" data-ui-text-reason="workflow" aria-label="Ver plano anual" title="Ver plano anual" disabled={Boolean(pendingPrice)} onClick={() => checkout('annual')}>{pendingPrice === 'annual' ? 'Abrindo…' : 'Ver plano anual'}</button></div>{error ? <p className="error-banner" role="alert">{error}</p> : null}</> : <p className="pricing-explainer">Assinaturas serão abertas após a revisão de termos e disponibilidade de acesso.</p>}</article></div></section>;
}
export default PricingPage;
