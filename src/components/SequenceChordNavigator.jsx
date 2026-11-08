import { memo, useEffect, useMemo, useRef } from 'react';
import { formatSequenceChord } from '../chordDisplay';
import { getSequenceChordCatalog } from '../domain/sequenceChordCatalog';

const SequenceChordNavigator = memo(function SequenceChordNavigator({
  sequence,
  currentIndex,
  onSelectOccurrence,
  showOccurrences = false
}) {
  const itemRefs = useRef([]);
  const focusSelectedRef = useRef(false);
  const catalog = useMemo(() => showOccurrences
    ? (sequence?.steps || []).map((step, index) => ({ step, firstIndex: index, indexes: [index] }))
    : getSequenceChordCatalog(sequence?.steps || []), [sequence?.steps, showOccurrences]);
  const selectedCatalogIndex = catalog.findIndex(item => item.indexes.includes(currentIndex));

  useEffect(() => {
    const item = itemRefs.current[selectedCatalogIndex];
    if (typeof item?.scrollIntoView === 'function') {
      item.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
    if (focusSelectedRef.current) {
      item?.querySelector('button')?.focus({ preventScroll: true });
      focusSelectedRef.current = false;
    }
  }, [selectedCatalogIndex]);

  if (!sequence?.steps.length) return null;

  const handleKeyDown = event => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    focusSelectedRef.current = true;
    const delta = event.key === 'ArrowRight' ? 1 : -1;
    const nextCatalogIndex = (selectedCatalogIndex + delta + catalog.length) % catalog.length;
    onSelectOccurrence(catalog[nextCatalogIndex].firstIndex);
  };

  return <div className="sequence-chord-navigator" role="list" aria-label="Acordes da sequência" onKeyDown={handleKeyDown}>
    {catalog.map(({ step, firstIndex, indexes }, catalogIndex) => {
      const selected = indexes.includes(currentIndex);
      const chordName = formatSequenceChord(step);
      const occurrenceLabel = indexes.length === 1 ? '1 ocorrência' : `${indexes.length} ocorrências`;
      return <div
        ref={element => { itemRefs.current[catalogIndex] = element; }}
        key={step.id}
        className={`sequence-chord-occurrence ${selected ? 'is-selected' : ''}`}
        role="listitem"
      >
        <button
          type="button"
          className="sequence-chord-occurrence-main"
          aria-current={selected ? 'step' : undefined}
          aria-label={showOccurrences ? `Acorde ${firstIndex + 1} de ${catalog.length}: ${chordName}` : `${chordName}, ${occurrenceLabel}`}
          title={showOccurrences ? `${chordName} · acorde ${firstIndex + 1} de ${catalog.length}` : `${chordName} · ${occurrenceLabel}`}
          onClick={() => onSelectOccurrence(firstIndex)}
        >
          <strong>{chordName}</strong>
        </button>
      </div>;
    })}
  </div>;
});

export default SequenceChordNavigator;
