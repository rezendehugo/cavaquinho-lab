import { Check, ChevronLeft, ChevronRight, Pencil, Play, Star } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { formatSequenceChord } from '../chordDisplay';
import { cavaquinhoChords } from '../domain/chords';
import { chordQualities, getChordFormulaLegend, getChordToneDetail } from '../domain/chordTheory';
import { buildSequencePractice, getSequenceBeatState, getSequenceStructureKey, getSequenceStructureSteps, projectSequencePractice } from '../domain/sequencePractice';
import { getAbsoluteFrets, getChordShapeCandidates, getShapeCandidateRankingScore, getTransitionScore, isValidChordShape } from '../progressionOptimizer';
import { cavaquinhoOpenMidi } from '../domain/scalePaths';
import SequencePdfExport from './SequencePdfExport';
import { loadSequenceStudy } from '../hooks/useSequenceStudy';
import { useSharedMetronome } from '../features/metronome/MetronomeContext';
import BpmInput from '../features/metronome/BpmInput';
import { loadActiveSequenceId, loadSequences, sequencesStorageKey, writeStorage } from '../storage';
import FretboardGrid from './FretboardGrid';
import FretboardPracticeOverlay from './FretboardPracticeOverlay';
import SequenceChordNavigator from './SequenceChordNavigator';
import NoLookPracticeOverlay from './NoLookPracticeOverlay';

const positionKey = (position) => position.stringIndex + ':' + position.fret;
const preferredShapesStorageKey = 'cavaquinhoLabPreferredChordShapes:v1';
const chordPreferenceKey = step => `${step.key}:${step.suffix}`;
const chordDegreeOrder = new Map([
  ['1', 0], ['♭3', 1], ['3', 1], ['4', 2], ['♯4', 2], ['♭5', 2], ['5', 2], ['♯5', 2], ['♭6', 2],
  ['6', 3], ['♭♭7', 3], ['♭7', 3], ['7M', 3], ['♭9', 4], ['9', 4], ['♯9', 4], ['11', 5], ['♭13', 6], ['13', 6]
]);
const workspaceInteractiveSelector = 'button, input, select, textarea, a, [contenteditable="true"]';

