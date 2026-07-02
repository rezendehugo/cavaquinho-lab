import { formatShapeCode, formatShapeIndex } from '../chordDisplay';
import ChordDiagram from './ChordDiagram';
import { ArrowControlButton } from './IconControls';

export function ShapeIndexBadge({ index, total }) {
  return <span className="shape-index-badge" aria-label={'Forma ' + (index + 1) + ' de ' + total}>{formatShapeIndex(index, total)}</span>;
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
  variant = 'default',
  showName = true,
  showShapeCode = true,
  shapeIndexPlacement = 'top'
}) {
  if (!position) return null;

  const classes = ['chord-shape-card', variant === 'focus' ? 'chord-shape-card--focus' : '', className].filter(Boolean).join(' ');
  const showTopIndex = shapeIndexPlacement === 'top';
  const showBottomIndex = shapeIndexPlacement === 'bottom';
  const hasHeader = showName || showTopIndex || showShapeCode || actions;

  return (
    <Component className={classes}>
      {hasHeader ? (
        <>
          <header className="chord-shape-card-header">
            <div className="chord-shape-title">
              {(showName || showTopIndex) ? (
                <div className="chord-shape-name-row">
                  {showName ? <strong>{chordName}</strong> : null}
                  {showTopIndex ? <ShapeIndexBadge index={shapeIndex} total={shapeTotal} /> : null}
                </div>
              ) : null}
              {showShapeCode ? <span className="shape-code">{formatShapeCode(position)}</span> : null}
            </div>
            {actions ? <div className="chord-shape-actions">{actions}</div> : null}
          </header>
          <div className="chord-shape-divider" />
        </>
      ) : null}
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
      {showBottomIndex ? (
        <div className="chord-shape-footer">
          <ShapeIndexBadge index={shapeIndex} total={shapeTotal} />
        </div>
      ) : null}
    </Component>
  );
}

export default ChordShapeCard;
