import { formatChordName, formatSuffix, qualityLabels } from '../chordDisplay';
import { ArrowControlButton } from './IconControls';

const SWIPE_THRESHOLD = 24;

const getSwipeDirection = (start, end) => {
  if (!start) return 0;

  const deltaY = end.clientY - start.clientY;
  if (Math.abs(deltaY) < SWIPE_THRESHOLD) return 0;

  return deltaY > 0 ? 1 : -1;
};

function ChordPartControl({ className, label, value, title, previousLabel, nextLabel, onPrevious, onNext }) {
  let touchStart = null;

  const handlePointerDown = (event) => {
    if (event.pointerType === 'mouse') return;
    touchStart = { clientY: event.clientY };
  };

  const handlePointerUp = (event) => {
    const direction = getSwipeDirection(touchStart, event);
    touchStart = null;

    if (direction < 0) onPrevious();
    if (direction > 0) onNext();
  };

  return (
    <span
      className={className}
      aria-label={label}
      title={title}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
    >
      <span className="chord-identity-text">{value}</span>
      <span className="chord-identity-arrows">
        <ArrowControlButton direction="up" className="chord-identity-arrow" ariaLabel={previousLabel} onClick={onPrevious} size={13} />
        <ArrowControlButton direction="down" className="chord-identity-arrow" ariaLabel={nextLabel} onClick={onNext} size={13} />
      </span>
    </span>
  );
}

function ChordIdentityControl({ root, suffix, index, onPreviousRoot, onNextRoot, onPreviousSuffix, onNextSuffix }) {
  const chordName = formatChordName(root, suffix);
  const suffixLabel = formatSuffix(suffix);
  const qualityLabel = qualityLabels[suffix] || suffix;
  const step = index + 1;
  const suffixTextClasses = ['chord-identity-text', !suffixLabel ? 'chord-identity-text--placeholder' : ''].filter(Boolean).join(' ');

  return (
    <div className="chord-identity-control" aria-label={'Acorde ' + chordName + ': ' + qualityLabel} title={'Acorde ' + chordName + ': ' + qualityLabel}>
      <ArrowControlButton direction="left" className="chord-quality-button" ariaLabel={'Sufixo anterior do acorde ' + step} onClick={onPreviousSuffix} size={18} />
      <span className="chord-identity-label">
        <ChordPartControl
          className="chord-identity-part chord-identity-root"
          label={'Nota do acorde ' + step}
          value={root}
          title={'Nota: ' + root}
          previousLabel={'Nota anterior do acorde ' + step}
          nextLabel={'Próxima nota do acorde ' + step}
          onPrevious={onPreviousRoot}
          onNext={onNextRoot}
        />
        <span className="chord-identity-part chord-identity-suffix" aria-label={'Sufixo do acorde ' + step} title={'Qualidade: ' + qualityLabel}>
          <span className={suffixTextClasses} data-placeholder={!suffixLabel ? 'maj' : undefined}>{suffixLabel}</span>
        </span>
      </span>
      <ArrowControlButton direction="right" className="chord-quality-button" ariaLabel={'Próximo sufixo do acorde ' + step} onClick={onNextSuffix} size={18} />
    </div>
  );
}

export default ChordIdentityControl;
