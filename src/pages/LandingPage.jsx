import { ArrowRight, Library, ListMusic, Play } from 'lucide-react';
import ChordDiagram from '../components/ChordDiagram';
import { cavaquinhoChords } from '../domain/chords';
import { findChord } from '../progressionOptimizer';

function go(path) {
  window.history.pushState(null, '', `${import.meta.env.BASE_URL.replace(/\/$/, '')}${path}`);
  window.dispatchEvent(new Event('popstate'));
}

function LandingPage() {
  const chord = findChord(cavaquinhoChords, 'C', 'major');
  return <div className="landing-page">
    <section className="landing-hero">
      <div><p className="eyebrow">Cavaquinho Lab</p><h1>As formas que estavam no PDF, agora prontas para praticar.</h1><p>Encontre acordes, escolha cada posição e transforme trechos de músicas em sequências de estudo.</p><div className="landing-actions"><button type="button" data-ui-text-reason="workflow" onClick={() => go('/login')}>Começar agora <ArrowRight aria-hidden="true" /></button><a href="#demo">Ver exemplo</a></div></div>
      <div className="landing-shape" id="demo"><h2>C maior</h2><ChordDiagram position={chord?.positions[0]} name="C maior" chordKey="C" chordSuffix="major" /></div>
    </section>
    <section className="landing-steps" aria-label="Como funciona"><article><Library aria-hidden="true" /><h2>Encontre</h2><p>Pesquise formas por acorde e região.</p></article><article><ListMusic aria-hidden="true" /><h2>Monte</h2><p>Escolha um shape diferente em cada passagem.</p></article><article><Play aria-hidden="true" /><h2>Pratique</h2><p>Repita o trecho no pulso do metrônomo.</p></article></section>
    <section className="landing-proof"><h2>Biblioteca verificável</h2><p>Os diagramas são validados pelas notas tocadas, com indicação de omissões e voicings sem raiz.</p></section><footer className="public-footer"><a href="terms">Termos</a><a href="privacy">Privacidade</a><a href="cancellation">Cancelamento</a><a href="contact">Contato</a></footer>
  </div>;
}

export default LandingPage;
