import { useState } from 'react';
import { buildFretboardRows, cavaquinhoTuning, enharmonicNotes } from '../domain/fretboard';
import { getPitchClass, getScaleNotes, scaleDefinitions, scaleDegreeNames } from '../domain/scales';
import { chromaticKeys } from '../sequences';

const modes = { notes: 'notes', scales: 'scales' };

function NoteMarker({ note, stringIndex, fret, state }) {
  const classes = ['fretboard-note', state.highlighted ? 'highlighted' : '', state.inScale ? 'in-scale' : '', state.root ? 'scale-root' : '']
    .filter(Boolean)
    .join(' ');
  return <span className={classes} title={state.description} aria-label={'Corda ' + (stringIndex + 1) + ', casa ' + fret + ': ' + state.description}>
    <strong>{note}</strong>{enharmonicNotes[note] ? <small>{enharmonicNotes[note]}</small> : null}
  </span>;
}

export default function FretboardPage() {
  const [mode, setMode] = useState(modes.notes);
  const [highlightedNote, setHighlightedNote] = useState('');
  const [scaleRoot, setScaleRoot] = useState('C');
  const [scaleId, setScaleId] = useState('major');
  const rows = buildFretboardRows();
  const scaleNotes = getScaleNotes(scaleRoot, scaleId);
  const scalePitchClasses = scaleNotes.map(getPitchClass);

  const getNoteState = note => {
    if (mode === modes.notes) {
      const selected = highlightedNote === note || enharmonicNotes[note] === highlightedNote;
      return { highlighted: selected, description: selected ? note + ' destacada' : note };
    }
    const pitchClass = getPitchClass(note);
    const degree = scalePitchClasses.indexOf(pitchClass);
    const root = pitchClass === getPitchClass(scaleRoot);
    const degreeName = scaleDegreeNames[degree] || 'fora da escala';
    return {
      inScale: degree >= 0,
      root,
      description: degree >= 0 ? note + ', ' + degreeName + ' de ' + scaleRoot + ' ' + scaleDefinitions[scaleId].label.toLowerCase() : note + ', fora da escala'
    };
  };

  const clearSelection = () => {
    if (mode === modes.notes) setHighlightedNote('');
    else {
      setScaleRoot('C');
      setScaleId('major');
    }
  };

  const moveModeFocus = event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const nextMode = event.key === 'Home' ? modes.notes : event.key === 'End' ? modes.scales : mode === modes.notes ? modes.scales : modes.notes;
    setMode(nextMode);
    requestAnimationFrame(() => document.querySelector(`[data-fretboard-mode="${nextMode}"]`)?.focus());
  };

  const summary = mode === modes.notes
    ? highlightedNote || 'Mapa completo'
    : scaleRoot + ' ' + scaleDefinitions[scaleId].label.toLowerCase() + ' · ' + scaleNotes.join(' ');
  const positions = mode === modes.notes && highlightedNote ? rows.flatMap(row => row.notes).filter(item => item.note === highlightedNote || enharmonicNotes[item.note] === highlightedNote).length : 0;

  return <section className="panel fretboard-page" aria-labelledby="fretboard-title">
    <div className="fretboard-reference-workspace">
      <aside className="fretboard-reference-sidebar">
        <header className="fretboard-hero"><div><p className="eyebrow">Mapa do instrumento</p><h2 id="fretboard-title">Braço e notas no cavaquinho</h2></div></header>
        <div className="fretboard-mode" role="group" aria-label="Modo do braço" onKeyDown={moveModeFocus}>
          <button type="button" data-fretboard-mode="notes" aria-pressed={mode === modes.notes} tabIndex={mode === modes.notes ? 0 : -1} onClick={() => setMode(modes.notes)}>Notas</button>
          <button type="button" data-fretboard-mode="scales" aria-pressed={mode === modes.scales} tabIndex={mode === modes.scales ? 0 : -1} onClick={() => setMode(modes.scales)}>Escalas</button>
        </div>
        {mode === modes.notes
          ? <div className="fretboard-tools"><label><span>Destacar nota</span><select aria-label="Destacar nota" value={highlightedNote} onChange={event => setHighlightedNote(event.target.value)}><option value="">Todas as notas</option>{chromaticKeys.map(note => <option key={note}>{note}</option>)}</select></label></div>
          : <div className="fretboard-tools scale-controls"><label><span>Tônica</span><select aria-label="Tônica da escala no braço" value={scaleRoot} onChange={event => setScaleRoot(event.target.value)}>{chromaticKeys.map(note => <option key={note}>{note}</option>)}</select></label><label><span>Escala</span><select aria-label="Tipo de escala no braço" value={scaleId} onChange={event => setScaleId(event.target.value)}>{Object.entries(scaleDefinitions).map(([id, scale]) => <option key={id} value={id}>{scale.label}</option>)}</select></label></div>}
        <div className="fretboard-context" aria-live="polite"><strong>Explorando:</strong><span>{summary}</span>{positions ? <span>{positions} posições no braço</span> : null}<button type="button" className="text-button" onClick={clearSelection} disabled={mode === modes.notes ? !highlightedNote : scaleRoot === 'C' && scaleId === 'major'}>Limpar</button></div>
      </aside>
      <div className={'fretboard-stage ' + (mode === modes.scales ? 'scale-mode' : '')} aria-label="Mapa de notas do braço do cavaquinho em D G B D">
        <div className="tuning-row" aria-label="Afinação do cavaquinho: D G B D">{cavaquinhoTuning.map((note, index) => <span key={note + index}>{note}</span>)}</div>
        <div className="fretboard-neck"><div className="fretboard-strings" aria-hidden="true">{cavaquinhoTuning.map((note, index) => <span key={note + index} />)}</div><div className="fretboard-frets" aria-hidden="true">{rows.map(row => <span key={row.fret} />)}</div>
          <div className="fretboard-note-grid">{rows.map(row => <div key={row.fret} className="note-row"><span className="fret-number">{row.fret}</span>{row.notes.map(item => <NoteMarker key={item.stringIndex + '-' + item.fret} {...item} state={getNoteState(item.note)} />)}</div>)}</div>
        </div>
      </div>
    </div>
  </section>;
}
