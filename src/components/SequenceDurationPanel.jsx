import { X } from 'lucide-react';
import { formatSequenceChord } from '../chordDisplay';

export default function SequenceDurationPanel({ sequence, currentIndex = null, open, onClose, onChange }) {
  if (!open) return null;
  return <aside className="sequence-duration-panel" aria-label="Durações dos acordes">
    <header>
      <div><p className="eyebrow">Tempo por card</p><h2>Durações</h2></div>
      <button type="button" className="icon-control-button" onClick={onClose} aria-label="Fechar durações"><X aria-hidden="true" size={18} /></button>
    </header>
    <div className="sequence-duration-list">
      {sequence.steps.map((step, index) => <div key={step.id} className={currentIndex === index ? 'sequence-duration-row active' : 'sequence-duration-row'}>
        <span className="sequence-duration-name"><small>{index + 1}</small><strong>{formatSequenceChord(step)}</strong></span>
        <div className="sequence-duration-stepper" aria-label={'Duração do acorde ' + (index + 1)}>
          <button type="button" onClick={() => onChange(index, -1)} disabled={step.practiceBeats <= 1} aria-label={'Diminuir duração do acorde ' + (index + 1)}>−</button>
          <output aria-label={'Batidas do acorde ' + (index + 1)}>{step.practiceBeats}</output>
          <button type="button" onClick={() => onChange(index, 1)} disabled={step.practiceBeats >= 16} aria-label={'Aumentar duração do acorde ' + (index + 1)}>+</button>
        </div>
      </div>)}
    </div>
  </aside>;
}
