import { Download, Play } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { formatSequenceChord } from '../chordDisplay';
import { cavaquinhoChords } from '../domain/chords';
import { buildSequencePractice, getSequenceBeatState } from '../domain/sequencePractice';
import { buildChordMarkdown, downloadMarkdown } from '../domain/practiceExports';
import { useSharedMetronome } from '../features/metronome/MetronomeContext';
import BpmInput from '../features/metronome/BpmInput';
import { loadActiveSequenceId, loadSequences, sequencesStorageKey, writeStorage } from '../storage';
import FretboardGrid from './FretboardGrid';
import FretboardPracticeOverlay from './FretboardPracticeOverlay';
import SequenceChordNavigator from './SequenceChordNavigator';

const positionKey = (position) => position.stringIndex + ':' + position.fret;

export default function SequencePracticePanel() {
  const metronome = useSharedMetronome();
  const [sequences, setSequences] = useState(loadSequences);
  const [sequenceId, setSequenceId] = useState(() => loadActiveSequenceId(loadSequences()));
  const [beatsPerChord, setBeatsPerChord] = useState(4);
  const [practicing, setPracticing] = useState(false);
  const [focusedOpen, setFocusedOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [beatsRemaining, setBeatsRemaining] = useState(4);
  const [playbackStartIndex, setPlaybackStartIndex] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [playbackOriginPulse, setPlaybackOriginPulse] = useState(0);
  const practiceButtonRef = useRef(null);
  const sequence = sequences.find(item => item.id === sequenceId) || sequences[0];
  const resolved = useMemo(() => buildSequencePractice(sequence?.steps || [], cavaquinhoChords), [sequence]);
  const countIn = metronome.beatsPerMeasure;
  const practicePulse = Math.max(0, metronome.pulseIndex - countIn);
  const current = resolved.steps[currentIndex];
  const previous = resolved.steps.length ? resolved.steps[(currentIndex - 1 + resolved.steps.length) % resolved.steps.length] : null;
  const next = resolved.steps.length ? resolved.steps[(currentIndex + 1) % resolved.steps.length] : null;
  const currentKeys = new Set((current?.positions || []).map(positionKey));
  const previousKeys = new Set((previous?.positions || []).map(positionKey));
  const nextKeys = new Set((next?.positions || []).map(positionKey));
  const canPractice = resolved.steps.length > 0 && !resolved.missing.length;

  const stopPractice = () => {
    if (practicing || metronome.isRunning) metronome.stop();
    setPracticing(false);
  };

  const exitPractice = () => {
    stopPractice();
    setFocusedOpen(false);
    setCurrentIndex(0);
    setHasStarted(false);
    requestAnimationFrame(() => practiceButtonRef.current?.focus());
  };

  const startPractice = async () => {
    if (!canPractice) return;
    setCurrentIndex(0);
    setPlaybackStartIndex(0);
    setPlaybackOriginPulse(0);
    setBeatsRemaining(beatsPerChord);
    setHasStarted(false);
    setFocusedOpen(true);
    if (await metronome.start().catch(() => false)) setPracticing(true);
    else setFocusedOpen(false);
  };

  const togglePractice = async () => {
    if (practicing) return stopPractice();
    setPlaybackStartIndex(currentIndex);
    setPlaybackOriginPulse(practicePulse);
    if (await metronome.start().catch(() => false)) setPracticing(true);
  };

  useEffect(() => {
    if (!practicing || practicePulse < 1 || !resolved.steps.length) return;
    const relativePulse = playbackOriginPulse ? Math.max(1, practicePulse - playbackOriginPulse + 1) : practicePulse;
    const state = getSequenceBeatState(relativePulse, resolved.steps.length, beatsPerChord);
    setHasStarted(true);
    setCurrentIndex((playbackStartIndex + state.chordIndex) % resolved.steps.length);
    setBeatsRemaining(state.beatsRemaining);
  }, [beatsPerChord, playbackOriginPulse, playbackStartIndex, practicePulse, practicing, resolved.steps.length]);

  const selectSequence = (nextId) => {
    stopPractice();
    setCurrentIndex(0);
    setSequenceId(nextId);
  };

  const selectShape = (stepIndex, positionIndex) => {
    if (!sequence) return;
    const nextSequences = sequences.map(item => item.id !== sequence.id ? item : {
      ...item,
      steps: item.steps.map((step, index) => index === stepIndex ? { ...step, positionIndex } : step)
    });
    setSequences(nextSequences);
    writeStorage(sequencesStorageKey, JSON.stringify(nextSequences));
  };

  const selectOccurrence = index => {
    setCurrentIndex(index);
    if (practicing) {
      setPlaybackStartIndex(index);
      setPlaybackOriginPulse(practicePulse);
      setBeatsRemaining(beatsPerChord);
    }
  };

  const instruction = practicing && !hasStarted
    ? 'Contagem: ' + metronome.pulseIndex + ' de ' + countIn
    : current ? formatSequenceChord(current) + ' · acorde ' + (currentIndex + 1) + ' de ' + resolved.steps.length + ' · troque em ' + beatsRemaining + (beatsRemaining === 1 ? ' batida' : ' batidas')
      : 'Escolha uma sequência com acordes para começar.';

  return <div className="sequence-practice-panel">
    <div className="fretboard-control-panel">
      <div className="scale-explorer sequence-practice-controls">
        <div className="sequence-practice-options">
          <label><span>Sequência</span><select aria-label="Sequência para praticar" value={sequence?.id || ''} onChange={event => selectSequence(event.target.value)}>{sequences.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
          <label><span>Batidas por acorde</span><select aria-label="Batidas por acorde" value={beatsPerChord} onChange={event => { stopPractice(); setBeatsPerChord(Number(event.target.value)); }}>{[1, 2, 4].map(value => <option key={value} value={value}>{value}</option>)}</select></label>
        </div>
        <SequenceChordNavigator
          sequence={sequence}
          resolvedSteps={resolved.steps}
          currentIndex={currentIndex}
          onSelectOccurrence={selectOccurrence}
          onSelectShape={selectShape}
        />
        {resolved.missing.length ? <p className="validation-error" role="status">Há acordes sem forma disponível nesta sequência.</p> : null}
        {!sequence?.steps.length ? <a className="practice-sequence-link" href={import.meta.env.BASE_URL + 'sequences'}>Adicionar acordes em Sequências</a> : null}
        <div className="scale-practice"><div><BpmInput value={metronome.bpm} onChange={metronome.setBpm} ariaLabel="BPM da prática de sequência" variant="practice" /><small>{beatsPerChord} {beatsPerChord === 1 ? 'batida' : 'batidas'} por acorde · contagem de {countIn} tempos</small></div><button ref={practiceButtonRef} type="button" data-ui-text-reason="workflow" className="scale-practice-button" onClick={startPractice} disabled={!canPractice}><Play aria-hidden="true" size={16} />Praticar sequência</button></div>
        <p className="path-progress">{instruction}</p>
        <p className="visually-hidden" aria-live="polite">{instruction}</p>
        {current ? <p className="sequence-next-chord">Próximo: {formatSequenceChord(next)}</p> : null}
        {sequence?.steps.length ? <button type="button" data-ui-text-reason="workflow" className="practice-export-button" onClick={() => downloadMarkdown(buildChordMarkdown(sequence))}><Download size={15} /> Exportar acordes</button> : null}
      </div>
    </div>
    <div className="scale-visual-legend" aria-label="Legenda da sequência"><span className="legend-current">Acorde atual</span><span className="legend-next">Próximo acorde</span><span className="legend-played">Acorde anterior</span></div>
    <FretboardGrid ariaLabel="Notas pressionadas da sequência" mutedStrings={current?.mutedStrings || []} getPositionState={position => {
      const key = positionKey(position);
      return {
        highlighted: currentKeys.has(key),
        inScale: false,
        path: currentKeys.has(key),
        current: focusedOpen && hasStarted && currentKeys.has(key),
        next: focusedOpen && hasStarted && nextKeys.has(key),
        played: focusedOpen && hasStarted && previousKeys.has(key)
      };
    }} />
    {focusedOpen ? <FretboardPracticeOverlay title={sequence?.title || 'Sequência'} eyebrow="Prática de sequência" progress={(currentIndex + 1) + ' de ' + resolved.steps.length + ' · ' + beatsRemaining + (beatsRemaining === 1 ? ' batida restante' : ' batidas restantes')} instruction={instruction} playing={practicing} metronome={metronome} onTogglePlay={togglePractice} onExit={exitPractice} legend={<div className="scale-visual-legend" aria-label="Legenda da sequência focada"><span className="legend-current">Acorde atual</span><span className="legend-next">Próximo acorde</span><span className="legend-played">Acorde anterior</span></div>}><FretboardGrid ariaLabel="Notas pressionadas da sequência em prática focada" mutedStrings={current?.mutedStrings || []} getPositionState={position => { const key = positionKey(position); return { highlighted: currentKeys.has(key), path: currentKeys.has(key), current: hasStarted && currentKeys.has(key), next: hasStarted && nextKeys.has(key), played: hasStarted && previousKeys.has(key) }; }} /></FretboardPracticeOverlay> : null}
  </div>;
}
