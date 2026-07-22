import { Pause, Play } from 'lucide-react';
import { useMemo, useState } from 'react';
import { formatChordName } from '../chordDisplay';
import { cavaquinhoChords } from '../domain/chords';
import { buildSequencePractice, getSequenceBeatState } from '../domain/sequencePractice';
import { useSharedMetronome } from '../features/metronome/MetronomeContext';
import BpmInput from '../features/metronome/BpmInput';
import { loadActiveSequenceId, loadSequences } from '../storage';
import FretboardGrid from './FretboardGrid';

const positionKey = (position) => position.stringIndex + ':' + position.fret;

export default function SequencePracticePanel() {
  const metronome = useSharedMetronome();
  const [sequences] = useState(loadSequences);
  const [sequenceId, setSequenceId] = useState(() => loadActiveSequenceId(loadSequences()));
  const [beatsPerChord, setBeatsPerChord] = useState(4);
  const [practicing, setPracticing] = useState(false);
  const sequence = sequences.find(item => item.id === sequenceId) || sequences[0];
  const resolved = useMemo(() => buildSequencePractice(sequence?.steps || [], cavaquinhoChords), [sequence]);
  const countIn = metronome.beatsPerMeasure;
  const practicePulse = Math.max(0, metronome.pulseIndex - countIn);
  const beatState = getSequenceBeatState(practicePulse, resolved.steps.length, beatsPerChord);
  const current = resolved.steps[beatState.chordIndex];
  const previous = resolved.steps.length ? resolved.steps[(beatState.chordIndex - 1 + resolved.steps.length) % resolved.steps.length] : null;
  const next = resolved.steps.length ? resolved.steps[(beatState.chordIndex + 1) % resolved.steps.length] : null;
  const currentKeys = new Set((current?.positions || []).map(positionKey));
  const previousKeys = new Set((previous?.positions || []).map(positionKey));
  const nextKeys = new Set((next?.positions || []).map(positionKey));
  const canPractice = resolved.steps.length > 0 && !resolved.missing.length;

  const stopPractice = () => {
    if (practicing || metronome.isRunning) metronome.stop();
    setPracticing(false);
  };

  const togglePractice = async () => {
    if (practicing) return stopPractice();
    if (await metronome.start()) setPracticing(true);
  };

  const selectSequence = (nextId) => {
    stopPractice();
    setSequenceId(nextId);
  };

  const instruction = practicing && metronome.pulseIndex <= countIn
    ? 'Contagem: ' + metronome.pulseIndex + ' de ' + countIn
    : current ? formatChordName(current.key, current.suffix) + ' · acorde ' + (beatState.chordIndex + 1) + ' de ' + resolved.steps.length + ' · troque em ' + beatState.beatsRemaining + (beatState.beatsRemaining === 1 ? ' batida' : ' batidas')
      : 'Escolha uma sequência com acordes para começar.';

  return <div className="sequence-practice-panel">
    <div className="fretboard-control-panel">
      <div className="scale-explorer sequence-practice-controls">
        <div className="sequence-practice-options">
          <label><span>Sequência</span><select aria-label="Sequência para praticar" value={sequence?.id || ''} onChange={event => selectSequence(event.target.value)}>{sequences.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
          <label><span>Batidas por acorde</span><select aria-label="Batidas por acorde" value={beatsPerChord} onChange={event => { stopPractice(); setBeatsPerChord(Number(event.target.value)); }}>{[1, 2, 4].map(value => <option key={value} value={value}>{value}</option>)}</select></label>
        </div>
        <p className="sequence-practice-path">{sequence?.steps.length ? sequence.steps.map(step => formatChordName(step.key, step.suffix)).join(' → ') : 'Esta sequência ainda não tem acordes.'}</p>
        {resolved.missing.length ? <p className="validation-error" role="status">Há acordes sem forma disponível nesta sequência.</p> : null}
        {!sequence?.steps.length ? <a className="practice-sequence-link" href={import.meta.env.BASE_URL + 'sequences'}>Adicionar acordes em Sequências</a> : null}
        <div className="scale-practice"><div><BpmInput value={metronome.bpm} onChange={metronome.setBpm} ariaLabel="BPM da prática de sequência" variant="practice" /><small>{beatsPerChord} {beatsPerChord === 1 ? 'batida' : 'batidas'} por acorde · contagem de {countIn} tempos</small></div><button type="button" className="scale-practice-button" onClick={togglePractice} disabled={!canPractice}>{practicing ? <Pause aria-hidden="true" size={16} /> : <Play aria-hidden="true" size={16} />}{practicing ? 'Parar prática' : 'Praticar sequência'}</button></div>
        <p className="path-progress">{instruction}</p>
        <p className="scale-practice-status" aria-live="polite">{instruction}</p>
        {current ? <p className="sequence-next-chord">Próximo: {formatChordName(next.key, next.suffix)}</p> : null}
      </div>
    </div>
    <div className="scale-visual-legend" aria-label="Legenda da sequência"><span className="legend-current">Acorde atual</span><span className="legend-next">Próximo acorde</span><span className="legend-played">Acorde anterior</span></div>
    <FretboardGrid ariaLabel="Notas pressionadas da sequência" mutedStrings={current?.mutedStrings || []} getPositionState={position => {
      const key = positionKey(position);
      return {
        highlighted: currentKeys.has(key),
        inScale: false,
        path: currentKeys.has(key),
        current: practicing && practicePulse > 0 && currentKeys.has(key),
        next: practicing && practicePulse > 0 && nextKeys.has(key),
        played: practicing && practicePulse > 0 && previousKeys.has(key)
      };
    }} />
  </div>;
}
