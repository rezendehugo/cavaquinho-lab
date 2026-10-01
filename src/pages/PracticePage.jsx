import { lazy, Suspense, useState } from 'react';
import ScalePracticePanel from '../components/ScalePracticePanel';
import SequencePracticePanel from '../components/SequencePracticePanel';
import FreeSoloPracticePanel from '../components/FreeSoloPracticePanel';
import { useSharedMetronome } from '../features/metronome/MetronomeContext';
import { scoreImportsEnabled } from '../config';

const ScoreImportPage = lazy(() => import('./ScoreImportPage'));

export default function PracticePage({ initialMode = 'scale' }) {
  const metronome = useSharedMetronome();
  const [mode, setMode] = useState(initialMode);
  const [createdSoloId, setCreatedSoloId] = useState('');
  const selectMode = (nextMode) => {
    metronome.stop();
    setMode(nextMode);
  };
  const openCreatedPractice = (type, id) => {
    if (type === 'solo') setCreatedSoloId(id);
    selectMode(type);
  };
  const modes = scoreImportsEnabled ? ['scale', 'solo', 'sequence', 'score'] : ['scale', 'solo', 'sequence'];
  const moveTabFocus = event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const index = modes.indexOf(mode);
    const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? modes.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + modes.length) % modes.length;
    const nextMode = modes[nextIndex];
    selectMode(nextMode);
    requestAnimationFrame(() => document.querySelector(`[data-practice-tab="${nextMode}"]`)?.focus());
  };
  return <section className="panel practice-page fretboard-page" aria-labelledby="practice-title">
    <header className="fretboard-hero"><div><p className="eyebrow">Treino guiado</p><h2 id="practice-title">Prática no cavaquinho</h2><p>Escolha um foco, pratique com atenção e escute o que mudou. Clareza, conforto e continuidade vêm antes da velocidade.</p></div></header>
    <div className="practice-mode-tabs" role="tablist" aria-label="Modo de prática" onKeyDown={moveTabFocus}>
      <button type="button" id="practice-tab-scale" data-practice-tab="scale" role="tab" aria-selected={mode === 'scale'} aria-controls="practice-panel-scale" tabIndex={mode === 'scale' ? 0 : -1} onClick={() => selectMode('scale')}>Escala</button>
      <button type="button" id="practice-tab-solo" data-practice-tab="solo" role="tab" aria-selected={mode === 'solo'} aria-controls="practice-panel-solo" tabIndex={mode === 'solo' ? 0 : -1} onClick={() => selectMode('solo')}>Solo livre</button>
      <button type="button" id="practice-tab-sequence" data-practice-tab="sequence" role="tab" aria-selected={mode === 'sequence'} aria-controls="practice-panel-sequence" tabIndex={mode === 'sequence' ? 0 : -1} onClick={() => selectMode('sequence')}>Sequência</button>
      {scoreImportsEnabled ? <button type="button" id="practice-tab-score" data-practice-tab="score" role="tab" aria-selected={mode === 'score'} aria-controls="practice-panel-score" tabIndex={mode === 'score' ? 0 : -1} onClick={() => selectMode('score')}>Partitura</button> : null}
    </div>
    <div id={`practice-panel-${mode}`} role="tabpanel" aria-labelledby={`practice-tab-${mode}`} tabIndex="0">
      {mode === 'scale' ? <ScalePracticePanel key="scale" /> : mode === 'solo' ? <FreeSoloPracticePanel key={`solo-${createdSoloId}`} initialSoloId={createdSoloId} /> : mode === 'sequence' || !scoreImportsEnabled ? <SequencePracticePanel key="sequence" /> : <Suspense fallback={<p className="panel-loading" role="status">Preparando importação de partitura…</p>}><ScoreImportPage embedded onOpenPractice={openCreatedPractice} /></Suspense>}
    </div>
  </section>;
}
