import { Pause, Play } from 'lucide-react';
import BpmInput from './BpmInput';

function TempoSelector({ bpm, setBpm, inputRef }) {
  const step = (direction) => {
    const next = Math.min(220, Math.max(40, bpm + direction));
    setBpm(next);
  };

  return (
    <div className="metronome-tempo">
      <span className="metronome-label">Batidas por minuto</span>
      <div className="metronome-tempo-stepper">
        <button type="button" onClick={() => step(-1)} aria-label={'Diminuir para ' + Math.max(40, bpm - 1) + ' BPM'} disabled={bpm <= 40}>{Math.max(40, bpm - 1)} <small>BPM</small></button>
        <BpmInput ref={inputRef} value={bpm} onChange={setBpm} />
        <button type="button" onClick={() => step(1)} aria-label={'Aumentar para ' + Math.min(220, bpm + 1) + ' BPM'} disabled={bpm >= 220}>{Math.min(220, bpm + 1)} <small>BPM</small></button>
      </div>
      <small className="metronome-keyboard-help">Use ↑ ↓ ou digite um número entre 40 e 220.</small>
    </div>
  );
}

function MeterSelector({ value, onChange }) {
  return (
    <div className="metronome-meter">
      <span className="metronome-label">Compasso</span>
      <div className="metronome-meter-options" role="group" aria-label="Escolher compasso">
        {[2, 3, 4].map(beats => <button key={beats} type="button" aria-label={'Selecionar compasso ' + beats + '/4'} aria-pressed={value === beats} onClick={() => onChange(beats)}>{beats}/4</button>)}
      </div>
    </div>
  );
}

function MetronomeControl({ metronome, bpmInputRef }) {
  return (
    <section className="metronome" aria-label="Metrônomo">
      <header className="metronome-header">
        <h3>Metrônomo</h3>
        <p>{metronome.bpm} BPM · {metronome.beatsPerMeasure}/4</p>
      </header>
      <TempoSelector bpm={metronome.bpm} setBpm={metronome.setBpm} inputRef={bpmInputRef} />
      <MeterSelector value={metronome.beatsPerMeasure} onChange={metronome.setBeatsPerMeasure} />
      <div className="metronome-beats" aria-label={'Batida ' + (metronome.currentBeat + 1) + ' de ' + metronome.beatsPerMeasure}>
        {Array.from({ length: metronome.beatsPerMeasure }, (_, index) => <span key={index} className={metronome.isRunning && index === metronome.currentBeat ? 'active' : ''} />)}
      </div>
      <button type="button" className="pomodoro-primary-action metronome-primary-action" onClick={metronome.isRunning ? metronome.stop : metronome.start}>
        {metronome.isRunning ? <Pause aria-hidden="true" size={16} /> : <Play aria-hidden="true" size={16} />}{metronome.isRunning ? 'Parar' : 'Iniciar'}
      </button>
    </section>
  );
}

export default MetronomeControl;
