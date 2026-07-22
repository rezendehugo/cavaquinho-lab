import { Play, Timer } from 'lucide-react';
import BpmInput from '../features/metronome/BpmInput';

export default function SequencePracticeBar({ sequence, metronome, canStart, status, onBpmChange, onStart, onOpenDurations, startButtonRef }) {
  return <section className="sequence-practice-bar" aria-label="Prática da sequência">
    <div>
      <p className="eyebrow">Filme de acordes</p>
      <strong>Pratique as trocas no pulso</strong>
      <small>{sequence.presetId ? `${sequence.tonic} · ${sequence.practiceBpm} BPM recomendado` : 'Monte a sequência e pratique em tela cheia.'}</small>
    </div>
    <BpmInput value={metronome.bpm} onChange={onBpmChange} ariaLabel="BPM do filme de acordes" variant="practice" />
    <button type="button" className="sequence-durations-trigger" onClick={onOpenDurations} disabled={!canStart}>
      <Timer aria-hidden="true" size={17} />Durações
    </button>
    <button ref={startButtonRef} type="button" className="sequence-practice-start" onClick={onStart} disabled={!canStart}>
      <Play aria-hidden="true" size={16} />Iniciar prática
    </button>
    <p className="sequence-practice-status" aria-live="polite">{status}</p>
  </section>;
}
