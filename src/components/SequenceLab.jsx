import { useEffect, useMemo, useRef, useState } from 'react';
import { formatChordName, formatSequenceChord } from '../chordDisplay';
import { cavaquinhoChords, getAvailableSuffixes } from '../domain/chords';
import { advanceSequenceFilm, moveSequenceFilm, normalizePracticeBeats } from '../domain/sequencePractice';
import { useSharedMetronome } from '../features/metronome/MetronomeContext';
import { analyzeSequence, buildExercises, getColorForChord } from '../harmony';
import { optimizeSequence } from '../progressionOptimizer';
import { chromaticKeys, createSequence, createSequenceStep, defaultSequences, MAX_SEQUENCE_STEPS, normalizeLoopStartIndex, reorderSequence, suffixCycle } from '../sequences';
import { activeSequenceStorageKey, loadActiveSequenceId, loadSequences, sequencesStorageKey, storageErrorMessage, writeStorage } from '../storage';
import { AddChordSlot, AddSequenceButton } from './SequenceActions';
import SequenceChordStep from './SequenceChordStep';
import SequencePracticeBar from './SequencePracticeBar';
import SequenceDurationPanel from './SequenceDurationPanel';
import SequencePracticeOverlay from './SequencePracticeOverlay';
import SequencePresetDialog from './SequencePresetDialog';
import { BookOpen, Trash2 } from 'lucide-react';

const colorModes = [
  { id: 'graus', label: 'Graus da escala' },
  { id: 'desligado', label: 'Desligado' },
  { id: 'notas', label: 'Notas cromáticas' },
  { id: 'qualidade', label: 'Qualidade do acorde' },
  { id: 'funcao', label: 'Função harmônica' },
  { id: 'personalizadas', label: 'Cores personalizadas' }
];

const wrapIndex = (index, length) => (index + length) % length;
const getSequenceText = (steps) => steps.length ? steps.map(formatSequenceChord).join(' → ') : 'Nenhum acorde ainda';

const getNextValue = (values, currentValue, direction) => values[wrapIndex(values.indexOf(currentValue) + direction, values.length)];

const getNextSuffix = (key, currentSuffix, direction) => {
  const available = suffixCycle.filter(suffix => getAvailableSuffixes(key).includes(suffix));
  if (!available.length) return currentSuffix;
  const currentIndex = available.includes(currentSuffix) ? available.indexOf(currentSuffix) : 0;
  return available[wrapIndex(currentIndex + direction, available.length)];
};

function SequenceManager({ sequences, activeSequenceId, setActiveSequenceId, createNewSequence, openPresets, deleteSequence }) {
  return (
    <div className="sequence-manager" aria-label="Minhas sequências">
      <label className="sequence-picker"><span>Minha sequência</span><select aria-label="Escolher sequência" value={activeSequenceId} onChange={(event) => setActiveSequenceId(event.target.value)}>
        {sequences.map(sequence => <option key={sequence.id} value={sequence.id}>{sequence.title}</option>)}
      </select></label>
      <AddSequenceButton onClick={createNewSequence} />
      <button type="button" className="preset-sequence-button" onClick={openPresets}><BookOpen aria-hidden="true" size={17} />Exercícios prontos</button>
      <button type="button" className="delete-sequence-button icon-button" onClick={deleteSequence} disabled={sequences.length === 1} aria-label="Excluir sequência atual" title="Excluir sequência atual">
        <Trash2 aria-hidden="true" size={16} strokeWidth={2.1} />
      </button>
    </div>
  );
}

