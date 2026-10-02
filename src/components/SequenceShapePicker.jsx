import { useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { analyzeChordVoicing, getVoicingCompleteness } from '../domain/chordTheory';
import ChordShapeCard from './ChordShapeCard';
import useDialogFocus from '../hooks/useDialogFocus';

export default function SequenceShapePicker({ open, step, chord, selectedIndex, onSelect, onClose }) {
  const closeRef = useRef(null);
  const dialogRef = useDialogFocus({ open, onClose, initialFocusRef: closeRef });
  if (!open || !chord) return null;
  return createPortal(<div className="shape-picker-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section ref={dialogRef} tabIndex={-1} className="shape-picker-dialog" role="dialog" aria-modal="true" aria-labelledby={'shape-picker-title-' + step.id}>
      <header><div><p className="eyebrow">Escolha da forma</p><h3 id={'shape-picker-title-' + step.id}>Formas de {step.displayKey || step.key}</h3></div><button ref={closeRef} type="button" className="icon-button" aria-label="Fechar formas" title="Fechar formas" onClick={onClose}><X size={18} aria-hidden="true" /></button></header>
      <button type="button" data-ui-text-reason="domain-choice" className={'shape-auto-option ' + (selectedIndex === null ? 'selected' : '')} aria-pressed={selectedIndex === null} onClick={() => { onSelect(null); onClose(); }}><strong>Automática</strong><span>O sistema escolhe a menor movimentação entre acordes.</span></button>
      <div className="shape-picker-grid">
        {chord.positions.map((position, index) => {
          const status = getVoicingCompleteness(analyzeChordVoicing(step, position));
          return <button type="button" className={'shape-picker-option ' + (selectedIndex === index ? 'selected' : '')} aria-pressed={selectedIndex === index} aria-label={'Fixar forma ' + (index + 1) + ' de ' + chord.positions.length} title={'Fixar forma ' + (index + 1) + ' de ' + chord.positions.length} key={index} onClick={() => { onSelect(index); onClose(); }}>
            <ChordShapeCard as="div" chordName={step.displayKey || step.key} chordKey={step.displayKey || step.key} chordSuffix={step.suffix} position={position} shapeIndex={index} shapeTotal={chord.positions.length} showName={false} showShapeCode={false} voicingStatus={status} />
          </button>;
        })}
      </div>
    </section>
  </div>, document.body);
}
