import { useMemo } from 'react';
import { ChevronLeft, ChevronRight, Metronome, Pause, Play, Repeat2, Timer, X } from 'lucide-react';
import { formatSequenceChord } from '../chordDisplay';
import { getSequenceCarouselItems } from '../domain/sequencePractice';
import BpmInput from '../features/metronome/BpmInput';
import ChordShapeCard from './ChordShapeCard';
import SequenceDurationPanel from './SequenceDurationPanel';
import FocusedPracticePortal from './FocusedPracticePortal';

function PracticeCarouselCard({ item, step, resolvedStep }) {
  const chordName = formatSequenceChord(step);
  return <article className={'sequence-film-card sequence-film-card--' + item.role} data-step-index={item.index} aria-current={item.role === 'current' ? 'true' : undefined}>
    <ChordShapeCard
      as="div"
      variant="focus"
      chordName={chordName}
      position={resolvedStep.position}
      shapeIndex={resolvedStep.positionIndex}
      shapeTotal={resolvedStep.chord.positions.length}
      showShapeCode={false}
      shapeIndexPlacement="bottom"
    />
  </article>;
}

export default function SequencePracticeOverlay({ sequence, resolvedSteps, filmState, playing, status, beatsRemaining, metronome, onBpmChange, durationsOpen, onToggleDurations, onChangeDuration, onTogglePlay, onPrevious, onNext, onExit }) {
  const carouselItems = useMemo(() => getSequenceCarouselItems(filmState.cardIndex, sequence.steps.length, sequence.loopStartIndex, filmState.hasCompletedFirstPass), [filmState.cardIndex, filmState.hasCompletedFirstPass, sequence.loopStartIndex, sequence.steps.length]);

  const currentStep = sequence.steps[filmState.cardIndex];
  const progress = currentStep ? ((filmState.cardIndex + 1) / sequence.steps.length) * 100 : 0;

  return <FocusedPracticePortal className="sequence-practice-overlay" ariaLabel="Prática imersiva de sequência" onEscape={() => durationsOpen ? onToggleDurations(false) : onExit()}>
    <header className="sequence-practice-overlay-header">
      <div>
        <p className="eyebrow">Filme de acordes</p>
        <h1>{sequence.title}</h1>
        {sequence.presetId ? <p className="sequence-preset-meta">{sequence.tonic} · {sequence.practiceBpm} BPM{sequence.loopStartIndex > 0 ? ' · repete do acorde ' + (sequence.loopStartIndex + 1) : ''}</p> : null}
        <p>{filmState.cardIndex + 1} de {sequence.steps.length} · {beatsRemaining} {beatsRemaining === 1 ? 'batida restante' : 'batidas restantes'}</p>
      </div>
      <div className="sequence-practice-overlay-tools">
        <div className="sequence-overlay-tempo"><Metronome aria-hidden="true" size={20} /><BpmInput value={metronome.bpm} onChange={onBpmChange} ariaLabel="BPM da prática imersiva" variant="practice" /><span>{metronome.beatsPerMeasure}/4</span></div>
        <button type="button" onClick={() => onToggleDurations(true)}><Timer aria-hidden="true" size={18} />Durações</button>
        <button type="button" onClick={onExit} autoFocus><X aria-hidden="true" size={18} />Sair</button>
      </div>
    </header>

    <main className="sequence-practice-stage">
      <div className="sequence-film-carousel" aria-label="Carrossel da sequência">
        {carouselItems.map(item => <PracticeCarouselCard key={item.index} item={item} step={sequence.steps[item.index]} resolvedStep={resolvedSteps[item.index]} />)}
      </div>
      <div className="sequence-film-progress" aria-hidden="true"><span style={{ width: progress + '%' }} /></div>
      <p className="sequence-practice-live" aria-live="polite">{status}</p>
    </main>

    <footer className="sequence-practice-transport" aria-label="Controles da prática">
      <button type="button" onClick={onPrevious} aria-label="Acorde anterior"><ChevronLeft aria-hidden="true" /></button>
      <button type="button" className="sequence-transport-primary" onClick={onTogglePlay} aria-label={playing ? 'Pausar prática' : 'Continuar prática'}>{playing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}</button>
      <button type="button" onClick={onNext} aria-label="Próximo acorde"><ChevronRight aria-hidden="true" /></button>
      <button type="button" aria-label="Repetição contínua ativada" aria-pressed="true" disabled><Repeat2 aria-hidden="true" /></button>
    </footer>

    <SequenceDurationPanel sequence={sequence} currentIndex={filmState.cardIndex} open={durationsOpen} onClose={() => onToggleDurations(false)} onChange={onChangeDuration} />
  </FocusedPracticePortal>;
}
