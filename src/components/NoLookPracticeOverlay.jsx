import { useState } from 'react';
import { Metronome, X } from 'lucide-react';
import { formatRootOption, formatSequenceChord } from '../chordDisplay';
import { getChordQualityHint } from '../domain/noLookPractice';
import useSequenceStudy from '../hooks/useSequenceStudy';
import BpmInput from '../features/metronome/BpmInput';
import FocusedPracticePortal from './FocusedPracticePortal';

export default function NoLookPracticeOverlay({ sequence, metronome, playing, onToggleMetronome, onExit }) {
  const [index, setIndex] = useState(0);
  const [hintLevel, setHintLevel] = useState(0);
  const [answerVisible, setAnswerVisible] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const study = useSequenceStudy(sequence.id);
  const steps = sequence.steps;
  const step = steps[index];
  const isLast = index === steps.length - 1;

  const advance = () => {
    if (isLast) {
      setRevealed(true);
      return;
    }
    setIndex(current => current + 1);
    setHintLevel(0);
    setAnswerVisible(false);
  };

  const handleKeyDown = event => {
    if (event.target instanceof Element && event.target.closest('input, textarea, button')) return;
    if (event.key === ' ') { event.preventDefault(); onToggleMetronome(); }
    if (event.key === 'ArrowRight' && !revealed) { event.preventDefault(); advance(); }
  };

  return <FocusedPracticePortal ariaLabel={'Prática sem olhar: ' + sequence.title} className="sequence-practice-overlay no-look-practice-overlay" onEscape={onExit} onKeyDown={handleKeyDown}>
    <header className="sequence-practice-overlay-header">
      <div><p className="eyebrow">Lembrar, tocar, conferir</p><h1>{sequence.title}</h1><p>{revealed ? 'Confira a sequência e registre o que percebeu.' : 'Acordes ocultos · toque de memória e avance no seu ritmo.'}</p></div>
      <div className="sequence-practice-overlay-tools">
        <div className="sequence-overlay-tempo"><Metronome aria-hidden="true" size={20} /><BpmInput value={metronome.bpm} onChange={metronome.setBpm} ariaLabel="BPM da prática sem olhar" variant="practice" /><span>{metronome.beatsPerMeasure}/4</span></div>
        <button type="button" onClick={onExit} autoFocus><X aria-hidden="true" size={18} />Sair</button>
      </div>
    </header>

    <main className="no-look-practice-stage">
      {!revealed ? <section className="no-look-prompt" aria-labelledby="no-look-prompt-title">
        <p className="eyebrow">Acorde {index + 1} de {steps.length}</p>
        <h2 id="no-look-prompt-title">Toque o que você lembra</h2>
        <p>Escute o som e sinta a troca. Quando tocar este acorde, avance para o próximo sem consultar a cifra.</p>
        <div className="no-look-progress" role="progressbar" aria-label="Progresso da sequência" aria-valuemin="1" aria-valuemax={steps.length} aria-valuenow={index + 1}>
          <span style={{ width: `${((index + 1) / steps.length) * 100}%` }} />
        </div>
        <p className="no-look-hint" aria-live="polite">{hintLevel === 1 ? `Pista 1: qualidade ${getChordQualityHint(step.suffix)}.` : hintLevel >= 2 ? `Pista 2: a nota fundamental é ${formatRootOption(step.displayKey || step.key)}.` : answerVisible ? `Resposta: ${formatSequenceChord(step)}.` : 'A sequência permanece escondida durante a tentativa.'}</p>
        <div className="no-look-actions">
          {!answerVisible && hintLevel < 2 ? <button type="button" data-ui-text-reason="workflow" onClick={() => setHintLevel(level => level + 1)}>Pedir pista {hintLevel ? 'da nota' : 'de qualidade'}</button> : null}
          {!answerVisible ? <button type="button" data-ui-text-reason="workflow" onClick={() => setAnswerVisible(true)}>Conferir este acorde</button> : null}
          <button type="button" data-ui-text-reason="workflow" aria-label={isLast ? 'Terminar e conferir sequência' : answerVisible ? 'Continuar para o próximo' : 'Marcar acorde tocado'} title={isLast ? 'Terminar e conferir sequência' : answerVisible ? 'Continuar para o próximo' : 'Marcar acorde tocado'} className="no-look-primary" onClick={advance}>{isLast ? 'Terminar e conferir sequência' : answerVisible ? 'Continuar para o próximo' : 'Marcar acorde tocado'}</button>
        </div>
        <button type="button" data-ui-text-reason="workflow" className="no-look-reveal-link" onClick={() => setRevealed(true)}>Conferir sequência agora</button>
      </section> : <section className="no-look-review" aria-labelledby="no-look-review-title">
        <p className="eyebrow">Tentativa concluída</p><h2 id="no-look-review-title">Agora confira</h2>
        <ol aria-label="Sequência revelada">{steps.map((item, itemIndex) => <li key={item.id}><span>{itemIndex + 1}</span><strong>{formatSequenceChord(item)}</strong></li>)}</ol>
        <label className="no-look-reflection"><span>O que você lembrou, ouviu ou sentiu ao tocar?</span><textarea rows="3" maxLength="1600" value={study.study.observation} onChange={event => study.update('observation', event.target.value)} placeholder="Ex.: reconheci a chegada ao acorde de repouso pelo som, antes de lembrar o nome." /></label>
        <div className="no-look-review-footer"><button type="button" data-ui-text-reason="workflow" disabled={!study.study.observation.trim()} onClick={() => study.record(metronome.bpm)}>Registrar esta sessão</button><p role="status">{study.status || 'Escreva uma observação para registrar a sessão. A reflexão é salva neste navegador.'}</p></div>
      </section>}
    </main>

    <footer className="sequence-practice-transport" aria-label="Metrônomo da prática sem olhar">
      <button type="button" className="sequence-transport-primary" onClick={onToggleMetronome} aria-label={playing ? 'Pausar metrônomo' : 'Iniciar metrônomo'} title={playing ? 'Pausar metrônomo' : 'Iniciar metrônomo'} aria-pressed={playing}>{playing ? 'Pausar metrônomo' : 'Iniciar metrônomo'}</button>
    </footer>
  </FocusedPracticePortal>;
}
