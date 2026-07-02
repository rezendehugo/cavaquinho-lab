import { RotateCcw, Trash2 } from 'lucide-react';
import { formatChordName, qualityLabels } from '../chordDisplay';
import ChordShapeCard from './ChordShapeCard';
import { ArrowControlButton, IconControlButton } from './IconControls';

function ChordStepper({ label, value, previousLabel, nextLabel, onPrevious, onNext }) {
  return (
    <div className="chord-stepper" aria-label={label}>
      <ArrowControlButton direction="left" className="chord-stepper-arrow" ariaLabel={previousLabel} onClick={onPrevious} />
      <strong>{value}</strong>
      <ArrowControlButton direction="right" className="chord-stepper-arrow" ariaLabel={nextLabel} onClick={onNext} />
    </div>
  );
}

function SequenceChordStep({ step, index, total, optimizedStep, analysisChord, color, moveStep, removeStep, cycleRoot, cycleSuffix, cycleShape, releaseShape }) {
  const isManual = Number.isInteger(step.positionIndex);
  const chordName = formatChordName(step.key, step.suffix);

  return (
    <article className="lab-card" style={{ '--swatch': color }}>
      <header className="lab-card-header">
        <div>
          <span className="scale-degree">{analysisChord?.numeral || 'acorde ' + (index + 1)}</span>
        </div>
        <div className="card-actions">
          <ArrowControlButton direction="up" className="move-step-button" ariaLabel={'Mover acorde ' + (index + 1) + ' para cima'} disabled={index === 0} onClick={() => moveStep(index, index - 1)} size={15} />
          <ArrowControlButton direction="down" className="move-step-button" ariaLabel={'Mover acorde ' + (index + 1) + ' para baixo'} disabled={index === total - 1} onClick={() => moveStep(index, index + 1)} size={15} />
          <IconControlButton className="remove-step-button" ariaLabel={'Remover acorde ' + (index + 1)} onClick={() => removeStep(index)}>
            <Trash2 aria-hidden="true" size={15} strokeWidth={2.1} />
          </IconControlButton>
        </div>
      </header>

      <div className="chord-editors">
        <ChordStepper
          label={'Nota do acorde ' + (index + 1)}
          value={step.key}
          previousLabel={'Nota anterior do acorde ' + (index + 1)}
          nextLabel={'Próxima nota do acorde ' + (index + 1)}
          onPrevious={() => cycleRoot(index, -1)}
          onNext={() => cycleRoot(index, 1)}
        />
        <ChordStepper
          label={'Sufixo do acorde ' + (index + 1)}
          value={qualityLabels[step.suffix] || step.suffix}
          previousLabel={'Sufixo anterior do acorde ' + (index + 1)}
          nextLabel={'Próximo sufixo do acorde ' + (index + 1)}
          onPrevious={() => cycleSuffix(index, -1)}
          onNext={() => cycleSuffix(index, 1)}
        />
      </div>

      {optimizedStep ? (
        <ChordShapeCard
          as="div"
          className="sequence-shape-card"
          variant="focus"
          chordName={chordName}
          position={optimizedStep.position}
          shapeIndex={optimizedStep.positionIndex}
          shapeTotal={optimizedStep.chord.positions.length}
          actions={isManual ? (
            <button type="button" className="inline-auto icon-button" onClick={() => releaseShape(index)} aria-label={'Usar forma automática do acorde ' + (index + 1)} title="Automático">
              <RotateCcw aria-hidden="true" size={15} strokeWidth={2.2} />
            </button>
          ) : null}
          navigation={{
            previousLabel: 'Forma anterior do acorde ' + (index + 1),
            nextLabel: 'Próxima forma do acorde ' + (index + 1),
            onPrevious: () => cycleShape(index, -1),
            onNext: () => cycleShape(index, 1)
          }}
        />
      ) : null}
    </article>
  );
}

export default SequenceChordStep;
