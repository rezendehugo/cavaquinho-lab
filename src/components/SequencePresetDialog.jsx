import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { formatSequenceChord } from '../chordDisplay';
import { getCavaquinhoChords } from '../domain/chords';
import { createPresetSequence, sequencePresetDefinitions, transposePreset } from '../domain/sequencePresets';
import { findChord } from '../progressionOptimizer';
import { buildRegionalSequence } from '../domain/regionalSequence';
import { chromaticKeys } from '../sequences';
import BpmInput from '../features/metronome/BpmInput';
import useDialogFocus from '../hooks/useDialogFocus';

export default function SequencePresetDialog({ open, initialBpm, onClose, onCreate }) {
  const [presetId, setPresetId] = useState('majorSquare');
  const [tonic, setTonic] = useState('C');
  const [bpm, setBpm] = useState(initialBpm);
  const [beats, setBeats] = useState(4);
  const [walkRegions, setWalkRegions] = useState(false);
  const closeRef = useRef(null);
  const dialogRef = useDialogFocus({ open, onClose, initialFocusRef: closeRef });
  const cavaquinhoChords = getCavaquinhoChords();
  const definition = sequencePresetDefinitions.find(item => item.id === presetId);
  const chords = useMemo(() => transposePreset(presetId, tonic), [presetId, tonic]);
  const missing = useMemo(() => chords.filter(step => !findChord(cavaquinhoChords, step.key, step.suffix)), [chords]);
  const regionalPreview = useMemo(() => walkRegions ? buildRegionalSequence({ id: 'region-preview', title: definition?.label || 'Estudo', steps: chords.map(step => ({ ...step, practiceBeats: beats })) }, cavaquinhoChords) : null, [beats, cavaquinhoChords, chords, definition?.label, walkRegions]);

  useEffect(() => {
    if (!open) return;
    setBpm(initialBpm);
  }, [initialBpm, open]);

  if (!open) return null;
  const create = () => {
    const sequence = createPresetSequence({
    presetId,
    tonic,
    bpm,
    beats,
    sequenceId: `preset-${globalThis.crypto?.randomUUID?.() || Date.now()}`
    });
    onCreate(walkRegions ? buildRegionalSequence(sequence, cavaquinhoChords).sequence : sequence);
  };

  return createPortal(<div className="sequence-preset-backdrop" onMouseDown={event => event.target === event.currentTarget && onClose()}>
    <section ref={dialogRef} tabIndex={-1} className="sequence-preset-dialog" role="dialog" aria-modal="true" aria-labelledby="preset-dialog-title">
      <header>
        <div><p className="eyebrow">Biblioteca local</p><h2 id="preset-dialog-title">Exercícios prontos</h2></div>
        <button ref={closeRef} type="button" className="icon-button" onClick={onClose} aria-label="Fechar exercícios prontos" title="Fechar exercícios prontos"><X aria-hidden="true" size={18} /></button>
      </header>
      <div className="sequence-preset-fields">
        <label><span>Exercício</span><select aria-label="Exercício" value={presetId} onChange={event => {
          const nextId = event.target.value;
          setPresetId(nextId);
          const nextDefinition = sequencePresetDefinitions.find(item => item.id === nextId);
          if (nextDefinition?.fixedTonic) setTonic(nextDefinition.fixedTonic);
        }}>{sequencePresetDefinitions.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
        <label><span>Tonalidade ou início</span><select aria-label="Tonalidade ou início" value={tonic} disabled={Boolean(definition?.fixedTonic)} onChange={event => setTonic(event.target.value)}>{chromaticKeys.map(note => <option key={note}>{note}</option>)}</select></label>
        <label><span>Batidas por acorde</span><select aria-label="Batidas por acorde" value={beats} onChange={event => setBeats(Number(event.target.value))}>{Array.from({ length: 16 }, (_, index) => <option key={index + 1}>{index + 1}</option>)}</select></label>
        <div className="sequence-preset-bpm"><span>BPM recomendado</span><BpmInput value={bpm} onChange={setBpm} ariaLabel="BPM recomendado do exercício" variant="practice" /></div>
      </div>
      <div className="sequence-preset-preview">
        <strong>{definition.formula}</strong>
        <div aria-label="Prévia dos acordes">{chords.map((step, index) => <span key={`${step.key}-${step.suffix}-${index}`}>{formatSequenceChord(step)}</span>)}</div>
        {definition.loopStartIndex > 0 ? <p>Na repetição, retorna ao segundo acorde: <strong>{formatSequenceChord(chords[definition.loopStartIndex])}</strong>.</p> : <p>A sequência repete desde o primeiro acorde.</p>}
      </div>
      <label className="sequence-region-mode"><input type="checkbox" checked={walkRegions} onChange={event => setWalkRegions(event.target.checked)} /> Percorrer regiões baixa, média e aguda</label>
      {regionalPreview ? <p role={regionalPreview.complete ? 'status' : 'alert'}>{regionalPreview.complete ? 'Serão criados três blocos contínuos, com formas próprias para cada região.' : `Não há forma disponível em todas as regiões: ${[...new Set(regionalPreview.missing.map(item => item.regionLabel + ': ' + formatSequenceChord(item.step)))].join(', ')}.`}</p> : null}
      {missing.length ? <p className="missing" role="alert">Sem forma disponível: {missing.map(formatSequenceChord).join(', ')}. Substitua esses acordes antes de criar.</p> : null}
      <footer><button type="button" onClick={onClose}>Cancelar</button><button type="button" data-ui-text-reason="workflow" className="primary-button" onClick={create} disabled={missing.length > 0 || Boolean(walkRegions && !regionalPreview?.complete)}>Criar sequência</button></footer>
    </section>
  </div>, document.body);
}
