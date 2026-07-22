import { useState } from 'react';
import { X } from 'lucide-react';
import { formatSequenceChord } from '../chordDisplay';
import { getVoicingCompleteness } from '../domain/chordTheory';
import ChordIdentityControl from './ChordIdentityControl';
import ChordShapeCard from './ChordShapeCard';
import { IconControlButton } from './IconControls';
import SequenceShapePicker from './SequenceShapePicker';

const dragDataType = 'text/x-cavaquinho-sequence-step';
const interactiveSelector = 'button, input, select, textarea, a, [role="button"], .chord-identity-control';

const isInteractiveDragSource = (target) => target instanceof Element && Boolean(target.closest(interactiveSelector));

function SequenceChordStep({ step, index, stepCount, isLoopStart, optimizedStep, analysisChord, color, moveStepById, moveStep, removeStep, cycleRoot, cycleSuffix, cycleShape, setShape, availableSuffixes, setChordIdentity, setChordSuffix }) {
  const [dragState, setDragState] = useState('idle');
  const [shapePickerOpen, setShapePickerOpen] = useState(false);
  const chordName = formatSequenceChord(step);
  const cardClasses = ['lab-card', dragState === 'dragging' ? 'is-dragging' : '', dragState === 'over' ? 'is-drag-over' : ''].filter(Boolean).join(' ');

  const handleDragStart = (event) => {
    if (isInteractiveDragSource(event.target)) {
      event.preventDefault();
      return;
    }

    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData(dragDataType, step.id);
    event.dataTransfer.setData('text/plain', step.id);
    setDragState('dragging');
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    if (dragState !== 'dragging') setDragState('over');
  };

  const handleDragLeave = (event) => {
    if (event.currentTarget.contains(event.relatedTarget)) return;
    setDragState('idle');
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const draggedStepId = event.dataTransfer.getData(dragDataType) || event.dataTransfer.getData('text/plain');
    setDragState('idle');
    if (!draggedStepId || draggedStepId === step.id) return;
    moveStepById(draggedStepId, index);
  };

  const handleDragEnd = () => setDragState('idle');

  return (
    <article
      className={cardClasses}
      data-step-index={index}
      style={{ '--swatch': color }}
      draggable
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onDragEnd={handleDragEnd}
    >
      <header className="lab-card-header">
        <div>
          <span className="scale-degree">{analysisChord?.numeral || 'acorde ' + (index + 1)}</span>
          {isLoopStart ? <span className="sequence-loop-marker">Início da repetição</span> : null}
        </div>
        <div className="card-actions">
          <IconControlButton className="reorder-step-button" ariaLabel={'Mover acorde ' + (index + 1) + ' para trás'} disabled={index === 0} onClick={() => moveStep(index, index - 1)}>
            <span aria-hidden="true">←</span>
          </IconControlButton>
          <IconControlButton className="reorder-step-button" ariaLabel={'Mover acorde ' + (index + 1) + ' para frente'} disabled={index === stepCount - 1} onClick={() => moveStep(index, index + 1)}>
            <span aria-hidden="true">→</span>
          </IconControlButton>
          <IconControlButton className="remove-step-button" ariaLabel={'Remover acorde ' + (index + 1)} onClick={() => removeStep(index)}>
            <X aria-hidden="true" size={15} strokeWidth={2.1} />
          </IconControlButton>
        </div>
      </header>

      <div className="sequence-card-main">
        <ChordIdentityControl
          root={step.key}
          displayRoot={step.displayKey}
          suffix={step.suffix}
          index={index}
          availableSuffixes={availableSuffixes}
          onPreviousRoot={() => cycleRoot(index, -1)}
          onNextRoot={() => cycleRoot(index, 1)}
          onPreviousSuffix={() => cycleSuffix(index, -1)}
          onNextSuffix={() => cycleSuffix(index, 1)}
          onCommitChord={(key, suffix, displayKey) => setChordIdentity(index, key, suffix, displayKey)}
          onCommitSuffix={(suffix) => setChordSuffix(index, suffix)}
        />

        {optimizedStep ? (
          <><ChordShapeCard
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
            voicingStatus={getVoicingCompleteness(analysisChord?.theory)}
            navigation={{
              previousLabel: 'Forma anterior do acorde ' + (index + 1),
              nextLabel: 'Próxima forma do acorde ' + (index + 1),
              onPrevious: () => cycleShape(index, -1),
              onNext: () => cycleShape(index, 1)
            }}
          /><div className="shape-selection-summary"><button type="button" onClick={() => setShapePickerOpen(true)}>Escolher forma</button><span>{Number.isInteger(step.positionIndex) ? 'Forma ' + (step.positionIndex + 1) + ' fixada' : 'Forma automática'}</span></div><SequenceShapePicker open={shapePickerOpen} step={step} chord={optimizedStep.chord} selectedIndex={step.positionIndex} onSelect={positionIndex => setShape(index, positionIndex)} onClose={() => setShapePickerOpen(false)} /></>
        ) : null}
      </div>
    </article>
  );
}

export default SequenceChordStep;
