import { Play, Trash2, Undo2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { appendSoloPosition, validateFreeSolo } from '../domain/freeSolos';
import { useSharedMetronome } from '../features/metronome/MetronomeContext';
import BpmInput from '../features/metronome/BpmInput';
import { loadFreeSolos, saveFreeSolos, storageErrorMessage } from '../storage';
import FretboardGrid from './FretboardGrid';
import FretboardPracticeOverlay from './FretboardPracticeOverlay';

const positionKey = (position) => position.stringIndex + ':' + position.fret;
const createSoloId = () => 'solo-' + (globalThis.crypto?.randomUUID?.() || Date.now());

export default function FreeSoloPracticePanel() {
  const metronome = useSharedMetronome();
  const [savedSolos, setSavedSolos] = useState(loadFreeSolos);
  const [selectedId, setSelectedId] = useState('');
  const [name, setName] = useState('Meu solo');
  const [positions, setPositions] = useState([]);
  const [practicing, setPracticing] = useState(false);
  const [focusedOpen, setFocusedOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playbackStartIndex, setPlaybackStartIndex] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [storageError, setStorageError] = useState('');
  const practiceButtonRef = useRef(null);
  const validation = validateFreeSolo({ name, positions });
  const countIn = metronome.beatsPerMeasure;
  const currentPosition = positions[currentIndex];
  const nextPosition = positions.length ? positions[(currentIndex + 1) % positions.length] : null;
  const phraseKeys = useMemo(() => new Set(positions.map(positionKey)), [positions]);
  const playedKeys = new Set(hasStarted ? positions.slice(0, currentIndex).map(positionKey) : []);

  useEffect(() => {
    const practicePulse = metronome.pulseIndex - countIn;
    if (!practicing || practicePulse < 1 || !positions.length) return;
    setHasStarted(true);
    setCurrentIndex((playbackStartIndex + practicePulse - 1) % positions.length);
  }, [countIn, metronome.pulseIndex, playbackStartIndex, positions.length, practicing]);

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
    setStorageError('');
  };

  const saveSolo = () => {
    if (!validation.ok) return;
    const now = new Date().toISOString();
    const id = selectedId || createSoloId();
    const solo = { id, name: name.trim() || 'Meu solo', positions, updatedAt: now };
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
    : currentPosition
      ? currentPosition.note + currentPosition.octave + ' · corda ' + (currentPosition.stringIndex + 1) + ' · casa ' + currentPosition.fret
      : 'Clique nas notas do braço para criar seu solo.';

  return <div className="scale-practice-panel free-solo-panel path-view">
    <div className="solo-fretboard-pane">
      <div className="scale-visual-legend" aria-label="Legenda do solo"><span className="legend-octave-4">Oitava 4</span><span className="legend-octave-5">Oitava 5</span><span className="legend-current">Agora</span><span className="legend-next">Próxima</span></div>
      <FretboardGrid ariaLabel="Criação e prática de solo livre" getPositionState={getPositionState} selecting={!practicing} onChoose={choosePosition} />
    </div>
    <section className="solo-timeline-panel" aria-labelledby="solo-timeline-title">
      <div className="solo-timeline-heading"><strong id="solo-timeline-title">Linha do solo</strong><span>{positions.length} {positions.length === 1 ? 'nota' : 'notas'}</span></div>
      <div className="solo-sequence" aria-label="Notas do solo">{positions.length ? positions.map((position, index) => <button type="button" key={index + '-' + positionKey(position)} className={index === currentIndex && practicing ? 'current' : ''} onClick={() => { stopPractice(); setPositions(current => current.filter((_item, itemIndex) => itemIndex !== index)); }} aria-label={'Remover passo ' + (index + 1) + ', ' + position.note + position.octave}>{index + 1}. {position.note}{position.octave}</button>) : <span>Nenhuma nota escolhida.</span>}</div>
    </section>
    <div className="solo-practice-workspace">
      <aside className="solo-control-rail">
        <div className="scale-explorer">
          <div className="solo-heading"><h3>Solo livre</h3><p>Escolha qualquer nota, em qualquer direção. Repetições são permitidas.</p></div>
          <label><span>Solo salvo</span><select aria-label="Solo selecionado" value={selectedId} onChange={event => selectSolo(event.target.value)}><option value="">Novo solo</option>{savedSolos.map(solo => <option key={solo.id} value={solo.id}>{solo.name}</option>)}</select></label>
          <label><span>Nome</span><input aria-label="Nome do solo" value={name} onChange={event => setName(event.target.value)} /></label>
          <div className="path-actions"><button type="button" onClick={() => { stopPractice(); setPositions(current => current.slice(0, -1)); }} disabled={!positions.length}><Undo2 size={16} aria-hidden="true" /> Desfazer</button><button type="button" onClick={() => { stopPractice(); setPositions([]); }} disabled={!positions.length}>Limpar</button><button type="button" onClick={saveSolo} disabled={!validation.ok}>Salvar solo</button><button type="button" aria-label="Excluir solo" onClick={deleteSolo} disabled={!selectedId}><Trash2 size={16} aria-hidden="true" /></button></div>
          <div className="solo-tempo-control"><BpmInput value={metronome.bpm} onChange={metronome.setBpm} ariaLabel="BPM da prática de solo" variant="practice" /><small>Uma nota por batida · contagem de {countIn} tempos</small></div>
          <button ref={practiceButtonRef} type="button" className="scale-practice-button solo-practice-button" onClick={startPractice} disabled={!validation.ok}><Play aria-hidden="true" size={16} />Praticar solo</button>
          <p className="path-progress">{positions.length ? currentIndex + 1 : 0} de {positions.length} · {instruction}</p><p className="visually-hidden" aria-live="polite">{instruction}</p>{storageError ? <p className="validation-error" role="status">{storageError}</p> : null}
        </div>
      </aside>
    </div>
    {focusedOpen ? <FretboardPracticeOverlay title={name.trim() || 'Meu solo'} eyebrow="Solo livre" progress={(currentIndex + 1) + ' de ' + positions.length} instruction={instruction} playing={practicing} metronome={metronome} onTogglePlay={togglePractice} onExit={exitPractice} legend={<div className="scale-visual-legend" aria-label="Legenda do solo focado"><span className="legend-octave-4">Oitava 4</span><span className="legend-octave-5">Oitava 5</span><span className="legend-current">Agora</span><span className="legend-next">Próxima</span></div>}><FretboardGrid ariaLabel="Prática focada do solo livre" getPositionState={getPositionState} /></FretboardPracticeOverlay> : null}
  </div>;
}
