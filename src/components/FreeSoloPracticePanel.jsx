import { FileMusic, Play, Trash2, Undo2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { appendSoloPosition, validateFreeSolo } from '../domain/freeSolos';
import { buildTabScoreFromMelody } from '../domain/tabScore';
import { useSharedMetronome } from '../features/metronome/MetronomeContext';
import BpmInput from '../features/metronome/BpmInput';
import { loadFreeSolos, saveFreeSolos, storageErrorMessage } from '../storage';
import FretboardGrid from './FretboardGrid';
import FretboardPracticeOverlay from './FretboardPracticeOverlay';
import SoloUpcomingStrip from './SoloUpcomingStrip';
import TabScoreSheet from './TabScoreSheet';

const positionKey = (position) => position.stringIndex + ':' + position.fret;
const createSoloId = () => 'solo-' + (globalThis.crypto?.randomUUID?.() || Date.now());
const pitchNames = [['C', 0], ['C', 1], ['D', 0], ['D', 1], ['E', 0], ['F', 0], ['F', 1], ['G', 0], ['G', 1], ['A', 0], ['A', 1], ['B', 0]];
const midiToPitch = midi => {
  const [step, alter] = pitchNames[((midi % 12) + 12) % 12];
  return { step, alter, octave: Math.floor(midi / 12) - 1 };
};

export default function FreeSoloPracticePanel({ initialSoloId = '' }) {
  const metronome = useSharedMetronome();
  const [savedSolos, setSavedSolos] = useState(loadFreeSolos);
  const initialSolo = savedSolos.find(item => item.id === initialSoloId);
  const [selectedId, setSelectedId] = useState(initialSolo?.id || '');
  const [name, setName] = useState(initialSolo?.name || 'Meu solo');
  const [positions, setPositions] = useState(initialSolo?.positions || []);
  const [rhythm, setRhythm] = useState(initialSolo?.rhythm || null);
  const [timingMode, setTimingMode] = useState(initialSolo?.rhythm ? 'score' : 'beat');
  const [practicing, setPracticing] = useState(false);
  const [focusedOpen, setFocusedOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playbackStartIndex, setPlaybackStartIndex] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [storageError, setStorageError] = useState('');
  const [showTabSheet, setShowTabSheet] = useState(false);
  const practiceButtonRef = useRef(null);
  const validation = validateFreeSolo({ name, positions });
  const countIn = metronome.beatsPerMeasure;
  const phraseKeys = useMemo(() => new Set(positions.map(positionKey)), [positions]);
  const playedKeys = new Set(hasStarted ? positions.slice(0, currentIndex).map(positionKey) : []);
  const rhythmSteps = useMemo(() => {
    if (!rhythm?.events?.length) return [];
    return rhythm.events.map(event => {
      const raw = event.selectedPosition || event.suggestedPosition;
      const position = raw ? {
        ...raw,
        pitchClass: raw.midi % 12,
        octave: Math.floor(raw.midi / 12) - 1,
        note: event.pitch ? `${event.pitch.step}${event.pitch.alter === 1 ? '#' : event.pitch.alter === -1 ? 'b' : ''}` : ''
      } : null;
      return {
        ...event,
        position,
        durationBeats: Math.max(1, Math.round(event.durationTicks / (rhythm.ticksPerQuarter || 1))),
        durationLabel: `${event.durationTicks}/${rhythm.ticksPerQuarter || 1} tempo`
      };
    });
  }, [rhythm]);
  const activeSteps = timingMode === 'score' && rhythmSteps.length ? rhythmSteps : positions;
  const currentPosition = activeSteps[currentIndex]?.position || activeSteps[currentIndex] || null;
  const nextStep = activeSteps.length ? activeSteps[(currentIndex + 1) % activeSteps.length] : null;
  const nextPosition = nextStep?.position || nextStep || null;
  const previewSteps = timingMode === 'score' && rhythmSteps.length ? rhythmSteps : positions;
  const tabScore = useMemo(() => {
    if (!showTabSheet || !positions.length) return null;
    const events = rhythm?.events?.length ? rhythm.events : positions.map((position, index) => ({
      id: `solo-step-${index}`, measure: 1, offsetTicks: index, durationTicks: 1,
      pitch: midiToPitch(position.midi), rest: false, tie: null,
      confidence: 1, alternatives: [], selectedPosition: position, suggestedPosition: null
    }));
    return buildTabScoreFromMelody({
      title: name.trim() || 'Meu solo',
      tempo: metronome.bpm,
      ticksPerQuarter: rhythm?.ticksPerQuarter || 1,
      meter: rhythm?.meter || { beats: metronome.beatsPerMeasure, beatType: 4 },
      events
    });
  }, [metronome.beatsPerMeasure, metronome.bpm, name, positions, rhythm, showTabSheet]);

  useEffect(() => {
    const practicePulse = metronome.pulseIndex - countIn;
    if (!practicing || practicePulse < 1 || !positions.length) return;
    setHasStarted(true);
    if (timingMode === 'score' && rhythmSteps.length) {
      const durations = rhythmSteps.map(step => step.durationBeats);
      const cycle = durations.reduce((sum, value) => sum + value, 0);
      let elapsed = (practicePulse - 1) % cycle;
      let index = 0;
      while (elapsed >= durations[index] && index < durations.length - 1) elapsed -= durations[index++];
      setCurrentIndex(index);
      return;
    }
    setCurrentIndex((playbackStartIndex + practicePulse - 1) % positions.length);
  }, [countIn, metronome.pulseIndex, playbackStartIndex, positions.length, practicing, rhythmSteps, timingMode]);

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

  const choosePosition = (position) => {
    stopPractice();
    setPositions(current => appendSoloPosition(current, position));
  };

  const selectSolo = (id) => {
    stopPractice();
    setSelectedId(id);
    const solo = savedSolos.find(item => item.id === id);
    setName(solo?.name || 'Meu solo');
    setPositions(solo?.positions || []);
    setRhythm(solo?.rhythm || null);
    setTimingMode(solo?.rhythm ? 'score' : 'beat');
    setStorageError('');
  };

  const saveSolo = () => {
    if (!validation.ok) return;
    const now = new Date().toISOString();
    const id = selectedId || createSoloId();
    const solo = { id, name: name.trim() || 'Meu solo', positions, ...(rhythm ? { rhythm } : {}), updatedAt: now };
    const next = selectedId ? savedSolos.map(item => item.id === selectedId ? solo : item) : savedSolos.concat(solo);
    if (!saveFreeSolos(next).ok) return setStorageError(storageErrorMessage);
    setSavedSolos(next);
    setSelectedId(id);
    setStorageError('');
  };

  const deleteSolo = () => {
    if (!selectedId) return;
    stopPractice();
    const next = savedSolos.filter(item => item.id !== selectedId);
    if (!saveFreeSolos(next).ok) return setStorageError(storageErrorMessage);
    setSavedSolos(next);
    setSelectedId('');
    setName('Meu solo');
    setPositions([]);
  };

  const startPractice = async () => {
    if (!validation.ok) return;
    setCurrentIndex(0);
    setPlaybackStartIndex(0);
    setHasStarted(false);
    setFocusedOpen(true);
    const started = await metronome.start().catch(() => false);
    if (started) setPracticing(true);
    else setFocusedOpen(false);
  };

  const togglePractice = async () => {
    if (practicing) return stopPractice();
    setPlaybackStartIndex(currentIndex);
    const started = await metronome.start().catch(() => false);
    if (started) setPracticing(true);
  };

  const getPositionState = (position) => {
    const key = positionKey(position);
    return {
      highlighted: false,
      inScale: false,
      path: phraseKeys.has(key),
      root: false,
      start: positions.length > 0 && key === positionKey(positions[0]),
      end: positions.length > 1 && key === positionKey(positions.at(-1)),
      selectable: !practicing,
      candidate: false,
      current: focusedOpen && hasStarted && key === positionKey(currentPosition),
      next: focusedOpen && hasStarted && key === positionKey(nextPosition),
      played: playedKeys.has(key)
    };
  };

  const instruction = practicing && !hasStarted
    ? 'Contagem: ' + metronome.pulseIndex + ' de ' + countIn
    : activeSteps[currentIndex]?.rest
      ? 'Pausa · mantenha o pulso'
      : currentPosition
      ? currentPosition.note + currentPosition.octave + ' · corda ' + (currentPosition.stringIndex + 1) + ' · casa ' + currentPosition.fret
      : 'Clique nas notas do braço para criar seu solo.';

  return <div className="scale-practice-panel free-solo-panel path-view">
    <div className="solo-practice-workspace">
      <aside className="solo-control-rail">
        <div className="scale-explorer">
          <div className="solo-heading"><p>Escolha qualquer nota, em qualquer direção. Repetições são permitidas.</p></div>
          <label><span>Solo salvo</span><select aria-label="Solo selecionado" value={selectedId} onChange={event => selectSolo(event.target.value)}><option value="">Novo solo</option>{savedSolos.map(solo => <option key={solo.id} value={solo.id}>{solo.name}</option>)}</select></label>
          <label><span>Nome</span><input aria-label="Nome do solo" value={name} onChange={event => setName(event.target.value)} /></label>
          <div className="path-actions"><button type="button" onClick={() => { stopPractice(); setPositions(current => current.slice(0, -1)); }} disabled={!positions.length}><Undo2 size={16} aria-hidden="true" /> Desfazer</button><button type="button" onClick={() => { stopPractice(); setPositions([]); }} disabled={!positions.length}>Limpar</button><button type="button" data-ui-text-reason="workflow" onClick={saveSolo} disabled={!validation.ok}>Salvar solo</button><button type="button" aria-label="Excluir solo" title="Excluir solo" onClick={deleteSolo} disabled={!selectedId}><Trash2 size={16} aria-hidden="true" /></button></div>
          <div className="solo-tempo-control"><BpmInput value={metronome.bpm} onChange={metronome.setBpm} ariaLabel="BPM da prática de solo" variant="practice" /><small>{timingMode === 'score' ? 'Ritmo da partitura' : 'Uma nota por batida'} · contagem de {countIn} tempos</small></div>
          {rhythm ? <label><span>Andamento do solo</span><select aria-label="Andamento do solo" value={timingMode} onChange={event => { stopPractice(); setCurrentIndex(0); setTimingMode(event.target.value); }}><option value="score">Ritmo da partitura</option><option value="beat">Uma nota por batida</option></select></label> : null}
          <button ref={practiceButtonRef} type="button" data-ui-text-reason="workflow" className="scale-practice-button solo-practice-button" onClick={startPractice} disabled={!validation.ok}><Play aria-hidden="true" size={16} />Praticar solo</button>
          <button type="button" data-ui-text-reason="workflow" className="practice-export-button" disabled={!validation.ok} aria-expanded={showTabSheet} onClick={() => setShowTabSheet(value => !value)}><FileMusic size={15} /> Criar folha TAB</button>
          <p className="path-progress">{positions.length ? currentIndex + 1 : 0} de {positions.length} · {instruction}</p><p className="visually-hidden" aria-live="polite">{instruction}</p>{storageError ? <p className="validation-error" role="status">{storageError}</p> : null}
        </div>
      </aside>
    </div>
    <section className="solo-timeline-panel" aria-labelledby="solo-timeline-title">
      <div className="solo-timeline-heading"><strong id="solo-timeline-title">Linha do solo</strong><span>{positions.length} {positions.length === 1 ? 'nota' : 'notas'}</span></div>
      <div className="solo-sequence" aria-label="Notas do solo">{positions.length ? positions.map((position, index) => <button type="button" key={index + '-' + positionKey(position)} className={index === currentIndex && practicing ? 'current' : ''} onClick={() => { stopPractice(); setPositions(current => current.filter((_item, itemIndex) => itemIndex !== index)); }} aria-label={'Remover passo ' + (index + 1) + ', ' + position.note + position.octave}>{index + 1}. {position.note}{position.octave}</button>) : <span>Nenhuma nota escolhida.</span>}</div>
    </section>
    <div className="solo-fretboard-pane">
      <div className="scale-visual-legend" aria-label="Legenda do solo"><span className="legend-octave-4">Oitava 4</span><span className="legend-octave-5">Oitava 5</span><span className="legend-current">Agora</span><span className="legend-next">Próxima</span></div>
      <FretboardGrid ariaLabel="Criação e prática de solo livre" getPositionState={getPositionState} selecting={!practicing} onChoose={choosePosition} />
    </div>
    {tabScore ? <TabScoreSheet score={tabScore} /> : null}
    {focusedOpen ? <FretboardPracticeOverlay title={name.trim() || 'Meu solo'} eyebrow="Solo livre" progress={(currentIndex + 1) + ' de ' + previewSteps.length} instruction={instruction} playing={practicing} metronome={metronome} onTogglePlay={togglePractice} onExit={exitPractice} legend={<div className="scale-visual-legend" aria-label="Legenda do solo focado"><span className="legend-octave-4">Oitava 4</span><span className="legend-octave-5">Oitava 5</span><span className="legend-current">Agora</span><span className="legend-next">Próxima</span></div>} preview={<SoloUpcomingStrip steps={previewSteps} currentIndex={currentIndex} />}><FretboardGrid ariaLabel="Prática focada do solo livre" getPositionState={getPositionState} /></FretboardPracticeOverlay> : null}
  </div>;
}
