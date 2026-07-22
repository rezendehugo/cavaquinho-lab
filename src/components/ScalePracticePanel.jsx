import { Play, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import FretboardGrid from './FretboardGrid';
import FretboardPracticeOverlay from './FretboardPracticeOverlay';
import { buildPathTraversal, fretRegions, generateAnchoredScalePath, getScalePositionsInRegion, validateCustomScalePath } from '../domain/scalePaths';
import { getScaleNotes, noteMatchesPitchClass, scaleDefinitions, scaleDegreeNames } from '../domain/scales';
import { useSharedMetronome } from '../features/metronome/MetronomeContext';
import BpmInput from '../features/metronome/BpmInput';
import { chromaticKeys } from '../sequences';
import { loadScalePaths, saveScalePaths, storageErrorMessage } from '../storage';

const positionKey = (position) => position.stringIndex + ':' + position.fret;
const directionLabels = { oneWay: 'Até o fim', thereBack: 'Ida e volta' };
const spokenNotes = { C: 'Dó', Db: 'Ré bemol', D: 'Ré', Eb: 'Mi bemol', E: 'Mi', F: 'Fá', Gb: 'Sol bemol', G: 'Sol', Ab: 'Lá bemol', A: 'Lá', Bb: 'Si bemol', B: 'Si' };
const createCustomId = () => 'custom-' + (globalThis.crypto?.randomUUID?.() || Date.now());

function ScalePracticePanel() {
  const metronome = useSharedMetronome();
  const [scaleRoot, setScaleRoot] = useState('C');
  const [scaleId, setScaleId] = useState('major');
  const [region, setRegion] = useState('compact');
  const [direction, setDirection] = useState('thereBack');
  const [savedPaths, setSavedPaths] = useState(loadScalePaths);
  const [selectedPathId, setSelectedPathId] = useState('');
  const [editing, setEditing] = useState(false);
  const [draftPositions, setDraftPositions] = useState([]);
  const [draftName, setDraftName] = useState('Meu caminho');
  const [editIndex, setEditIndex] = useState(null);
  const [draftHistory, setDraftHistory] = useState([]);
  const [storageError, setStorageError] = useState('');
  const [practicing, setPracticing] = useState(false);
  const [focusedOpen, setFocusedOpen] = useState(false);
  const [routeIndex, setRouteIndex] = useState(0);
  const [playbackStartIndex, setPlaybackStartIndex] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [anchorPath, setAnchorPath] = useState(null);
  const [anchorStart, setAnchorStart] = useState(null);
  const [anchorEnd, setAnchorEnd] = useState(null);
  const [anchorSelection, setAnchorSelection] = useState('start');
  const [anchorError, setAnchorError] = useState('Escolha a nota inicial.');
  const practiceButtonRef = useRef(null);

  const scaleNotes = useMemo(() => getScaleNotes(scaleRoot, scaleId), [scaleRoot, scaleId]);
  const compatibleSavedPaths = savedPaths.filter(path => path.root === scaleRoot && path.scaleId === scaleId);
  const pendingAnchorPath = anchorStart && !anchorPath && (anchorSelection === 'end' || anchorEnd)
    ? { id: 'anchored-current', name: 'Caminho atual', root: scaleRoot, scaleId, region, start: anchorStart, end: anchorEnd, positions: anchorEnd ? [anchorStart, anchorEnd] : [anchorStart] }
    : null;
  const selectedPath = anchorPath || pendingAnchorPath || savedPaths.find(path => path.id === selectedPathId) || { id: '', name: 'Nenhum caminho', root: scaleRoot, scaleId, region, positions: [] };
  const regionalPositions = useMemo(() => getScalePositionsInRegion(scaleRoot, scaleId, region), [scaleRoot, scaleId, region]);
  const traversal = useMemo(() => buildPathTraversal(selectedPath.positions, direction), [selectedPath, direction]);
  const candidates = useMemo(() => editing && Number.isInteger(editIndex) && draftPositions[editIndex]
    ? regionalPositions.filter(position => position.midi === draftPositions[editIndex].midi)
    : [], [editing, editIndex, draftPositions, regionalPositions]);
  const countIn = metronome.beatsPerMeasure;
  const currentPosition = traversal[routeIndex];
  const nextPosition = traversal.length ? traversal[(routeIndex + 1) % traversal.length] : null;
  const playedKeys = new Set(hasStarted ? traversal.slice(0, routeIndex).map(positionKey) : []);
  const hasValidPath = selectedPath.positions.length >= 2 && Boolean(selectedPath.start && selectedPath.end) && validateCustomScalePath(selectedPath).ok;

  const stopPractice = () => {
    if (practicing || metronome.isRunning) metronome.stop();
    setPracticing(false);
  };

  const exitPractice = () => {
    stopPractice();
    setFocusedOpen(false);
    setRouteIndex(0);
    setHasStarted(false);
    requestAnimationFrame(() => practiceButtonRef.current?.focus());
  };

  const resetForSelection = (nextAnchorSelection = 'start') => {
    stopPractice();
    setEditing(false);
    setDraftPositions([]);
    setAnchorPath(null);
    setAnchorStart(null);
    setAnchorEnd(null);
    setAnchorSelection(nextAnchorSelection);
    setAnchorError(nextAnchorSelection ? 'Escolha a nota inicial.' : '');
  };

  const selectScale = (nextRoot, nextScaleId = scaleId) => {
    resetForSelection();
    setScaleRoot(nextRoot);
    setScaleId(nextScaleId);
    setRegion('compact');
    setSelectedPathId('');
  };

  const selectRegion = (nextRegion) => {
    resetForSelection();
    setRegion(nextRegion);
    setSelectedPathId('');
  };

  const startEditing = () => {
    stopPractice();
    setEditing(true);
    setDraftPositions(selectedPath.positions);
    setDraftHistory([]);
    setEditIndex(null);
    setDraftName(selectedPath.custom ? selectedPath.name : 'Meu caminho');
  };

  const chooseDraftPosition = (position) => {
    if (!Number.isInteger(editIndex)) return;
    setDraftHistory(history => history.concat([draftPositions]));
    setDraftPositions(current => current.map((item, index) => index === editIndex ? { ...position, degree: item.degree } : item));
    setEditIndex(null);
  };

  const saveDraft = () => {
    const now = new Date().toISOString();
    const path = { id: createCustomId(), name: draftName.trim() || 'Meu caminho', root: scaleRoot, scaleId, region: 'custom', start: draftPositions[0], end: draftPositions.at(-1), positions: draftPositions, custom: true, createdAt: now, updatedAt: now };
    if (!validateCustomScalePath(path).ok) return;
    const nextPaths = savedPaths.concat(path);
    if (!saveScalePaths(nextPaths).ok) return setStorageError(storageErrorMessage);
    setSavedPaths(nextPaths);
    setSelectedPathId(path.id);
    setAnchorPath(null);
    setAnchorStart(null);
    setAnchorEnd(null);
    setAnchorSelection(null);
    setAnchorError('');
    setEditing(false);
    setStorageError('');
  };

  const renameSelected = () => {
    if (!selectedPath.custom || !draftName.trim()) return;
    const nextPaths = savedPaths.map(path => path.id === selectedPath.id ? { ...path, name: draftName.trim(), updatedAt: new Date().toISOString() } : path);
    if (!saveScalePaths(nextPaths).ok) return setStorageError(storageErrorMessage);
    setSavedPaths(nextPaths);
  };

  const deleteSelected = () => {
    if (!selectedPath.custom) return;
    const nextPaths = savedPaths.filter(path => path.id !== selectedPath.id);
    if (!saveScalePaths(nextPaths).ok) return setStorageError(storageErrorMessage);
    setSavedPaths(nextPaths);
    selectRegion('compact');
  };

  const startPractice = async () => {
    setRouteIndex(0);
    setPlaybackStartIndex(0);
    setHasStarted(false);
    setFocusedOpen(true);
    const started = await metronome.start().catch(() => false);
    if (started) setPracticing(true);
    else setFocusedOpen(false);
  };

  const togglePractice = async () => {
    if (practicing) return stopPractice();
    setPlaybackStartIndex(routeIndex);
    const started = await metronome.start().catch(() => false);
    if (started) setPracticing(true);
  };

  useEffect(() => {
    const practicePulse = metronome.pulseIndex - countIn;
    if (!practicing || practicePulse < 1 || !traversal.length) return;
    setHasStarted(true);
    setRouteIndex((playbackStartIndex + practicePulse - 1) % traversal.length);
  }, [countIn, metronome.pulseIndex, playbackStartIndex, practicing, traversal.length]);

  const chooseAnchor = (position) => {
    stopPractice();
    if (anchorSelection === 'start') {
      setAnchorStart(position);
      setAnchorEnd(null);
      setAnchorPath(null);
      setAnchorSelection('end');
      setAnchorError('Agora escolha a nota final.');
      return;
    }
    if (anchorSelection !== 'end' || !anchorStart) return;
    if (position.midi === anchorStart.midi) {
      setAnchorError('Escolha uma nota final com altura diferente da inicial.');
      return;
    }
    const nextPath = generateAnchoredScalePath(scaleRoot, scaleId, region, anchorStart, position);
    setAnchorEnd(position);
    if (!nextPath.positions.length) {
      setAnchorPath(null);
      setAnchorError('Não há caminho nesta região. Use o braço inteiro.');
      setAnchorSelection(null);
      return;
    }
    setAnchorPath({ ...nextPath, id: 'anchored-current', name: 'Caminho atual' });
    setAnchorError('Caminho pronto para praticar.');
    setAnchorSelection(null);
  };

  const saveCurrentPath = () => {
    if (!selectedPath.positions.length) return;
    const now = new Date().toISOString();
    const path = { ...selectedPath, id: createCustomId(), name: 'Meu caminho', custom: true, createdAt: now, updatedAt: now };
    const nextPaths = savedPaths.concat(path);
    if (!saveScalePaths(nextPaths).ok) return setStorageError(storageErrorMessage);
    setSavedPaths(nextPaths);
    setAnchorPath(null);
    setAnchorStart(null);
    setAnchorEnd(null);
    setAnchorSelection(null);
    setAnchorError('');
    setSelectedPathId(path.id);
  };

  const useFullFretboard = () => {
    if (!anchorStart || !anchorEnd) return;
    setRegion('compact');
    const nextPath = generateAnchoredScalePath(scaleRoot, scaleId, 'compact', anchorStart, anchorEnd);
    if (nextPath.positions.length) {
      setAnchorPath({ ...nextPath, id: 'anchored-current', name: 'Caminho atual' });
      setAnchorError('Caminho criado usando o braço inteiro.');
    }
  };

  useEffect(() => {
    if (selectedPath.custom) setDraftName(selectedPath.name);
  }, [selectedPath.id, selectedPath.custom, selectedPath.name]);

  const pathKeys = new Map((editing ? draftPositions : selectedPath.positions).map(position => [positionKey(position), position]));
  const candidateKeys = new Set(candidates.map(positionKey));
  const regionalKeys = new Set(regionalPositions.map(positionKey));
  const effectiveStart = anchorStart || selectedPath.start;
  const effectiveEnd = anchorEnd || selectedPath.end;
  const getPositionState = (position) => {
    const key = positionKey(position);
    const pathPosition = pathKeys.get(key);
    const inScale = regionalKeys.has(key);
    return {
      highlighted: false,
      inScale,
      path: Boolean(pathPosition), degree: pathPosition?.degree ?? 0,
      root: inScale && noteMatchesPitchClass(position.note, scaleRoot),
      start: Boolean(effectiveStart && key === positionKey(effectiveStart)),
      end: Boolean(effectiveEnd && key === positionKey(effectiveEnd)),
      selectable: Boolean(anchorSelection && inScale),
      candidate: editing && candidateKeys.has(key),
      current: focusedOpen && hasStarted && key === positionKey(currentPosition),
      next: focusedOpen && hasStarted && key === positionKey(nextPosition),
      played: playedKeys.has(key)
    };
  };

  const degreeName = currentPosition ? scaleDegreeNames[currentPosition.degree] || 'grau da escala' : '';
  const instruction = practicing && !hasStarted
    ? 'Contagem: ' + metronome.pulseIndex + ' de ' + countIn
    : currentPosition ? currentPosition.note + currentPosition.octave + ' · corda ' + (currentPosition.stringIndex + 1) + ' · casa ' + currentPosition.fret + ' · ' + degreeName : 'Caminho indisponível.';
  const announcement = hasStarted && currentPosition
    ? spokenNotes[currentPosition.note] + currentPosition.octave + ', corda ' + (currentPosition.stringIndex + 1) + ', casa ' + currentPosition.fret + ', ' + degreeName + '.'
    : instruction;

  return <div className="scale-practice-panel scale-mode path-view">
    <div className="fretboard-control-panel">
      <div className="scale-explorer">
          <div className="scale-controls"><label><span>Tônica</span><select aria-label="Tônica da escala" value={scaleRoot} onChange={event => selectScale(event.target.value)}>{chromaticKeys.map(note => <option key={note}>{note}</option>)}</select></label><label><span>Escala</span><select aria-label="Tipo de escala" value={scaleId} onChange={event => selectScale(scaleRoot, event.target.value)}>{Object.entries(scaleDefinitions).map(([id, scale]) => <option key={id} value={id}>{scale.label}</option>)}</select></label></div>
          <p className="scale-summary">{scaleRoot} {scaleDefinitions[scaleId].label.toLowerCase()} · {scaleNotes.join(' ')}</p>
          <div className="path-controls"><label><span>Região</span><select aria-label="Região do caminho" value={region} onChange={event => selectRegion(event.target.value)}>{Object.entries(fretRegions).map(([id, item]) => <option key={id} value={id}>{item.label}</option>)}</select></label><label><span>Caminho</span><select aria-label="Caminho selecionado" value={selectedPath.id} onChange={event => { resetForSelection(null); setSelectedPathId(event.target.value); }}><option value="">Novo caminho</option>{anchorPath || pendingAnchorPath ? <option value="anchored-current">Caminho atual</option> : null}{compatibleSavedPaths.map(path => <option key={path.id} value={path.id}>{path.name}</option>)}</select></label><label><span>Percurso</span><select aria-label="Percurso da prática" value={direction} onChange={event => { stopPractice(); setDirection(event.target.value); }}>{Object.entries(directionLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label></div>
          {!editing ? <div className="path-actions"><button type="button" onClick={() => resetForSelection('start')}>{hasValidPath ? 'Alterar início e fim' : 'Escolher início e fim'}</button><button type="button" onClick={saveCurrentPath} disabled={!hasValidPath}>Salvar caminho</button><button type="button" onClick={startEditing} disabled={!hasValidPath}>Editar caminho</button>{selectedPath.custom ? <><input aria-label="Nome do caminho selecionado" value={draftName} onChange={event => setDraftName(event.target.value)} /><button type="button" onClick={renameSelected}>Salvar nome</button><button type="button" aria-label="Excluir caminho" onClick={deleteSelected}><Trash2 size={16} aria-hidden="true" /></button></> : null}</div>
            : <div className="path-editor"><p>{Number.isInteger(editIndex) ? 'Escolha outra posição para ' + draftPositions[editIndex].note + draftPositions[editIndex].octave + '.' : 'Escolha uma nota intermediária para editar.'}</p><div className="edit-step-list">{draftPositions.slice(1, -1).map((position, index) => <button type="button" key={positionKey(position)} aria-pressed={editIndex === index + 1} onClick={() => setEditIndex(index + 1)}>{position.note}{position.octave} · casa {position.fret}</button>)}</div><label><span>Nome</span><input aria-label="Nome do caminho" value={draftName} onChange={event => setDraftName(event.target.value)} /></label><div><button type="button" onClick={() => { const previous = draftHistory.at(-1); if (previous) { setDraftPositions(previous); setDraftHistory(history => history.slice(0, -1)); } }} disabled={!draftHistory.length}>Desfazer</button><button type="button" onClick={() => { setDraftPositions([]); setEditIndex(null); }}>Limpar</button><button type="button" onClick={() => { setEditing(false); setDraftPositions([]); setEditIndex(null); }}>Cancelar</button><button type="button" onClick={saveDraft} disabled={!validateCustomScalePath({ root: scaleRoot, scaleId, start: draftPositions[0], end: draftPositions.at(-1), positions: draftPositions }).ok}>Salvar caminho</button></div></div>}
          <div className="scale-practice"><div><BpmInput value={metronome.bpm} onChange={metronome.setBpm} ariaLabel="BPM da prática de escala" variant="practice" /><small>{directionLabels[direction]} · contagem de {countIn} tempos</small></div><button ref={practiceButtonRef} type="button" className="scale-practice-button" onClick={startPractice} disabled={editing || !hasValidPath}><Play aria-hidden="true" size={16} />Praticar escala</button></div>
          <p className="anchor-status" role="status">{anchorError || 'Início: ' + (effectiveStart?.note || '—') + ' · fim: ' + (effectiveEnd?.note || '—')}</p>{anchorError.includes('Não há caminho') ? <button type="button" onClick={useFullFretboard}>Usar braço inteiro</button> : null}
          <p className="path-progress">{practicing ? routeIndex + 1 : 1} de {practicing ? traversal.length : selectedPath.positions.length} · {instruction}</p><p className="scale-practice-status" aria-live="polite">{announcement}</p>{storageError ? <p className="validation-error" role="status">{storageError}</p> : null}
        </div>
    </div>
    <div className="scale-visual-legend" aria-label="Legenda do caminho"><span className="legend-octave-4">Oitava 4</span><span className="legend-octave-5">Oitava 5</span><span className="legend-root">Tônica</span><span className="legend-current">Agora</span><span className="legend-next">Próxima</span></div>
    <FretboardGrid ariaLabel={'Prática da escala de ' + scaleRoot + ' ' + scaleDefinitions[scaleId].label.toLowerCase()} getPositionState={getPositionState} editing={editing} selecting={Boolean(anchorSelection)} onChoose={editing ? chooseDraftPosition : chooseAnchor} />
    {focusedOpen ? <FretboardPracticeOverlay title={scaleRoot + ' ' + scaleDefinitions[scaleId].label.toLowerCase()} eyebrow="Prática de escala" progress={(routeIndex + 1) + ' de ' + traversal.length} instruction={announcement} playing={practicing} metronome={metronome} onTogglePlay={togglePractice} onExit={exitPractice} legend={<div className="scale-visual-legend" aria-label="Legenda da escala focada"><span className="legend-octave-4">Oitava 4</span><span className="legend-octave-5">Oitava 5</span><span className="legend-root">Tônica</span><span className="legend-current">Agora</span><span className="legend-next">Próxima</span></div>}><FretboardGrid ariaLabel={'Prática focada da escala de ' + scaleRoot} getPositionState={getPositionState} /></FretboardPracticeOverlay> : null}
  </div>;
}

export default ScalePracticePanel;
