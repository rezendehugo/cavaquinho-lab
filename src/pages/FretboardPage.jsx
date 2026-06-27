import { buildFretboardRows, cavaquinhoTuning, enharmonicNotes } from '../domain/fretboard';

function NoteMarker({ note, stringIndex, fret }) {
  return (
    <span className="fretboard-note" tabIndex="0" aria-label={'Corda ' + (stringIndex + 1) + ', casa ' + fret + ': ' + note}>
      <strong>{note}</strong>
      {enharmonicNotes[note] ? <small>{enharmonicNotes[note]}</small> : null}
    </span>
  );
}

function FretboardPage() {
  const rows = buildFretboardRows();

  return (
    <section className="panel fretboard-page" aria-labelledby="fretboard-title">
      <header className="fretboard-hero">
        <div>
          <p className="eyebrow">Mapa do instrumento</p>
          <h2 id="fretboard-title">Braço e notas no cavaquinho</h2>
          <p>Localize as notas diretamente no braço do cavaquinho.</p>
        </div>
      </header>

      <div className="fretboard-stage" aria-label="Mapa de notas do braço do cavaquinho em D G B D">
        <div className="tuning-row" aria-label="Afinação do cavaquinho: D G B D">
          {cavaquinhoTuning.map((note, index) => <span key={note + index}>{note}</span>)}
        </div>
        <div className="fretboard-neck">
          <div className="fretboard-strings" aria-hidden="true">
            {cavaquinhoTuning.map((note, index) => <span key={note + index} />)}
          </div>
          <div className="fretboard-frets" aria-hidden="true">
            {rows.map(row => <span key={row.fret} />)}
          </div>
          <div className="fretboard-note-grid">
            {rows.map(row => (
              <div key={row.fret} className="note-row">
                <span className="fret-number">{row.fret}</span>
                {row.notes.map(item => <NoteMarker key={item.stringIndex + '-' + item.fret} {...item} />)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default FretboardPage;
