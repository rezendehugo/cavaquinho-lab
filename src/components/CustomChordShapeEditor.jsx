import { useState } from 'react';
import { analyzeChordVoicing, getChordFormulaLegend, getChordToneDetail, getVoicingCompleteness } from '../domain/chordTheory';
import { normalizeCustomPosition } from '../domain/customChordShape';

const strings = ['D₄', 'G₄', 'B₄', 'D₅'];
const tuningMidi = [62, 67, 71, 74];

export default function CustomChordShapeEditor({ step, template, onSave, onCancel }) {
  const [frets, setFrets] = useState(() => [...(step.customPosition?.frets || template.frets.map(fret => fret <= 0 ? fret : (template.baseFret || 1) + fret - 1))]);
  const [fingers, setFingers] = useState(() => [...(step.customPosition?.fingers || template.fingers || [0, 0, 0, 0])]);
  const position = normalizeCustomPosition({ frets, fingers });
  const detail = analyzeChordVoicing(step, position);
  const analysis = getVoicingCompleteness(detail);
  const formula = getChordFormulaLegend(step.key, step.suffix).map(note => note.note).join(' · ');

  return <section className="custom-chord-editor" aria-label="Editar forma do acorde">
    <p><strong>Notas exigidas:</strong> {formula || 'confira a cifra na partitura'}</p>
    <p className="custom-chord-editor-status">{analysis.label} {detail.missingNotes.length ? `Notas que faltam: ${detail.missingNotes.join(' · ')}` : ''}</p>
    {strings.map((string, index) => {
      const midi = frets[index] < 0 ? null : tuningMidi[index] + frets[index];
      const tone = midi === null ? null : getChordToneDetail(step.key, step.suffix, midi);
      const noteText = midi === null ? 'abafada' : `${tone?.note || 'nota fora da cifra'} · ${tone?.degreeLabel || 'fora do acorde'}`;
      return <div className="custom-string-row" key={string}>
      <strong>{string}</strong><span className="custom-string-note">{noteText}</span><div className="custom-fret-choices" role="group" aria-label={`Casas da corda ${string}`}>
        {Array.from({ length: 13 }, (_item, fret) => <button key={fret} type="button" aria-label={`Usar casa ${fret} na corda ${string}`} title={`Usar casa ${fret}`} aria-pressed={frets[index] === fret} onClick={() => setFrets(current => current.map((value, stringIndex) => stringIndex === index ? fret : value))}>{fret}</button>)}
        <button type="button" aria-pressed={frets[index] === -1} aria-label={`Abafar corda ${string}`} title={`Abafar corda ${string}`} onClick={() => setFrets(current => current.map((value, stringIndex) => stringIndex === index ? -1 : value))}>×</button>
      </div>
      <label>Dedo <select value={fingers[index]} onChange={event => setFingers(current => current.map((value, stringIndex) => stringIndex === index ? Number(event.target.value) : value))}>{[0, 1, 2, 3, 4].map(value => <option key={value} value={value}>{value === 0 ? '—' : value}</option>)}</select></label>
    </div>;
    })}
    <div className="custom-chord-editor-actions"><button type="button" data-ui-text-reason="workflow" disabled={!frets.some(fret => fret >= 0)} onClick={() => onSave({ frets, fingers })}>Usar esta forma</button><button type="button" onClick={onCancel}>Cancelar</button></div>
  </section>;
}