function SequenceHeader({ sequence, setTitle, colorMode, setColorMode }) {
  return (
    <header className="lab-header">
      <div>
        <p className="eyebrow">Prática interativa</p>
        <input className="sequence-title-input" aria-label="Nome da sequência" value={sequence.title} onChange={(event) => setTitle(event.target.value)} />
        <div className="sequence-path" aria-label="Sequência atual">{getSequenceText(sequence.steps)}</div>
      </div>
      <div className="lab-controls">
        <label><span>Cor</span><select aria-label="Modo de cor" value={colorMode} onChange={(event) => setColorMode(event.target.value)}>{colorModes.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
      </div>
    </header>
  );
}

function EmptySequence({ addStep }) {
  return (
    <div className="empty-sequence">
      <AddChordSlot onClick={addStep} />
    </div>
  );
}

function LabSummary({ analysis, exercises, sequence, colorMode }) {
  return (
    <details className="study-disclosure">
      <summary>Entender e praticar esta sequência</summary>
      <div className="study-sections" aria-label="Estudo da sequência">
      <section>
        <h2>Teoria</h2>
        <p>{analysis.summary}</p>
        <p>{analysis.tension}</p>
        {analysis.chords.length ? <div className="chord-theory-list">{analysis.chords.map(chord => (
          <div key={chord.id} className="chord-theory-item">
            <h3>{chord.name} <span>{chord.theory?.family}</span></h3>
            {chord.theory ? <>
              <p><strong>Estrutura:</strong> {chord.theory.notes.join(' · ')}.</p>
              <p><strong>Forma selecionada:</strong> {chord.theory.playedNotes.join(' · ')}.
                {chord.theory.missingNotes.length ? ' Omite ' + chord.theory.missingNotes.join(', ') + ' nesta digitação.' : ' Contém todas as classes de nota do acorde.'}</p>
              {chord.theory.bassNote ? <p><strong>Baixo soando:</strong> {chord.theory.bassNote}{chord.theory.inversion ? ` — uma inversão de ${chord.name}.` : ' — a fundamental está no baixo.'}</p> : null}
              {chord.theory.aliases.length ? <p><strong>Grafias usuais:</strong> {chord.theory.aliases.join(', ')}.</p> : null}
              {chord.theory.equivalents.length ? <p><strong>Mesmas notas, outro nome:</strong> {chord.theory.equivalents.slice(0, 4).map(item => formatChordName(item.key, item.suffix)).join(', ')}. O contexto e o baixo definem a melhor leitura.</p> : null}
              {chord.theory.symmetry ? <p><strong>Simetria:</strong> repete-se a cada {chord.theory.symmetry} semitons; qualquer nota do conjunto pode ser reinterpretada como fundamental.</p> : null}
            </> : null}
            <p>{chord.advice}</p>
          </div>
        ))}</div> : <p>Adicione acordes para ver tríades, tétrades, equivalências e notas comuns.</p>}
      </section>
      <section>
        <h2>Harmonia em Cores</h2>
        <p>Escolha um modo de cor para enxergar a sequência por grau, nota, qualidade ou função harmônica.</p>
        <p className="theory-principle">Equivalência descreve as mesmas notas; substituição descreve outra sonoridade com função semelhante. A análise não confunde essas duas relações.</p>
        <div className="color-timeline" aria-label="Linha de cores da sequência">
          {sequence.steps.length ? sequence.steps.map((step, index) => <span key={step.id} style={{ '--swatch': getColorForChord(step, analysis.chords[index], colorMode, analysis.keyCenter) }}>{formatChordName(step.key, step.suffix)}</span>) : <span style={{ '--swatch': '#d7dde5' }}>Sem acordes</span>}
        </div>
      </section>
      <section>
        <h2>Exercícios</h2>
        <div className="exercise-list">
          {exercises.slice(0, 4).map(exercise => (
            <details key={exercise.title}>
              <summary>{exercise.prompt}</summary>
              <p>{exercise.answer}</p>
            </details>
          ))}
        </div>
      </section>
      </div>
    </details>
  );
}

function SequenceLab() {
  const metronome = useSharedMetronome();
  const [sequences, setSequences] = useState(loadSequences);
  const [activeSequenceId, setActiveSequenceId] = useState(() => loadActiveSequenceId(loadSequences()));
  const [colorMode, setColorMode] = useState('graus');
  const [storageError, setStorageError] = useState('');
  const [visibleCard, setVisibleCard] = useState(0);
  const [focusAfterUpdate, setFocusAfterUpdate] = useState(null);
  const [isPracticing, setIsPracticing] = useState(false);
  const [practiceOpen, setPracticeOpen] = useState(false);
  const [durationsOpen, setDurationsOpen] = useState(false);
  const [presetDialogOpen, setPresetDialogOpen] = useState(false);
  const [filmState, setFilmState] = useState({ cardIndex: 0, beatInCard: 0, hasCompletedFirstPass: false });
  const cardRowRef = useRef(null);
  const practiceStartRef = useRef(null);
  const lastPulseRef = useRef(0);

  const activeSequence = sequences.find(sequence => sequence.id === activeSequenceId) || sequences[0] || defaultSequences[0];
  const optimized = useMemo(() => optimizeSequence(activeSequence.steps, cavaquinhoChords), [activeSequence.steps]);
  const sequenceShapes = optimized.missing.length ? activeSequence.steps.map(() => null) : optimized.steps;
  const missingShapes = activeSequence.steps.filter((_step, index) => !sequenceShapes[index]);
  const analysis = useMemo(() => analyzeSequence(activeSequence.steps, optimized.steps), [activeSequence.steps, optimized.steps]);
  const exercises = useMemo(() => buildExercises(activeSequence.steps, analysis, optimized.steps), [activeSequence.steps, analysis, optimized.steps]);
  const practiceDurations = useMemo(() => activeSequence.steps.map(step => normalizePracticeBeats(step.practiceBeats)), [activeSequence.steps]);
  const countIn = metronome.beatsPerMeasure;
  const practicePulse = Math.max(0, metronome.pulseIndex - countIn);

  useEffect(() => {
    setStorageError(writeStorage(sequencesStorageKey, JSON.stringify(sequences)).ok ? '' : storageErrorMessage);
  }, [sequences]);

  useEffect(() => {
    if (!writeStorage(activeSequenceStorageKey, activeSequence.id).ok) setStorageError(storageErrorMessage);
  }, [activeSequence.id]);

  useEffect(() => {
    if (focusAfterUpdate === null) return;
    const inputs = cardRowRef.current?.querySelectorAll('.chord-identity-input');
    const rootInputs = Array.from(inputs || []).filter((_input, index) => index % 2 === 0);
    (rootInputs[Math.min(focusAfterUpdate, rootInputs.length - 1)] || cardRowRef.current?.querySelector('.add-lab-card'))?.focus();
    setFocusAfterUpdate(null);
  }, [activeSequence.steps, focusAfterUpdate]);

  useEffect(() => {
    if (!isPracticing || metronome.pulseIndex === lastPulseRef.current) return;
    const previousPracticePulse = Math.max(0, lastPulseRef.current - countIn);
    const nextPracticePulse = Math.max(0, metronome.pulseIndex - countIn);
    const elapsedPulses = nextPracticePulse - previousPracticePulse;
    lastPulseRef.current = metronome.pulseIndex;
    if (elapsedPulses <= 0) return;
    setFilmState(current => {
      let next = current;
      for (let index = 0; index < elapsedPulses; index += 1) next = advanceSequenceFilm(next, practiceDurations, activeSequence.loopStartIndex);
      return next;
    });
  }, [activeSequence.loopStartIndex, countIn, isPracticing, metronome.pulseIndex, practiceDurations]);

  const updateActiveSequence = (updater) => {
    setSequences(current => current.map(sequence => sequence.id === activeSequence.id ? updater(sequence) : sequence));
  };

  const setTitle = (title) => updateActiveSequence(sequence => ({ ...sequence, title }));

  const stopPractice = () => {
    if (isPracticing || metronome.isRunning) metronome.stop();
    setIsPracticing(false);
    setFilmState({ cardIndex: 0, beatInCard: 0, hasCompletedFirstPass: false });
    lastPulseRef.current = 0;
  };

  const startPractice = async () => {
    setFilmState({ cardIndex: 0, beatInCard: 0, hasCompletedFirstPass: false });
    lastPulseRef.current = 0;
    setPracticeOpen(true);
    setDurationsOpen(false);
    if (await metronome.start()) setIsPracticing(true);
    else setPracticeOpen(false);
  };

  const togglePracticePlayback = async () => {
    if (isPracticing) {
      metronome.stop();
      setIsPracticing(false);
      return;
    }
    lastPulseRef.current = 0;
    if (await metronome.start()) setIsPracticing(true);
  };

  const exitPractice = () => {
    stopPractice();
    setPracticeOpen(false);
    setDurationsOpen(false);
    requestAnimationFrame(() => practiceStartRef.current?.focus());
  };

  const updateStep = (index, patch) => updateActiveSequence(sequence => ({
    ...sequence,
    steps: sequence.steps.map((step, stepIndex) => stepIndex === index ? { ...step, ...patch, positionIndex: null } : step)
  }));

  const moveStep = (fromIndex, toIndex) => {
    stopPractice();
    updateActiveSequence(sequence => {
      const loopStepId = sequence.steps[sequence.loopStartIndex]?.id;
      const steps = reorderSequence(sequence.steps, fromIndex, toIndex);
      return { ...sequence, steps, loopStartIndex: Math.max(0, steps.findIndex(step => step.id === loopStepId)) };
    });
    setFocusAfterUpdate(toIndex);
  };
  const moveStepById = (stepId, toIndex) => {
    const fromIndex = activeSequence.steps.findIndex(step => step.id === stepId);
    if (fromIndex < 0 || fromIndex === toIndex) return;
    moveStep(fromIndex, toIndex);
  };
  const addStep = () => {
    if (activeSequence.steps.length >= MAX_SEQUENCE_STEPS) return;
    stopPractice();
    updateActiveSequence(sequence => ({ ...sequence, steps: sequence.steps.concat(createSequenceStep()) }));
  };
  const removeStep = (index) => {
    stopPractice();
    updateActiveSequence(sequence => {
      const steps = sequence.steps.filter((_step, stepIndex) => stepIndex !== index);
      const shiftedLoop = index < sequence.loopStartIndex ? sequence.loopStartIndex - 1 : sequence.loopStartIndex;
      return { ...sequence, steps, loopStartIndex: normalizeLoopStartIndex(shiftedLoop, steps.length) };
    });
    setFocusAfterUpdate(index);
  };

  const trackVisibleCard = (event) => {
    const row = event.currentTarget;
    const cards = Array.from(row.querySelectorAll('.lab-card'));
    if (!cards.length) return setVisibleCard(0);
    const nearest = cards.reduce((best, card, index) => Math.abs(card.offsetLeft - row.scrollLeft) < best.distance ? { index, distance: Math.abs(card.offsetLeft - row.scrollLeft) } : best, { index: 0, distance: Infinity });
    setVisibleCard(nearest.index);
  };

  const cycleRoot = (index, direction) => {
    const current = activeSequence.steps[index];
    const key = getNextValue(chromaticKeys, current.key, direction);
    const suffixes = getAvailableSuffixes(key);
    updateStep(index, { key, displayKey: null, suffix: suffixes.includes(current.suffix) ? current.suffix : (suffixes[0] || 'major') });
  };

  const cycleSuffix = (index, direction) => {
    const current = activeSequence.steps[index];
    updateStep(index, { suffix: getNextSuffix(current.key, current.suffix, direction) });
  };

  const setChordIdentity = (index, key, suffix, displayKey) => updateStep(index, { key, suffix, displayKey });
  const setChordSuffix = (index, suffix) => updateStep(index, { suffix });
  const changePracticeBeats = (index, direction) => updateActiveSequence(sequence => ({
    ...sequence,
    steps: sequence.steps.map((step, stepIndex) => stepIndex === index
      ? { ...step, practiceBeats: normalizePracticeBeats(step.practiceBeats + direction) }
      : step)
  }));

  const cycleShape = (index, direction) => {
    const step = sequenceShapes[index];
    if (!step) return;
    updateActiveSequence(sequence => ({
      ...sequence,
      steps: sequence.steps.map((item, itemIndex) => itemIndex === index
        ? { ...item, positionIndex: wrapIndex(step.positionIndex + direction, step.chord.positions.length) }
        : item)
    }));
  };

  const setShape = (index, positionIndex) => updateActiveSequence(sequence => ({
    ...sequence,
    steps: sequence.steps.map((item, itemIndex) => itemIndex === index ? { ...item, positionIndex } : item)
  }));

  const useAutomaticShapes = () => updateActiveSequence(sequence => ({
    ...sequence,
    steps: sequence.steps.map(step => ({ ...step, positionIndex: null }))
  }));

  const createNewSequence = () => {
    stopPractice();
    const sequence = createSequence(Date.now());
    setSequences(current => current.concat(sequence));
    setActiveSequenceId(sequence.id);
  };

  const createPreset = (sequence) => {
    if (!sequence) return;
    stopPractice();
    setSequences(current => current.concat(sequence));
    setActiveSequenceId(sequence.id);
    metronome.setBpm(sequence.practiceBpm);
    setPresetDialogOpen(false);
  };

  const deleteSequence = () => {
    stopPractice();
    if (sequences.length === 1) return;
    const next = sequences.filter(sequence => sequence.id !== activeSequence.id);
    setSequences(next);
    setActiveSequenceId(next[0].id);
  };

  const selectActiveSequence = (sequenceId) => {
    stopPractice();
    setActiveSequenceId(sequenceId);
    const selected = sequences.find(sequence => sequence.id === sequenceId);
    if (selected) metronome.setBpm(selected.practiceBpm);
  };

  const changeSequenceBpm = (bpm) => {
    metronome.setBpm(bpm);
    updateActiveSequence(sequence => ({ ...sequence, practiceBpm: bpm }));
  };

  const activeDuration = practiceDurations[filmState.cardIndex] || 4;
  const beatsRemaining = Math.max(1, activeDuration - filmState.beatInCard);
  const activePracticeStep = activeSequence.steps[filmState.cardIndex];
  const practiceStatus = !practiceOpen
    ? 'Pronto para começar. A contagem inicial usa um compasso.'
    : !isPracticing
      ? 'Prática pausada em ' + formatSequenceChord(activePracticeStep) + '.'
    : practicePulse < 1
      ? metronome.pulseIndex > 0 ? 'Contagem: ' + metronome.pulseIndex + ' de ' + countIn + '.' : 'Prepare-se para a contagem.'
      : formatSequenceChord(activePracticeStep) + ' · card ' + (filmState.cardIndex + 1) + ' de ' + activeSequence.steps.length + ' · troque em ' + beatsRemaining + (beatsRemaining === 1 ? ' batida.' : ' batidas.');

  return (
    <>
      <section className="sequence-lab">
        <SequenceManager sequences={sequences} activeSequenceId={activeSequence.id} setActiveSequenceId={selectActiveSequence} createNewSequence={createNewSequence} openPresets={() => setPresetDialogOpen(true)} deleteSequence={deleteSequence} />
        <SequenceHeader sequence={activeSequence} setTitle={setTitle} colorMode={colorMode} setColorMode={setColorMode} />
        <p className="chord-editing-hint">Edite o acorde diretamente. Use ↑ e ↓ para navegar, Enter para confirmar e Esc para cancelar.</p>
        <div className="voicing-status-legend" aria-label="Legenda dos voicings">
          <span><i className="voicing-status-dot voicing-status-dot--complete" />Completo</span>
          <span><i className="voicing-status-dot voicing-status-dot--incomplete" />Omite notas</span>
          <span><i className="voicing-status-dot voicing-status-dot--rootless" />Sem raiz</span>
          <span><i className="voicing-status-dot voicing-status-dot--additional" />Notas adicionais</span>
        </div>
        {activeSequence.steps.length ? <button type="button" className="automatic-shapes-button" onClick={useAutomaticShapes}>Usar formas automáticas</button> : null}
        <p className="storage-status" aria-live="polite">{storageError}</p>
        <SequencePracticeBar sequence={activeSequence} metronome={metronome} canStart={activeSequence.steps.length > 0 && missingShapes.length === 0} status={practiceStatus} onBpmChange={changeSequenceBpm} onStart={startPractice} onOpenDurations={() => setDurationsOpen(true)} startButtonRef={practiceStartRef} />
        {missingShapes.length > 0 ? <p className="missing">Dados ausentes para {missingShapes.map(step => formatChordName(step.key, step.suffix)).join(', ')}.</p> : (
          activeSequence.steps.length === 0 ? <EmptySequence addStep={addStep} /> : (
            <div ref={cardRowRef} className="lab-card-row" aria-label="Acordes da sequência" onScroll={trackVisibleCard}>
              {sequenceShapes.map((step, index) => (
                <SequenceChordStep
                  key={activeSequence.steps[index].id}
                  step={activeSequence.steps[index]}
                  index={index}
                  stepCount={activeSequence.steps.length}
                  isLoopStart={activeSequence.loopStartIndex > 0 && index === activeSequence.loopStartIndex}
                  optimizedStep={step}
                  analysisChord={analysis.chords[index]}
                  color={getColorForChord(activeSequence.steps[index], analysis.chords[index], colorMode, analysis.keyCenter)}
                  moveStepById={moveStepById}
                  moveStep={moveStep}
                  removeStep={removeStep}
                  cycleRoot={cycleRoot}
                  cycleSuffix={cycleSuffix}
                  cycleShape={cycleShape}
                  setShape={setShape}
                  availableSuffixes={getAvailableSuffixes}
                  setChordIdentity={setChordIdentity}
                  setChordSuffix={setChordSuffix}
                />
              ))}
              <AddChordSlot onClick={addStep} disabled={activeSequence.steps.length >= MAX_SEQUENCE_STEPS} title={activeSequence.steps.length >= MAX_SEQUENCE_STEPS ? 'Limite de 50 acordes' : 'Adicionar acorde'} />
            </div>
          )
        )}
        {activeSequence.steps.length > 1 ? <p className="mobile-card-position" aria-live="polite">{visibleCard + 1} de {activeSequence.steps.length}</p> : null}
      </section>
      <LabSummary analysis={analysis} exercises={exercises} sequence={activeSequence} colorMode={colorMode} />
      <SequenceDurationPanel sequence={activeSequence} open={durationsOpen && !practiceOpen} onClose={() => setDurationsOpen(false)} onChange={changePracticeBeats} />
      {practiceOpen ? <SequencePracticeOverlay
        sequence={activeSequence}
        resolvedSteps={sequenceShapes}
        filmState={filmState}
        playing={isPracticing}
        status={practiceStatus}
        beatsRemaining={beatsRemaining}
        metronome={metronome}
        onBpmChange={changeSequenceBpm}
        durationsOpen={durationsOpen}
        onToggleDurations={setDurationsOpen}
        onChangeDuration={changePracticeBeats}
        onTogglePlay={togglePracticePlayback}
        onPrevious={() => setFilmState(current => moveSequenceFilm(current, -1, activeSequence.steps.length, activeSequence.loopStartIndex))}
        onNext={() => setFilmState(current => moveSequenceFilm(current, 1, activeSequence.steps.length, activeSequence.loopStartIndex))}
        onExit={exitPractice}
      /> : null}
      <SequencePresetDialog open={presetDialogOpen} initialBpm={metronome.bpm} onClose={() => setPresetDialogOpen(false)} onCreate={createPreset} />
    </>
  );
}

export default SequenceLab;