export default function SequencePracticePanel() {
  const metronome = useSharedMetronome();
  const [sequences, setSequences] = useState(loadSequences);
  const [sequenceId, setSequenceId] = useState(() => loadActiveSequenceId(loadSequences()));
  const [beatsPerChord, setBeatsPerChord] = useState(4);
  const [practicing, setPracticing] = useState(false);
  const [focusedOpen, setFocusedOpen] = useState(false);
  const [noLookOpen, setNoLookOpen] = useState(false);
  const [noLookPlaying, setNoLookPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [beatsRemaining, setBeatsRemaining] = useState(4);
  const [playbackStartIndex, setPlaybackStartIndex] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [playbackOriginPulse, setPlaybackOriginPulse] = useState(0);
  const [editingShape, setEditingShape] = useState(false);
  const [draftShape, setDraftShape] = useState(null);
  const [shapeSaveMessage, setShapeSaveMessage] = useState('');
  const [preferredShapes, setPreferredShapes] = useState(() => {
    try { return JSON.parse(localStorage.getItem(preferredShapesStorageKey) || '{}'); }
    catch { return {}; }
  });
  const [practiceToolsOpen, setPracticeToolsOpen] = useState(false);
  const practiceButtonRef = useRef(null);
  const noLookButtonRef = useRef(null);
  const sequence = sequences.find(item => item.id === sequenceId) || sequences[0];
  const sequenceStructureKey = getSequenceStructureKey(sequence?.steps || []);
  const sequenceStructureSteps = useMemo(() => getSequenceStructureSteps(sequence?.steps || []), [sequenceStructureKey]);
  const navigatorSequence = useMemo(() => sequence ? { steps: sequenceStructureSteps } : null, [sequence?.id, sequenceStructureSteps]);
  const resolvedStructure = useMemo(() => buildSequencePractice(sequenceStructureSteps, cavaquinhoChords), [sequenceStructureKey, sequenceStructureSteps]);
  const resolved = useMemo(() => projectSequencePractice(resolvedStructure, sequence?.steps || [], cavaquinhoChords), [resolvedStructure, sequence?.steps]);
  const countIn = metronome.beatsPerMeasure;
  const practicePulse = Math.max(0, metronome.pulseIndex - countIn);
  const current = resolved.steps[currentIndex];
  const previous = resolved.steps.length ? resolved.steps[(currentIndex - 1 + resolved.steps.length) % resolved.steps.length] : null;
  const next = resolved.steps.length ? resolved.steps[(currentIndex + 1) % resolved.steps.length] : null;
  const currentKeys = new Set((current?.positions || []).map(positionKey));
  const previousKeys = new Set((previous?.positions || []).map(positionKey));
  const nextKeys = new Set((next?.positions || []).map(positionKey));
  const canPractice = resolved.steps.length > 0 && !resolved.missing.length;
  const chordKey = current?.displayKey || current?.key;
  const chordFormula = useMemo(() => current ? getChordFormulaLegend(chordKey, current.suffix).sort((left, right) => (chordDegreeOrder.get(left.degreeLabel) ?? 99) - (chordDegreeOrder.get(right.degreeLabel) ?? 99)) : [], [chordKey, current?.suffix]);
  const requiredIntervals = useMemo(() => new Set(chordQualities[current?.suffix]?.required || []), [current?.suffix]);
  const characteristicIntervals = useMemo(() => new Set(chordQualities[current?.suffix]?.characteristicIntervals || []), [current?.suffix]);
  const activeFrets = editingShape && draftShape ? draftShape.frets : (current ? getAbsoluteFrets(current.position) : []);
  const playedPitchClasses = new Set(activeFrets.flatMap((fret, stringIndex) => fret >= 0 ? [(cavaquinhoOpenMidi[stringIndex] + fret) % 12] : []));
  const editingFocusPosition = useMemo(() => {
    if (!editingShape) return null;
    const stringIndex = activeFrets.findIndex(fret => fret >= 0);
    return stringIndex < 0 ? null : { stringIndex, fret: activeFrets[stringIndex] };
  }, [activeFrets, editingShape]);

  useEffect(() => {
    setEditingShape(false);
    setDraftShape(null);
    setShapeSaveMessage('');
  }, [sequenceId, currentIndex]);

  const beginShapeEdit = () => {
    if (!current?.position) return;
    setDraftShape({ frets: getAbsoluteFrets(current.position), fingers: [...(current.position.fingers || [0, 0, 0, 0])], basePositionIndex: current.positionIndex ?? 0 });
    setEditingShape(true);
    setShapeSaveMessage('');
  };

  const setStringFret = (stringIndex, fret) => setDraftShape(shape => shape ? {
    ...shape,
    frets: shape.frets.map((value, index) => index === stringIndex ? fret : value)
  } : shape);

  const saveEditedShape = () => {
    if (!sequence || !current || !draftShape) return;
    if (!isValidChordShape(current, { ...draftShape, baseFret: 1 })) {
      setShapeSaveMessage('A forma precisa conter notas do acorde, ficar entre as casas 0 e 14 e caber em quatro casas.');
      return;
    }
    const nextSequences = sequences.map(item => item.id !== sequence.id ? item : {
      ...item,
      steps: item.steps.map(step => step.id !== current.id ? step : {
        ...step,
        customPosition: { frets: [...draftShape.frets], fingers: [...draftShape.fingers] },
        positionIndex: null
      })
    });
    setSequences(nextSequences);
    const saved = writeStorage(sequencesStorageKey, JSON.stringify(nextSequences));
    setEditingShape(false);
    setDraftShape(null);
    setShapeSaveMessage(saved.ok ? 'Forma salva nesta sequência.' : 'Não foi possível salvar a forma neste navegador.');
  };

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

  const startNoLookPractice = () => {
    if (!canPractice) return;
    stopPractice();
    setNoLookPlaying(false);
    setNoLookOpen(true);
  };

  const toggleNoLookMetronome = async () => {
    if (noLookPlaying) {
      metronome.stop();
      setNoLookPlaying(false);
      return;
    }
    if (await metronome.start().catch(() => false)) setNoLookPlaying(true);
  };

  const exitNoLookPractice = () => {
    if (noLookPlaying) metronome.stop();
    setNoLookPlaying(false);
    setNoLookOpen(false);
    requestAnimationFrame(() => noLookButtonRef.current?.focus());
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

  const selectOccurrence = useCallback(index => {
    setCurrentIndex(index);
    if (practicing) {
      setPlaybackStartIndex(index);
      setPlaybackOriginPulse(practicePulse);
      setBeatsRemaining(beatsPerChord);
    }
  }, [beatsPerChord, practicePulse, practicing]);

  const instruction = practicing && !hasStarted
    ? 'Contagem: ' + metronome.pulseIndex + ' de ' + countIn
    : current ? formatSequenceChord(current) + ' · acorde ' + (currentIndex + 1) + ' de ' + resolved.steps.length + ' · troque em ' + beatsRemaining + (beatsRemaining === 1 ? ' batida' : ' batidas')
      : 'Escolha uma sequência com acordes para começar.';

  const requiredNotes = useMemo(() => chordFormula.filter(tone => requiredIntervals.has(tone.interval)), [chordFormula, requiredIntervals]);
  const currentPreferenceKey = current ? chordPreferenceKey(current) : '';
  const currentPreferredFretKeys = preferredShapes[currentPreferenceKey] || [];
  const shapeCandidates = useMemo(() => {
    if (!current) return [];
    const previousPosition = resolved.steps.length > 1 ? previous?.position || null : null;
    const preferredFretKeys = preferredShapes[chordPreferenceKey(current)] || [];
    const candidates = getChordShapeCandidates(sequence.steps[currentIndex], cavaquinhoChords, { previousPosition, preferredFretKeys });
    const currentFrets = getAbsoluteFrets(current.position);
    if (current.customPosition && isValidChordShape(current, { ...current.position, frets: currentFrets, baseFret: 1 }) && !candidates.some(item => item.fretKey === currentFrets.join(','))) {
      const fretKey = currentFrets.join(',');
      candidates.push({
        position: current.position,
        positionIndex: current.positionIndex ?? 0,
        shapeSuffix: current.shapeSuffix || current.suffix,
        shapeKey: current.key,
        fretKey,
        custom: true,
        playedCount: new Set(currentFrets.flatMap((fret, index) => fret < 0 ? [] : [(cavaquinhoOpenMidi[index] + fret) % 12])).size,
        essentialCount: [...requiredNotes].filter(tone => currentFrets.some((fret, index) => fret >= 0 && (cavaquinhoOpenMidi[index] + fret) % 12 === tone.pitchClass)).length,
        definingToneCount: [...characteristicIntervals].filter(interval => chordFormula.some(tone => tone.interval === interval && currentFrets.some((fret, index) => fret >= 0 && (cavaquinhoOpenMidi[index] + fret) % 12 === tone.pitchClass))).length,
        definingCount: characteristicIntervals.size,
        requiredCount: requiredIntervals.size,
        isPreferred: preferredFretKeys.includes(fretKey),
        movementScore: previousPosition ? getTransitionScore(previousPosition, current.position) : 0,
        regionDistance: 0
      });
    }
    return candidates.sort((left, right) => getShapeCandidateRankingScore(left) - getShapeCandidateRankingScore(right) || right.playedCount - left.playedCount || left.fretKey.localeCompare(right.fretKey));
  }, [characteristicIntervals, chordFormula, current, currentIndex, preferredShapes, previous, requiredIntervals, requiredNotes, sequence?.steps]);
  const activeFretKey = activeFrets.join(',');
  const currentCandidateIndex = Math.max(0, shapeCandidates.findIndex(candidate => candidate.fretKey === activeFretKey));
  const currentCandidate = shapeCandidates[currentCandidateIndex];
  const isCurrentPreferred = currentCandidate?.isPreferred || currentPreferredFretKeys.includes(activeFretKey);
  const selectShapeCandidate = index => {
    if (!sequence || !current || !shapeCandidates.length) return;
    const candidate = shapeCandidates[(index + shapeCandidates.length) % shapeCandidates.length];
    const nextSequences = sequences.map(item => item.id !== sequence.id ? item : {
      ...item,
      steps: item.steps.map(step => step.id !== current.id ? step : {
        ...step,
        shapeSuffix: candidate.shapeSuffix,
        positionIndex: candidate.positionIndex,
        customPosition: candidate.custom
          ? { frets: getAbsoluteFrets(candidate.position), fingers: [...candidate.position.fingers] }
          : undefined
      })
    });
    setSequences(nextSequences);
    writeStorage(sequencesStorageKey, JSON.stringify(nextSequences));
    setShapeSaveMessage('');
  };

  const handleWorkspaceKeyDown = event => {
    if (editingShape || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    if (event.target instanceof Element && event.target.closest('input, select, textarea, [contenteditable="true"]')) return;
    event.preventDefault();
    selectShapeCandidate(currentCandidateIndex + (event.key === 'ArrowRight' ? 1 : -1));
  };

  const focusWorkspaceFromPointer = event => {
    if (editingShape || (event.target instanceof Element && event.target.closest(workspaceInteractiveSelector))) return;
    event.currentTarget.focus();
  };

  const togglePreferredShape = () => {
    const candidate = shapeCandidates[currentCandidateIndex];
    if (!candidate) return;
    const currentFavorites = preferredShapes[currentPreferenceKey] || [];
    const nextFavorites = currentFavorites.includes(candidate.fretKey)
      ? currentFavorites.filter(key => key !== candidate.fretKey)
      : [...currentFavorites, candidate.fretKey];
    const nextPreferredShapes = { ...preferredShapes, [currentPreferenceKey]: nextFavorites };
    setPreferredShapes(nextPreferredShapes);
    writeStorage(preferredShapesStorageKey, JSON.stringify(nextPreferredShapes));
  };

  return <div className="sequence-practice-panel sequence-practice-panel--focused">
    <div className="fretboard-control-panel">
      <div className="scale-explorer sequence-practice-controls">
        <label className="sequence-title-select"><span>Sequência</span><select aria-label="Sequência para praticar" value={sequence?.id || ''} onChange={event => selectSequence(event.target.value)}>{sequences.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
        <SequenceChordNavigator
          sequence={navigatorSequence}
          currentIndex={currentIndex}
          onSelectOccurrence={selectOccurrence}
        />
        {resolved.missing.length ? <p className="validation-error" role="status">Há acordes sem forma disponível nesta sequência.</p> : null}
        {!sequence?.steps.length ? <a className="practice-sequence-link" href={import.meta.env.BASE_URL + 'sequences'}>Adicionar acordes em Sequências</a> : null}
        {current ? <section className="sequence-chord-workspace" aria-labelledby="sequence-chord-title" role="group" tabIndex={0} onKeyDown={handleWorkspaceKeyDown} onClick={focusWorkspaceFromPointer}>
          <div className="sequence-chord-workspace-heading">
            <div><h3 id="sequence-chord-title">{formatSequenceChord(current)}</h3></div>
            <div className="sequence-shape-navigation" role="group" aria-label="Formas compatíveis" tabIndex={0} onClick={event => {
              if (event.target instanceof Element && event.target.closest('button')) return;
              event.currentTarget.focus();
              event.stopPropagation();
            }}>
              <button type="button" aria-label="Forma anterior" title="Forma anterior" disabled={shapeCandidates.length < 2 || editingShape} onClick={() => selectShapeCandidate(currentCandidateIndex - 1)}><ChevronLeft size={18} aria-hidden="true" /></button>
              <span aria-live="polite">{shapeCandidates.length ? `${currentCandidateIndex + 1}/${shapeCandidates.length}` : '—'}</span>
              <button type="button" aria-label="Próxima forma" title="Próxima forma" disabled={shapeCandidates.length < 2 || editingShape} onClick={() => selectShapeCandidate(currentCandidateIndex + 1)}><ChevronRight size={18} aria-hidden="true" /></button>
              <button type="button" className={`sequence-preferred-shape${isCurrentPreferred ? ' is-preferred' : ''}`} aria-label={isCurrentPreferred ? 'Remover forma dos preferidos' : 'Marcar forma como preferida'} title={isCurrentPreferred ? 'Remover forma dos preferidos' : 'Marcar forma como preferida'} aria-pressed={Boolean(isCurrentPreferred)} disabled={!currentCandidate || editingShape} onClick={togglePreferredShape}><Star size={16} aria-hidden="true" fill={isCurrentPreferred ? 'currentColor' : 'none'} /></button>
            </div>
            {!editingShape ? <button type="button" className="sequence-edit-shape-button icon-button" aria-label="Editar forma" title="Editar forma" onClick={beginShapeEdit}><Pencil size={17} aria-hidden="true" /></button> : null}
          </div>
          <div className="sequence-required-notes" aria-label={`Notas de ${formatSequenceChord(current)}`}>
            <div className="sequence-note-pills">{chordFormula.map(tone => <span key={tone.interval} className={[requiredIntervals.has(tone.interval) ? 'is-essential' : '', characteristicIntervals.has(tone.interval) ? 'is-defining' : '', playedPitchClasses.has(tone.pitchClass) ? 'is-played' : ''].filter(Boolean).join(' ')} data-played={playedPitchClasses.has(tone.pitchClass) ? 'true' : 'false'} data-defining={characteristicIntervals.has(tone.interval) ? 'true' : 'false'} title={tone.description}><small>{tone.degreeLabel}</small><b>{tone.note}</b></span>)}</div>
          </div>
          {editingShape ? <div className="sequence-shape-editor-tools">
            <div className="sequence-string-tools" aria-label="Corda selecionada">
              {['D₄', 'G₄', 'B₄', 'D₅'].map((string, index) => <button key={string} type="button" aria-label={`Abafar corda ${string}`} title={`Abafar corda ${string}`} aria-pressed={activeFrets[index] < 0} onClick={() => setStringFret(index, activeFrets[index] < 0 ? 0 : -1)}>{string}{activeFrets[index] < 0 ? ' ×' : ''}</button>)}
            </div>
            <div className="sequence-shape-editor-actions"><button type="button" data-ui-text-reason="workflow" className="sequence-save-shape-button" onClick={saveEditedShape}><Check size={16} aria-hidden="true" />Salvar forma</button><button type="button" onClick={() => { setEditingShape(false); setDraftShape(null); }}>Cancelar</button></div>
            <p role="status">Escolha uma casa para mover a nota nessa corda.</p>
          </div> : null}
          {shapeSaveMessage ? <p className="sequence-shape-save-status" role="status">{shapeSaveMessage}</p> : null}
        </section> : null}
      </div>
    </div>
    {current ? <div className="sequence-map-legend" aria-label="Legenda das notas do acorde"><span className="selected">Na forma</span><span className="defining">Definidora</span><span className="essential">Essencial</span><span className="chord-tone">Outro tom</span></div> : null}
    <FretboardGrid ariaLabel={current ? editingShape ? `Editar forma de ${formatSequenceChord(current)}` : `Notas pressionadas de ${formatSequenceChord(current)}` : 'Notas da sequência'} editing={editingShape} chordDegreeMode showRegionLegend={false} initialFocusPosition={editingFocusPosition} mutedStrings={editingShape ? activeFrets.flatMap((fret, index) => fret < 0 ? [index] : []) : current?.mutedStrings || []} onChoose={position => setStringFret(position.stringIndex, position.fret)} getPositionState={position => {
      const key = positionKey(position);
      const selected = activeFrets[position.stringIndex] === position.fret;
      const midi = cavaquinhoOpenMidi[position.stringIndex] + position.fret;
      const chordTone = getChordToneDetail(chordKey, current?.suffix, midi);
      const isEssentialTone = requiredNotes.some(tone => tone.pitchClass === midi % 12);
      const isDefiningTone = Boolean(chordTone && characteristicIntervals.has(chordTone.interval));
      return {
        highlighted: selected,
        inScale: false,
        path: selected,
        current: focusedOpen && hasStarted && currentKeys.has(key),
        next: focusedOpen && hasStarted && nextKeys.has(key),
        played: focusedOpen && hasStarted && previousKeys.has(key),
        selectable: editingShape && Boolean(chordTone),
        noteLabel: chordTone?.note,
        degreeLabel: chordTone?.degreeLabel,
        requiredTone: Boolean(chordTone),
        essentialTone: isEssentialTone,
        definingTone: isDefiningTone
      };
    }} />
    {editingShape ? <p className="sequence-map-instruction">Salve para manter esta forma nesta sequência.</p> : null}
    <details className="sequence-practice-tools" open={practiceToolsOpen} onToggle={event => setPracticeToolsOpen(event.currentTarget.open)}>
      <summary>Praticar ou exportar</summary>
      <div className="sequence-practice-tools-content">
        <label><span>Batidas por acorde</span><select aria-label="Batidas por acorde" value={beatsPerChord} onChange={event => { stopPractice(); setBeatsPerChord(Number(event.target.value)); }}>{[1, 2, 4].map(value => <option key={value} value={value}>{value}</option>)}</select></label>
        <div className="scale-practice"><div><BpmInput value={metronome.bpm} onChange={metronome.setBpm} ariaLabel="BPM da prática de sequência" variant="practice" /><small>{beatsPerChord} {beatsPerChord === 1 ? 'batida' : 'batidas'} por acorde · contagem de {countIn} tempos</small></div><button ref={practiceButtonRef} type="button" data-ui-text-reason="workflow" className="scale-practice-button" onClick={startPractice} disabled={!canPractice}><Play aria-hidden="true" size={16} />Praticar sequência</button></div>
        <div className="no-look-entry"><p>Toque de memória e confira a sequência depois. Os acordes e diagramas ficam ocultos durante a tentativa.</p><button ref={noLookButtonRef} type="button" data-ui-text-reason="workflow" onClick={startNoLookPractice} disabled={!canPractice}>Praticar sem olhar</button></div>
        <p className="path-progress">{instruction}</p>
        <p className="visually-hidden" aria-live="polite">{instruction}</p>
        {current ? <p className="sequence-next-chord">Próximo: {formatSequenceChord(next)}</p> : null}
        {sequence?.steps.length ? <SequencePdfExport key={sequence.id} sequence={{ ...sequence, loopStartIndex: 0, steps: sequence.steps.map(step => ({ ...step, practiceBeats: beatsPerChord })) }} study={loadSequenceStudy(sequence.id)} resolvedSteps={resolved.steps} bpm={metronome.bpm} /> : null}
      </div>
    </details>
    {focusedOpen ? <FretboardPracticeOverlay title={sequence?.title || 'Sequência'} eyebrow="Prática de sequência" progress={(currentIndex + 1) + ' de ' + resolved.steps.length + ' · ' + beatsRemaining + (beatsRemaining === 1 ? ' batida restante' : ' batidas restantes')} instruction={instruction} playing={practicing} metronome={metronome} onTogglePlay={togglePractice} onExit={exitPractice} legend={<div className="scale-visual-legend" aria-label="Legenda da sequência focada"><span className="legend-current">Acorde atual</span><span className="legend-next">Próximo acorde</span><span className="legend-played">Acorde anterior</span></div>}><FretboardGrid ariaLabel="Notas pressionadas da sequência em prática focada" mutedStrings={current?.mutedStrings || []} getPositionState={position => { const key = positionKey(position); return { highlighted: currentKeys.has(key), path: currentKeys.has(key), current: hasStarted && currentKeys.has(key), next: hasStarted && nextKeys.has(key), played: hasStarted && previousKeys.has(key) }; }} /></FretboardPracticeOverlay> : null}
    {noLookOpen && sequence ? <NoLookPracticeOverlay sequence={sequence} metronome={metronome} playing={noLookPlaying} onToggleMetronome={toggleNoLookMetronome} onExit={exitNoLookPractice} /> : null}
  </div>;
}
