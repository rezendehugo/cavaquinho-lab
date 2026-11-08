import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { analyzeChordVoicing, getVoicingCompleteness } from '../domain/chordTheory';
import { formatChordName, formatSequenceChord } from '../chordDisplay';
import ChordShapeCard from './ChordShapeCard';
import useDialogFocus from '../hooks/useDialogFocus';
import CustomChordShapeEditor from './CustomChordShapeEditor';

export default function SequenceShapePicker({ open, step, chord, shapeSuffix, shapeOptions = [], selectedIndex, onSelect, onCustomSave, onSourceChange, onClose }) {
  const [editingTemplate, setEditingTemplate] = useState(null);
  const closeRef = useRef(null);
  const dialogRef = useDialogFocus({ open, onClose, initialFocusRef: closeRef });
  if (!open || !chord) return null;
  return createPortal(<div className="shape-picker-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section ref={dialogRef} tabIndex={-1} className="shape-picker-dialog" role="dialog" aria-modal="true" aria-labelledby={'shape-picker-title-' + step.id}>
      <header><div><p className="eyebrow">Escolha da forma</p><h3 id={'shape-picker-title-' + step.id}>{formatSequenceChord(step)}</h3></div><button ref={closeRef} type="button" className="icon-button" aria-label="Fechar formas" title="Fechar formas" onClick={onClose}><X size={18} aria-hidden="true" /></button></header>
      {shapeOptions.length > 1 ? <div className="shape-source-options" aria-label="Tipo de forma">
        {shapeOptions.map(suffix => <button key={suffix} type="button" aria-pressed={shapeSuffix === suffix} className={shapeSuffix === suffix ? 'selected' : ''} onClick={() => onSourceChange(suffix)}>
          Formas {formatChordName(step.key, suffix, step.displayKey)}
        </button>)}
      </div> : null}
      <button type="button" data-ui-text-reason="domain-choice" className={'shape-auto-option ' + (selectedIndex === null ? 'selected' : '')} aria-pressed={selectedIndex === null} onClick={() => { onSelect(null, null); onClose(); }}><strong>Automática</strong><span>O sistema escolhe a menor movimentação entre acordes.</span></button>
      {editingTemplate ? <CustomChordShapeEditor step={step} template={editingTemplate} onSave={customPosition => { onCustomSave(customPosition, shapeSuffix); setEditingTemplate(null); onClose(); }} onCancel={() => setEditingTemplate(null)} /> : <div className="shape-picker-grid">
        {chord.positions.map((position, index) => {
          const status = getVoicingCompleteness(analyzeChordVoicing(step, position));
          return <article className={'shape-picker-option ' + (selectedIndex === index ? 'selected' : '')} key={index}>
            <button type="button" aria-pressed={selectedIndex === index} aria-label={'Usar forma ' + (index + 1) + ' de ' + chord.positions.length} title={'Usar forma ' + (index + 1)} onClick={() => { onSelect(index, shapeSuffix); onClose(); }}>
              <ChordShapeCard as="div" chordName={formatChordName(step.key, step.suffix, step.displayKey)} chordKey={step.displayKey || step.key} chordSuffix={step.suffix} position={position} shapeIndex={index} shapeTotal={chord.positions.length} showName={false} showShapeCode={false} voicingStatus={status} />
            </button>
            <button type="button" data-ui-text-reason="domain-choice" className="custom-shape-start" onClick={() => setEditingTemplate(position)}>Editar notas desta forma</button>
          </article>;
        })}
      </div>}
    </section>
  </div>, document.body);
}
