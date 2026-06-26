import { getPlayedNotes } from '../chordDisplay';
import { cavaquinhoTuning } from '../domain/chords';

const stringXs = [18, 48, 78, 108];
const topY = 34;
const fretGap = 24;
const diagramHeight = 190;
const diagramWidth = 126;

const getDisplayedFrets = (position) => {
  const visibleFrets = position.frets.filter(fret => fret > 0);
  return Math.max(4, Math.max(...visibleFrets, 1));
};

const getDotY = (fret) => topY + (fret - 0.5) * fretGap;

const getLabel = (position, stringIndex, mode) => {
  if (mode === 'fingers') return position.fingers?.[stringIndex] || '';
  return getPlayedNotes(position)[stringIndex] || '';
};

function Barre({ barre, position }) {
  const indexes = position.frets
    .map((fret, index) => fret === barre ? index : -1)
    .filter(index => index >= 0);
  if (indexes.length < 2) return null;
  const x = stringXs[Math.min(...indexes)] - 9;
  const width = stringXs[Math.max(...indexes)] - stringXs[Math.min(...indexes)] + 18;
  return <rect className="diagram-barre" x={x} y={getDotY(barre) - 9} width={width} height="18" rx="9" />;
}

function Dot({ position, stringIndex, mode }) {
  const fret = position.frets[stringIndex];
  if (fret === -1) return <text className="diagram-muted" x={stringXs[stringIndex]} y="22" textAnchor="middle">x</text>;
  if (fret === 0) return <circle className="diagram-open" cx={stringXs[stringIndex]} cy="20" r="5" />;
  return (
    <g>
      <circle className="diagram-dot" cx={stringXs[stringIndex]} cy={getDotY(fret)} r="12" />
      <text className="diagram-dot-label" x={stringXs[stringIndex]} y={getDotY(fret) + 4} textAnchor="middle">{getLabel(position, stringIndex, mode)}</text>
    </g>
  );
}

function ChordDiagram({ position, name, mode = 'notes' }) {
  if (!position) return null;
  const frets = getDisplayedFrets(position);
  const baseFret = position.baseFret && position.baseFret > 1 ? position.baseFret : null;

  return (
    <figure className="chord-diagram" aria-label={'Forma de ' + name}>
      <figcaption>
        <strong>{name}</strong>
        <span>{position.frets.join('')}</span>
      </figcaption>
      <svg viewBox={'0 0 ' + diagramWidth + ' ' + diagramHeight} role="img" aria-label={name + ' no cavaquinho'}>
        {baseFret ? <text className="diagram-fret-label" x="2" y={topY + 15}>{baseFret + 'fr'}</text> : null}
        <line className="diagram-nut" x1={stringXs[0]} y1={topY} x2={stringXs[3]} y2={topY} />
        {stringXs.map(x => <line key={x} className="diagram-line" x1={x} y1={topY} x2={x} y2={topY + frets * fretGap} />)}
        {Array.from({ length: frets + 1 }, (_item, index) => (
          <line key={index} className="diagram-line" x1={stringXs[0]} y1={topY + index * fretGap} x2={stringXs[3]} y2={topY + index * fretGap} />
        ))}
        {(position.barres || []).map(barre => <Barre key={barre} barre={barre} position={position} />)}
        {position.frets.map((_fret, index) => <Dot key={index} position={position} stringIndex={index} mode={mode} />)}
        {cavaquinhoTuning.map((note, index) => <text key={index} className="diagram-tuning" x={stringXs[index]} y={topY + frets * fretGap + 18} textAnchor="middle">{note}</text>)}
      </svg>
    </figure>
  );
}

export default ChordDiagram;
