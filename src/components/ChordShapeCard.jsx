import { formatShapeCode, formatShapeIndex } from '../chordDisplay';
import ChordDiagram from './ChordDiagram';
import { ArrowControlButton } from './IconControls';

export function ShapeIndexBadge({ index, total }) {
  return <span className="shape-index-badge">{formatShapeIndex(index, total)}</span>;
}

export function ShapeNavigationControls({ previousLabel, nextLabel, onPrevious, onNext, previousDisabled = false, nextDisabled = false }) {
  return (
    <>
      <ArrowControlButton direction="left" className="shape-nav-button" variant="overlay" ariaLabel={previousLabel} onClick={onPrevious} disabled={previousDisabled} size={26} />
      <ArrowControlButton direction="right" className="shape-nav-button" variant="overlay" ariaLabel={nextLabel} onClick={onNext} disabled={nextDisabled} size={26} />
    </>
  );
}

function ChordShapeCard({
  chordName,
  position,
  shapeIndex,
  shapeTotal,
  mode = 'notes',
  actions = null,
  navigation = null,
  as: Component = 'article',
  className = '',
  variant = 'default'
}) {
  if (!position) return null;

  const classes = ['chord-shape-card', variant === 'focus' ? 'chord-shape-card--focus' : '', className].filter(Boolean).join(' ');

  return (
    <Component className={classes}>
      <header className="chord-shape-card-header">
        <div className="chord-shape-title">
          <div className="chord-shape-name-row">
            <strong>{chordName}</strong>
            <ShapeIndexBadge index={shapeIndex} total={shapeTotal} />
          </div>
          <span className="shape-code">{formatShapeCode(position)}</span>
        </div>
        {actions ? <div className="chord-shape-actions">{actions}</div> : null}
      </header>
      <div className="chord-shape-divider" />
      <div className="chord-shape-diagram-area">
        {navigation ? (
          <ShapeNavigationControls
            previousLabel={navigation.previousLabel}
            nextLabel={navigation.nextLabel}
            onPrevious={navigation.onPrevious}
            onNext={navigation.onNext}
            previousDisabled={navigation.previousDisabled}
            nextDisabled={navigation.nextDisabled}
          />
        ) : null}
        <ChordDiagram position={position} name={chordName} mode={mode} />
      </div>
    </Component>
  );
}

export default ChordShapeCard;
