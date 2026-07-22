import { X } from 'lucide-react';
import { analyzeChordVoicing, getVoicingCompleteness } from '../domain/chordTheory';
import ChordShapeCard from './ChordShapeCard';

export default function SequenceShapePicker({ open, step, chord, selectedIndex, onSelect, onClose }) {
  if (!open || !chord) return null;
  return <div className="shape-picker-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="shape-picker-dialog" role="dialog" aria-modal="true" aria-labelledby={'shape-picker-title-' + step.id}>
      <header><div><p className="eyebrow">Escolha da forma</p><h3 id={'shape-picker-title-' + step.id}>Formas de {step.displayKey || step.key}</h3></div><button type="button" className="icon-button" aria-label="Fechar formas" onClick={onClose}><X size={18} aria-hidden="true" /></button></header>
      <button type="button" className={'shape-auto-option ' + (selectedIndex === null ? 'selected' : '')} aria-pressed={selectedIndex === null} onClick={() => { onSelect(null); onClose(); }}><strong>Automática</strong><span>O sistema escolhe a menor movimentação entre acordes.</span></button>
      <div className="shape-picker-grid">
        {chord.positions.map((position, index) => {
          const status = getVoicingCompleteness(analyzeChordVoicing(step, position));
          return <button type="button" className={'shape-picker-option ' + (selectedIndex === index ? 'selected' : '')} aria-pressed={selectedIndex === index} aria-label={'Fixar forma ' + (index + 1) + ' de ' + chord.positions.length} key={index} onClick={() => { onSelect(index); onClose(); }}>
            <ChordShapeCard as="div" chordName={step.displayKey || step.key} position={position} shapeIndex={index} shapeTotal={chord.positions.length} showName={false} showShapeCode={false} voicingStatus={status} />
          </button>;
        })}
      </div>
    </section>
  </div>;
}
