import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { formatSequenceChord } from '../chordDisplay';

export default function SequenceChordNavigator({
  sequence,
  resolvedSteps,
  currentIndex,
  onSelectOccurrence,
  onSelectShape
}) {
  const itemRefs = useRef([]);

  useEffect(() => {
    const item = itemRefs.current[currentIndex];
    if (typeof item?.scrollIntoView === 'function') {
      item.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [currentIndex]);

  if (!sequence?.steps.length) return null;

  return <div className="sequence-chord-navigator" role="list" aria-label="Acordes da sequência">
    {sequence.steps.map((step, index) => {
      const resolved = resolvedSteps[index];
      const total = resolved?.chord?.positions?.length || 0;
      const activeShape = Number.isInteger(step.positionIndex)
        ? step.positionIndex
        : (resolved?.positionIndex ?? 0);
      const selected = index === currentIndex;
      const selectShape = (direction) => {
        if (!total) return;
        onSelectShape(index, (activeShape + direction + total) % total);
      };
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
          <span>{index + 1}</span>
          <strong>{formatSequenceChord(step)}</strong>
        </button>
        {selected && total ? <div className="sequence-inline-shapes" aria-label={`Forma de ${formatSequenceChord(step)}`}>
          <button type="button" aria-label="Forma anterior" title="Forma anterior" onClick={() => selectShape(-1)}><ChevronLeft size={15} /></button>
          <span title={Number.isInteger(step.positionIndex) ? 'Forma escolhida para esta ocorrência' : 'Forma automática'}>{activeShape + 1}/{total}</span>
          <button type="button" aria-label="Próxima forma" title="Próxima forma" onClick={() => selectShape(1)}><ChevronRight size={15} /></button>
        </div> : null}
      </div>;
    })}
  </div>;
}
