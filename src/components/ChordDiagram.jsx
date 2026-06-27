import { getPlayedNotes } from '../chordDisplay';

const minVisibleFretCount = 4;
const maxVisibleFretCount = 8;
const dotRadius = 11;
const stringXs = [42, 72, 102, 132];
const openNoteY = 18;
const topY = 34;
const gridHeight = 144;
const diagramHeight = 190;
const diagramWidth = 154;
const labelX = 28;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const getVisibleFretCount = (position) => {
  const maxFret = Math.max(...position.frets.filter(fret => fret > 0), 1);
  return clamp(maxFret, minVisibleFretCount, maxVisibleFretCount);
};

const getFretGap = (visibleFretCount) => gridHeight / visibleFretCount;

const getDotY = (fret, visibleFretCount) => topY + (fret - 0.5) * getFretGap(visibleFretCount);

const getLabel = (position, stringIndex, mode) => {
  if (mode === 'fingers') return position.fingers?.[stringIndex] || '';
  return getPlayedNotes(position)[stringIndex] || '';
};

function Barre({ barre, position, visibleFretCount }) {
  const indexes = position.frets
    .map((fret, index) => fret === barre ? index : -1)
    .filter(index => index >= 0);
  if (indexes.length < 2) return null;
  const x = stringXs[Math.min(...indexes)] - dotRadius;
  const width = stringXs[Math.max(...indexes)] - stringXs[Math.min(...indexes)] + dotRadius * 2;
  return <rect className="diagram-barre" x={x} y={getDotY(barre, visibleFretCount) - dotRadius} width={width} height={dotRadius * 2} rx={dotRadius} />;
}

function DotLabel({ label, x, y }) {
  if (!label) return null;
  const text = String(label);
  const root = text.slice(0, 1);
  const accidental = text.slice(1);

  return (
    <text className="diagram-dot-label" x={x} y={y + 3.5} textAnchor="middle">
      <tspan>{root}</tspan>
      {accidental ? <tspan className="diagram-dot-accidental" dx="0.5" dy="-1.2">{accidental}</tspan> : null}
    </text>
  );
}

function Dot({ position, stringIndex, mode, visibleFretCount }) {
  const fret = position.frets[stringIndex];
  const x = stringXs[stringIndex];
  if (fret === -1) return <text className="diagram-muted" x={x} y={openNoteY + 3} textAnchor="middle">x</text>;
  if (fret === 0) return <circle className="diagram-open" cx={x} cy={openNoteY} r="5" />;
  const y = getDotY(fret, visibleFretCount);
  return (
    <g>
      <circle className="diagram-dot" cx={x} cy={y} r={dotRadius} />
      <DotLabel label={getLabel(position, stringIndex, mode)} x={x} y={y} />
    </g>
  );
}

function ChordDiagram({ position, name, mode = 'notes' }) {
  if (!position) return null;
  const startFret = position.baseFret || 1;
  const isNutVisible = startFret === 1;
  const visibleFretCount = getVisibleFretCount(position);
  const fretGap = getFretGap(visibleFretCount);

  return (
    <figure className="chord-diagram" aria-label={'Forma de ' + name}>
      <svg viewBox={'0 0 ' + diagramWidth + ' ' + diagramHeight} role="img" aria-label={name + ' no cavaquinho'}>
        {startFret > 1 ? <text className="diagram-fret-label" x={labelX} y={topY + fretGap / 2 + 3} textAnchor="end">{startFret + 'fr'}</text> : null}
        {stringXs.map(x => <line key={x} className="diagram-line" x1={x} y1={topY} x2={x} y2={topY + gridHeight} />)}
        {Array.from({ length: visibleFretCount + 1 }, (_item, index) => (
          <line key={index} className={index === 0 && isNutVisible ? 'diagram-nut' : 'diagram-line'} x1={stringXs[0]} y1={topY + index * fretGap} x2={stringXs[3]} y2={topY + index * fretGap} />
        ))}
        {(position.barres || []).map(barre => <Barre key={barre} barre={barre} position={position} visibleFretCount={visibleFretCount} />)}
        {position.frets.map((_fret, index) => <Dot key={index} position={position} stringIndex={index} mode={mode} visibleFretCount={visibleFretCount} />)}
      </svg>
    </figure>
  );
}

export default ChordDiagram;
