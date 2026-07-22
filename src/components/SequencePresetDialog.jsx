import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { formatSequenceChord } from '../chordDisplay';
import { cavaquinhoChords } from '../domain/chords';
import { createPresetSequence, sequencePresetDefinitions, transposePreset } from '../domain/sequencePresets';
import { findChord } from '../progressionOptimizer';
import { chromaticKeys } from '../sequences';
import BpmInput from '../features/metronome/BpmInput';

export default function SequencePresetDialog({ open, initialBpm, onClose, onCreate }) {
  const [presetId, setPresetId] = useState('majorSquare');
  const [tonic, setTonic] = useState('C');
  const [bpm, setBpm] = useState(initialBpm);
  const [beats, setBeats] = useState(4);
  const closeRef = useRef(null);
  const definition = sequencePresetDefinitions.find(item => item.id === presetId);
  const chords = useMemo(() => transposePreset(presetId, tonic), [presetId, tonic]);
  const missing = useMemo(() => chords.filter(step => !findChord(cavaquinhoChords, step.key, step.suffix)), [chords]);

  useEffect(() => {
    if (!open) return;
    setBpm(initialBpm);
    requestAnimationFrame(() => closeRef.current?.focus());
    const handleEscape = (event) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [initialBpm, onClose, open]);

  if (!open) return null;
  const create = () => onCreate(createPresetSequence({
    presetId,
    tonic,
    bpm,
    beats,
    sequenceId: `preset-${globalThis.crypto?.randomUUID?.() || Date.now()}`
  }));

  return createPortal(<div className="sequence-preset-backdrop" onMouseDown={event => event.target === event.currentTarget && onClose()}>
    <section className="sequence-preset-dialog" role="dialog" aria-modal="true" aria-labelledby="preset-dialog-title">
      <header>
        <div><p className="eyebrow">Biblioteca local</p><h2 id="preset-dialog-title">Exercícios prontos</h2></div>
        <button ref={closeRef} type="button" className="icon-button" onClick={onClose} aria-label="Fechar exercícios prontos"><X aria-hidden="true" size={18} /></button>
      </header>
      <div className="sequence-preset-fields">
        <label><span>Exercício</span><select aria-label="Exercício" value={presetId} onChange={event => setPresetId(event.target.value)}>{sequencePresetDefinitions.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
        <label><span>Tonalidade ou início</span><select aria-label="Tonalidade ou início" value={tonic} onChange={event => setTonic(event.target.value)}>{chromaticKeys.map(note => <option key={note}>{note}</option>)}</select></label>
        <label><span>Batidas por acorde</span><select aria-label="Batidas por acorde" value={beats} onChange={event => setBeats(Number(event.target.value))}>{Array.from({ length: 16 }, (_, index) => <option key={index + 1}>{index + 1}</option>)}</select></label>
        <div className="sequence-preset-bpm"><span>BPM recomendado</span><BpmInput value={bpm} onChange={setBpm} ariaLabel="BPM recomendado do exercício" variant="practice" /></div>
      </div>
      <div className="sequence-preset-preview">
        <strong>{definition.formula}</strong>
        <div aria-label="Prévia dos acordes">{chords.map((step, index) => <span key={`${step.key}-${step.suffix}-${index}`}>{formatSequenceChord(step)}</span>)}</div>
        {definition.loopStartIndex > 0 ? <p>Na repetição, retorna ao segundo acorde: <strong>{formatSequenceChord(chords[definition.loopStartIndex])}</strong>.</p> : <p>A sequência repete desde o primeiro acorde.</p>}
      </div>
      {missing.length ? <p className="missing" role="alert">Sem forma disponível: {missing.map(formatSequenceChord).join(', ')}. Substitua esses acordes antes de criar.</p> : null}
      <footer><button type="button" onClick={onClose}>Cancelar</button><button type="button" className="primary-button" onClick={create} disabled={missing.length > 0}>Criar sequência</button></footer>
    </section>
  </div>, document.body);
}
