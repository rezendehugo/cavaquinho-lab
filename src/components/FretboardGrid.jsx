import { buildFretboardPositions, fretRegions } from '../domain/scalePaths';
import { enharmonicNotes } from '../domain/fretboard';

const positionKey = (position) => position.stringIndex + ':' + position.fret;

function PositionMarker({ position, state, interactive, onChoose }) {
  const classes = ['fretboard-note', 'octave-' + position.octave,
    state.highlighted ? 'highlighted' : '', state.inScale ? 'in-scale' : '', state.path ? 'path-note' : '',
    state.root ? 'scale-root' : '', state.current ? 'scale-current' : '', state.next ? 'scale-next' : '',
    state.played ? 'scale-played' : '', state.start ? 'path-start' : '', state.end ? 'path-end' : '',
    state.candidate || state.selectable ? 'path-candidate' : ''].filter(Boolean).join(' ');
  const hasDegree = Number.isInteger(state.degree);
  const label = position.note + position.octave + ', corda ' + (position.stringIndex + 1) + ', casa ' + position.fret
    + (state.start ? ', início' : state.end ? ', fim' : state.root ? ', tônica' : state.path && hasDegree ? ', grau ' + (state.degree + 1) : state.candidate ? ', opção selecionável' : '');
  const badge = state.start ? 'I' : state.end ? 'F' : state.root ? 'T' : state.path && hasDegree ? state.degree + 1 : null;
  const content = <><strong>{position.note}</strong><small>{state.path || state.candidate || state.selectable ? position.octave : enharmonicNotes[position.note]}</small>{badge !== null ? <b>{badge}</b> : null}</>;
  const style = { '--string': position.stringIndex + 1, '--fret': position.fret };
  return interactive && (state.candidate || state.selectable)
    ? <button type="button" className={classes} style={style} data-position={positionKey(position)} data-note={position.note} aria-label={'Adicionar ' + label} onClick={() => onChoose(position)} onKeyDown={event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      onChoose(position);
    }}>{content}</button>
    : <span className={classes} style={style} data-position={positionKey(position)} data-note={position.note} aria-label={label}>{content}</span>;
}

export default function FretboardGrid({ ariaLabel, getPositionState, editing = false, selecting = false, mutedStrings = [], onChoose = () => {} }) {
  const positions = buildFretboardPositions();
  const openPositions = positions.filter(position => position.fret === 0);
  const frettedPositions = positions.filter(position => position.fret > 0);
  return (
    <div className="fretboard-stage" aria-label={ariaLabel}>
      <span className="visually-hidden" aria-label="Afinação do cavaquinho: D G B D">DGBD</span>
      <div className="fretboard-region-legend" aria-label="Regiões do braço">
        {Object.entries(fretRegions).filter(([id]) => id !== 'compact').map(([id, region]) => <span key={id} className={'region-' + id}>{region.label} · {region.minimum}–{region.maximum}</span>)}
      </div>
      <div className="practice-fretboard-layout">
        <div className="fretboard-open-strings" aria-label="Cordas soltas, casa 0">
          <span className="open-fret-label">0</span>
          {openPositions.map(position => mutedStrings.includes(position.stringIndex)
            ? <span key={positionKey(position)} className="open-string-muted" style={{ '--string': position.stringIndex + 1 }} aria-label={'Corda ' + (position.stringIndex + 1) + ' abafada'}>×</span>
            : <PositionMarker key={positionKey(position)} position={position} state={getPositionState(position)} interactive={editing || selecting} onChoose={onChoose} />)}
        </div>
        <div className="fretboard-matrix">
          <div className="fretboard-lines" aria-hidden="true" />
          {Array.from({ length: 12 }, (_item, index) => index + 1).map(fret => <span className="matrix-fret-label" style={{ '--fret': fret }} key={fret}>{fret}</span>)}
          {frettedPositions.map(position => <PositionMarker key={positionKey(position)} position={position} state={getPositionState(position)} interactive={editing || selecting} onChoose={onChoose} />)}
        </div>
      </div>
    </div>
  );
}
