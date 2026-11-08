import { useEffect, useMemo, useRef } from 'react';
import { buildFretboardPositions, fretRegions, getFretSpacingWidths } from '../domain/scalePaths';
import { enharmonicNotes } from '../domain/fretboard';

const FRET_COUNT = 14;
const fretTrackWidths = getFretSpacingWidths();
const fretTrackTotal = fretTrackWidths.reduce((sum, width) => sum + width, 0);
const boundaryPercents = fretTrackWidths.slice(0, -1).map((_width, index) =>
  fretTrackWidths.slice(0, index + 1).reduce((sum, width) => sum + width, 0) / fretTrackTotal * 100
);
const fretLines = (angle, boundaries) => boundaries.map(percent =>
  `linear-gradient(${angle}, transparent calc(${percent}% - .5px), var(--color-border-strong) calc(${percent}% - .5px) calc(${percent}% + .5px), transparent calc(${percent}% + .5px))`
).join(', ');
const fretboardLayoutStyle = {
  '--fret-track-sizes': fretTrackWidths.map(width => `minmax(38px, ${width.toFixed(2)}fr)`).join(' '),
  '--fret-row-sizes': fretTrackWidths.map(width => `${width.toFixed(2)}px`).join(' '),
  '--fret-lines-x': fretLines('90deg', boundaryPercents),
  '--fret-lines-y': fretLines('180deg', boundaryPercents),
  '--fret-region-low': `${fretTrackWidths.slice(0, 4).reduce((sum, width) => sum + width, 0) / fretTrackTotal * 100}%`,
  '--fret-region-middle': `${fretTrackWidths.slice(0, 8).reduce((sum, width) => sum + width, 0) / fretTrackTotal * 100}%`
};

const positionKey = (position) => position.stringIndex + ':' + position.fret;

function PositionMarker({ position, state, interactive, onChoose, onNavigate, chordDegreeMode = false }) {
  const displayNote = state.noteLabel || position.note;
  const classes = ['fretboard-note', 'octave-' + position.octave,
    state.highlighted ? 'highlighted' : '', state.inScale ? 'in-scale' : '', state.path ? 'path-note' : '',
    state.root ? 'scale-root' : '', state.current ? 'scale-current' : '', state.next ? 'scale-next' : '',
    state.played ? 'scale-played' : '', state.start ? 'path-start' : '', state.end ? 'path-end' : '',
    state.candidate || state.selectable ? 'path-candidate' : '', state.requiredTone ? 'chord-tone-candidate' : '', state.essentialTone ? 'chord-tone-essential' : '', state.definingTone ? 'chord-tone-defining' : ''].filter(Boolean).join(' ');
  const hasDegree = Number.isInteger(state.degree);
  const label = (chordDegreeMode && state.path ? 'Na forma, ' : '') + displayNote + position.octave + ', corda ' + (position.stringIndex + 1) + ', casa ' + position.fret
    + (state.degreeLabel ? ', grau ' + state.degreeLabel : state.start ? ', início' : state.end ? ', fim' : state.root ? ', tônica' : state.path && hasDegree ? ', grau ' + (state.degree + 1) : state.definingTone ? ', intervalo que define este acorde' : state.essentialTone ? ', nota essencial do acorde' : state.requiredTone ? ', nota do acorde' : state.candidate ? ', opção selecionável' : state.selectable ? ', clique para escolher esta casa' : '');
  const badge = state.start ? 'I' : state.end ? 'F' : state.root ? 'T' : state.path && hasDegree ? state.degree + 1 : null;
  const smallLabel = state.degreeLabel || (chordDegreeMode ? (state.path ? '×' : '') : state.path || state.candidate || state.selectable ? position.octave : enharmonicNotes[position.note]);
  const content = <><strong>{displayNote}</strong><small>{smallLabel}</small>{badge !== null ? <b>{badge}</b> : null}</>;
  const style = { '--string': position.stringIndex + 1, '--fret': position.fret };
  return interactive && (state.candidate || state.selectable)
    ? <button type="button" className={classes} style={style} data-position={positionKey(position)} data-note={displayNote} data-degree={state.degreeLabel || ''} aria-label={'Adicionar ' + label} title={'Adicionar ' + label} onClick={() => onChoose(position)} onKeyDown={event => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
        event.preventDefault();
        onNavigate?.(position, event.key);
        return;
      }
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      onChoose(position);
    }}>{content}</button>
    : <span className={classes} style={style} data-position={positionKey(position)} data-note={displayNote} data-degree={state.degreeLabel || ''} aria-label={label}>{content}</span>;
}

