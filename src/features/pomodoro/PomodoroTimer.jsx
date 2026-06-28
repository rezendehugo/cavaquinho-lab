import { Pause, Play, RotateCcw, SkipForward } from 'lucide-react';
import { breakMinuteOptions, focusMinuteOptions } from './pomodoroConstants';
import { usePomodoroTimer } from './usePomodoroTimer';

const phaseLabels = {
  focus: 'Foco',
  break: 'Pausa'
};

function DurationSelect({ label, value, options, disabled, onChange }) {
  return (
    <label className="pomodoro-setting">
      <span>{label}</span>
      <select value={value} disabled={disabled} onChange={(event) => onChange(Number(event.target.value))}>
        {options.map(option => <option key={option} value={option}>{option} min</option>)}
      </select>
    </label>
  );
}

function PomodoroTimer() {
  const timer = usePomodoroTimer();
  const isRunning = timer.status === 'running';
  const primaryLabel = isRunning ? 'Pausar' : timer.status === 'paused' ? 'Retomar' : 'Iniciar';

  return (
    <section className="pomodoro-widget" aria-label="Sessão de prática">
      <div className="pomodoro-status">
        <span>{phaseLabels[timer.phase]}</span>
        <strong>{timer.timerText}</strong>
        <small>{timer.completedFocusSessions} sessões</small>
      </div>
      <div className="pomodoro-actions">
        <button type="button" className="icon-control-button pomodoro-primary" onClick={isRunning ? timer.pause : timer.start} aria-label={primaryLabel} title={primaryLabel}>
          {isRunning ? <Pause aria-hidden="true" size={15} strokeWidth={2.2} /> : <Play aria-hidden="true" size={15} strokeWidth={2.2} />}
        </button>
        <button type="button" className="icon-control-button" onClick={timer.reset} aria-label="Reiniciar" title="Reiniciar">
          <RotateCcw aria-hidden="true" size={15} strokeWidth={2.2} />
        </button>
        <button type="button" className="icon-control-button" onClick={timer.switchPhase} aria-label="Próxima etapa" title="Próxima etapa">
          <SkipForward aria-hidden="true" size={15} strokeWidth={2.2} />
        </button>
      </div>
      <div className="pomodoro-settings">
        <DurationSelect label="Tempo de foco" value={timer.focusMinutes} options={focusMinuteOptions} disabled={timer.status !== 'idle'} onChange={timer.setFocusMinutes} />
        <DurationSelect label="Tempo de pausa" value={timer.breakMinutes} options={breakMinuteOptions} disabled={timer.status !== 'idle'} onChange={timer.setBreakMinutes} />
      </div>
    </section>
  );
}

export default PomodoroTimer;
