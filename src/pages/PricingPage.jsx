import { Check } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { createApiClient } from '../services/apiClient';
import { createProductApi } from '../services/productApi';

const benefits = ['Sequências ilimitadas', 'Até 500 acordes', 'Prática avançada', 'Histórico e exportação'];
function PricingPage() {
  const auth = useAuth();
  const checkout = async price => {
    if (!auth.user) { window.history.pushState(null, '', `${import.meta.env.BASE_URL}login`); window.dispatchEvent(new Event('popstate')); return; }
    const { url } = await createProductApi(createApiClient(auth.getToken)).createCheckout(price);
    window.location.assign(url);
  };
  return <section className="pricing-page"><p className="eyebrow">Planos</p><h1>Comece grátis. Pratique sem limites quando precisar.</h1><div className="pricing-grid"><article><h2>Free</h2><p className="price">R$ 0</p><ul><li><Check /> Biblioteca completa</li><li><Check /> 3 sequências</li><li><Check /> 20 acordes por sequência</li></ul></article><article className="pricing-featured"><h2>Pro</h2><p className="price">Preço no checkout</p><ul>{benefits.map(item => <li key={item}><Check />{item}</li>)}</ul><div className="pricing-actions"><button type="button" onClick={() => checkout('monthly')}>Mensal</button><button type="button" onClick={() => checkout('annual')}>Anual</button></div></article></div></section>;
}
export default PricingPage;
