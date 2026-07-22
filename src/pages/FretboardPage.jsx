import { useState } from 'react';
import { buildFretboardRows, cavaquinhoTuning, enharmonicNotes } from '../domain/fretboard';
import { chromaticKeys } from '../sequences';

function NoteMarker({ note, stringIndex, fret, highlighted }) {
  return <span className={'fretboard-note ' + (highlighted ? 'highlighted' : '')} aria-label={'Corda ' + (stringIndex + 1) + ', casa ' + fret + ': ' + note}>
    <strong>{note}</strong>{enharmonicNotes[note] ? <small>{enharmonicNotes[note]}</small> : null}
  </span>;
}

export default function FretboardPage() {
  const [highlightedNote, setHighlightedNote] = useState('');
  const rows = buildFretboardRows();
  const isHighlighted = note => highlightedNote === note || enharmonicNotes[note] === highlightedNote;
  return <section className="panel fretboard-page" aria-labelledby="fretboard-title">
    <div className="fretboard-reference-workspace">
      <aside className="fretboard-reference-sidebar">
        <header className="fretboard-hero"><div><p className="eyebrow">Mapa do instrumento</p><h2 id="fretboard-title">Braço e notas no cavaquinho</h2><p>Localize uma nota em todas as suas posições no braço.</p></div></header>
        <div className="fretboard-tools"><label><span>Destacar nota</span><select aria-label="Destacar nota" value={highlightedNote} onChange={event => setHighlightedNote(event.target.value)}><option value="">Todas as notas</option>{chromaticKeys.map(note => <option key={note}>{note}</option>)}</select></label></div>
        <div className="fretboard-selection-summary" aria-live="polite">
          <span>{highlightedNote ? 'Nota selecionada' : 'Visão atual'}</span>
          <strong>{highlightedNote || 'Mapa completo'}</strong>
          <p>{highlightedNote ? `As posições de ${highlightedNote} estão destacadas no braço.` : 'Selecione uma nota para encontrar todas as suas posições.'}</p>
        </div>
        <p className="fretboard-legend"><strong>Nota principal</strong><small>Nome enarmônico</small></p>
      </aside>
      <div className="fretboard-stage" aria-label="Mapa de notas do braço do cavaquinho em D G B D">
        <div className="tuning-row" aria-label="Afinação do cavaquinho: D G B D">{cavaquinhoTuning.map((note, index) => <span key={note + index}>{note}</span>)}</div>
        <div className="fretboard-neck"><div className="fretboard-strings" aria-hidden="true">{cavaquinhoTuning.map((note, index) => <span key={note + index} />)}</div><div className="fretboard-frets" aria-hidden="true">{rows.map(row => <span key={row.fret} />)}</div>
          <div className="fretboard-note-grid">{rows.map(row => <div key={row.fret} className="note-row"><span className="fret-number">{row.fret}</span>{row.notes.map(item => <NoteMarker key={item.stringIndex + '-' + item.fret} {...item} highlighted={isHighlighted(item.note)} />)}</div>)}</div>
        </div>
      </div>
    </div>
  </section>;
}
