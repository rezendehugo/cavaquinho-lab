import { Metronome, Pause, Play, X } from 'lucide-react';
import BpmInput from '../features/metronome/BpmInput';
import FocusedPracticePortal from './FocusedPracticePortal';

export default function FretboardPracticeOverlay({ title, eyebrow, progress, instruction, playing, metronome, onTogglePlay, onExit, legend, children }) {
  return <FocusedPracticePortal ariaLabel={'Prática focada: ' + title} className="sequence-practice-overlay focused-fretboard-practice" onEscape={onExit}>
    <header className="sequence-practice-overlay-header">
      <div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{progress}</p></div>
      <div className="sequence-practice-overlay-tools">
        <div className="sequence-overlay-tempo"><Metronome aria-hidden="true" size={20} /><BpmInput value={metronome.bpm} onChange={metronome.setBpm} ariaLabel="BPM da prática focada" variant="practice" /><span>{metronome.beatsPerMeasure}/4</span></div>
        <button type="button" onClick={onExit} autoFocus><X aria-hidden="true" size={18} />Sair</button>
      </div>
    </header>
    <main className="focused-fretboard-stage">
      <p className="sequence-practice-live" aria-live="polite">{instruction}</p>
      {legend}
      {children}
    </main>
    <footer className="sequence-practice-transport" aria-label="Controles da prática">
      <button type="button" className="sequence-transport-primary" onClick={onTogglePlay} aria-label={playing ? 'Pausar prática' : 'Continuar prática'}>{playing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}</button>
    </footer>
  </FocusedPracticePortal>;
}