export default function FretboardGrid({ ariaLabel, getPositionState, editing = false, selecting = false, mutedStrings = [], onChoose = () => {}, showRegionLegend = true, chordDegreeMode = false, initialFocusPosition = null }) {
  const rootRef = useRef(null);
  const positions = useMemo(() => buildFretboardPositions(), []);
  const openPositions = positions.filter(position => position.fret === 0);
  const frettedPositions = positions.filter(position => position.fret > 0);
  const editablePositions = useMemo(() => editing
    ? positions.filter(position => getPositionState(position).selectable)
    : [], [editing, getPositionState, positions]);

  useEffect(() => {
    if (!editing || !initialFocusPosition) return;
    const key = positionKey(initialFocusPosition);
    requestAnimationFrame(() => rootRef.current?.querySelector(`[data-position="${key}"]`)?.focus());
  }, [editing, initialFocusPosition?.stringIndex, initialFocusPosition?.fret]);

  const navigatePosition = (position, direction) => {
    if (!editing || !editablePositions.length) return;
    const next = direction === 'ArrowLeft' || direction === 'ArrowRight' ? (() => {
      const onString = editablePositions.filter(candidate => candidate.stringIndex === position.stringIndex)
        .sort((left, right) => left.fret - right.fret);
      const index = onString.findIndex(candidate => candidate.fret === position.fret);
      return onString[index + (direction === 'ArrowRight' ? 1 : -1)] || null;
    })() : (() => {
      const targetString = position.stringIndex + (direction === 'ArrowDown' ? 1 : -1);
      return editablePositions
        .filter(candidate => candidate.stringIndex === targetString)
        .sort((left, right) => Math.abs(left.fret - position.fret) - Math.abs(right.fret - position.fret) || left.fret - right.fret)[0] || null;
    })();
    if (!next) return;
    rootRef.current?.querySelector(`[data-position="${positionKey(next)}"]`)?.focus();
  };

  return (
    <div ref={rootRef} className={`fretboard-stage${chordDegreeMode ? ' chord-degree-mode' : ''}`} aria-label={ariaLabel}>
      <span className="visually-hidden" aria-label="Afinação do cavaquinho: D G B D">DGBD</span>
      {showRegionLegend ? <div className="fretboard-region-legend" aria-label="Regiões do braço">
        {Object.entries(fretRegions).filter(([id]) => id !== 'compact').map(([id, region]) => <span key={id} className={'region-' + id}>{region.label} · {region.minimum}–{region.maximum}</span>)}
      </div> : null}
      <div className="practice-fretboard-layout">
        <div className="fretboard-open-strings" aria-label="Cordas soltas, casa 0">
          <span className="open-fret-label">0</span>
          {openPositions.map(position => mutedStrings.includes(position.stringIndex) && !editing && !selecting
            ? <span key={positionKey(position)} className="open-string-muted" style={{ '--string': position.stringIndex + 1 }} aria-label={'Corda ' + (position.stringIndex + 1) + ' abafada'}>×</span>
            : <PositionMarker key={positionKey(position)} position={position} state={getPositionState(position)} interactive={editing || selecting} onChoose={onChoose} onNavigate={navigatePosition} chordDegreeMode={chordDegreeMode} />)}
        </div>
        <div className="fretboard-matrix" data-fret-count={FRET_COUNT} style={fretboardLayoutStyle}>
          <div className="fretboard-lines" aria-hidden="true" />
          {Array.from({ length: FRET_COUNT }, (_item, index) => index + 1).map(fret => <span className="matrix-fret-label" style={{ '--fret': fret }} key={fret}>{fret}</span>)}
          {frettedPositions.map(position => <PositionMarker key={positionKey(position)} position={position} state={getPositionState(position)} interactive={editing || selecting} onChoose={onChoose} onNavigate={navigatePosition} chordDegreeMode={chordDegreeMode} />)}
        </div>
      </div>
    </div>
  );
}
