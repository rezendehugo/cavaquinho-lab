import { memo, useEffect, useRef } from 'react';
import { formatSequenceChord } from '../chordDisplay';

const SequenceChordNavigator = memo(function SequenceChordNavigator({
  sequence,
  currentIndex,
  onSelectOccurrence
}) {
  const itemRefs = useRef([]);
  const focusSelectedRef = useRef(false);

  useEffect(() => {
    const item = itemRefs.current[currentIndex];
    if (typeof item?.scrollIntoView === 'function') {
      item.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
    if (focusSelectedRef.current) {
      item?.querySelector('button')?.focus({ preventScroll: true });
      focusSelectedRef.current = false;
    }
  }, [currentIndex]);

  if (!sequence?.steps.length) return null;

  const handleKeyDown = event => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    focusSelectedRef.current = true;
    const delta = event.key === 'ArrowRight' ? 1 : -1;
    onSelectOccurrence((currentIndex + delta + sequence.steps.length) % sequence.steps.length);
  };

  return <div className="sequence-chord-navigator" role="list" aria-label="Acordes da sequência" onKeyDown={handleKeyDown}>
    {sequence.steps.map((step, index) => {
      const selected = index === currentIndex;
      return <div
        ref={element => { itemRefs.current[index] = element; }}
        key={step.id}
        className={`sequence-chord-occurrence ${selected ? 'is-selected' : ''}`}
        role="listitem"
      >
        <button
          type="button"
          className="sequence-chord-occurrence-main"
          aria-current={selected ? 'step' : undefined}
          aria-label={`Acorde ${index + 1} de ${sequence.steps.length}: ${formatSequenceChord(step)}`}
          title={`Acorde ${index + 1} de ${sequence.steps.length}: ${formatSequenceChord(step)}`}
          onClick={() => onSelectOccurrence(index)}
        >
          <strong>{formatSequenceChord(step)}</strong>
        </button>
      </div>;
    })}
  </div>;
});

export default SequenceChordNavigator;
