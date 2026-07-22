import { useState } from 'react';
import ScalePracticePanel from '../components/ScalePracticePanel';
import SequencePracticePanel from '../components/SequencePracticePanel';
import FreeSoloPracticePanel from '../components/FreeSoloPracticePanel';
import { useSharedMetronome } from '../features/metronome/MetronomeContext';

export default function PracticePage() {
  const metronome = useSharedMetronome();
  const [mode, setMode] = useState('scale');
  const selectMode = (nextMode) => {
    metronome.stop();
    setMode(nextMode);
  };
  return <section className="panel practice-page fretboard-page" aria-labelledby="practice-title">
    <header className="fretboard-hero"><div><p className="eyebrow">Treino guiado</p><h2 id="practice-title">Prática no cavaquinho</h2><p>Pratique escalas, crie solos livres ou acompanhe as formas de uma sequência.</p></div></header>
    <div className="practice-mode-tabs" role="tablist" aria-label="Modo de prática">
      <button type="button" role="tab" aria-selected={mode === 'scale'} onClick={() => selectMode('scale')}>Escala</button>
      <button type="button" role="tab" aria-selected={mode === 'solo'} onClick={() => selectMode('solo')}>Solo livre</button>
      <button type="button" role="tab" aria-selected={mode === 'sequence'} onClick={() => selectMode('sequence')}>Sequência</button>
    </div>
    {mode === 'scale' ? <ScalePracticePanel key="scale" /> : mode === 'solo' ? <FreeSoloPracticePanel key="solo" /> : <SequencePracticePanel key="sequence" />}
  </section>;
}
