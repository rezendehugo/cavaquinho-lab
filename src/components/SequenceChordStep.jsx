import { CSS } from '@dnd-kit/utilities';
import { useSortable } from '@dnd-kit/sortable';
import { GripVertical, RotateCcw, X } from 'lucide-react';
import { formatChordName } from '../chordDisplay';
import ChordIdentityControl from './ChordIdentityControl';
import ChordShapeCard from './ChordShapeCard';
import { IconControlButton } from './IconControls';

function SequenceChordStep({ step, index, optimizedStep, analysisChord, color, moveStep, removeStep, cycleRoot, cycleSuffix, cycleShape, releaseShape }) {
  const { attributes, listeners, setActivatorNodeRef, setNodeRef, transform, transition, isDragging, isOver } = useSortable({ id: step.id });
  const isManual = Number.isInteger(step.positionIndex);
  const chordName = formatChordName(step.key, step.suffix);
  const cardClasses = ['lab-card', isDragging ? 'is-dragging' : '', isOver ? 'is-drag-over' : ''].filter(Boolean).join(' ');
  const cardStyle = {
    '--swatch': color,
    transform: CSS.Transform.toString(transform),
    transition
  };
  const handleDragHandleKeyDown = (event) => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      moveStep(index, index - 1);
      return;
    }
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      moveStep(index, index + 1);
      return;
    }
    if (listeners?.onKeyDown) listeners.onKeyDown(event);
  };

  return (
    <article ref={setNodeRef} className={cardClasses} style={cardStyle}>
      <header className="lab-card-header">
        <div className="card-title-group">
          <button
            type="button"
            className="drag-handle-button"
            aria-label="Reordenar acorde"
            title="Reordenar acorde"
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            onKeyDown={handleDragHandleKeyDown}
          >
            <GripVertical aria-hidden="true" size={15} strokeWidth={2.1} />
          </button>
          <span className="scale-degree">{analysisChord?.numeral || 'acorde ' + (index + 1)}</span>
        </div>
        <div className="card-actions">
          {isManual ? (
            <IconControlButton className="reset-shape-button" ariaLabel={'Usar forma automática do acorde ' + (index + 1)} title="Automático" onClick={() => releaseShape(index)}>
              <RotateCcw aria-hidden="true" size={15} strokeWidth={2.2} />
            </IconControlButton>
          ) : null}
          <IconControlButton className="remove-step-button" ariaLabel={'Remover acorde ' + (index + 1)} onClick={() => removeStep(index)}>
            <X aria-hidden="true" size={15} strokeWidth={2.1} />
          </IconControlButton>
        </div>
      </header>

      <div className="sequence-card-main">
        <ChordIdentityControl
          root={step.key}
          suffix={step.suffix}
          index={index}
          onPreviousRoot={() => cycleRoot(index, -1)}
          onNextRoot={() => cycleRoot(index, 1)}
          onPreviousSuffix={() => cycleSuffix(index, -1)}
          onNextSuffix={() => cycleSuffix(index, 1)}
        />

        {optimizedStep ? (
          <ChordShapeCard
            as="div"
            className="sequence-shape-card"
            variant="focus"
            chordName={chordName}
            showName={false}
            showShapeCode={false}
            shapeIndexPlacement="bottom"
            position={optimizedStep.position}
            shapeIndex={optimizedStep.positionIndex}
            shapeTotal={optimizedStep.chord.positions.length}
            navigation={{
              previousLabel: 'Forma anterior do acorde ' + (index + 1),
              nextLabel: 'Próxima forma do acorde ' + (index + 1),
              onPrevious: () => cycleShape(index, -1),
              onNext: () => cycleShape(index, 1)
            }}
          />
        ) : null}
      </div>
    </article>
  );
}

export default SequenceChordStep;
