import { Pause, Play, RotateCcw, SkipForward, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
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

function TomatoIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 7c-5 0-8 2.8-8 6.5S7.2 20 12 20s8-2.8 8-6.5S17 7 12 7Z" />
      <path d="m12 7-2.5-3M12 7l2.5-3M12 7 8 6M12 7l4-1" />
    </svg>
  );
}

function PomodoroTimer() {
  const timer = usePomodoroTimer();
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);
  const isRunning = timer.status === 'running';
  const primaryLabel = isRunning ? 'Pausar' : timer.status === 'paused' ? 'Retomar' : 'Iniciar';
  const isActive = timer.status !== 'idle';

  useEffect(() => {
    if (!isOpen) return undefined;
    const handlePointer = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setIsOpen(false);
    };
    const handleKey = (event) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [isOpen]);

  return (
    <div className="pomodoro-global" ref={wrapperRef}>
      <button type="button" className={isActive ? 'pomodoro-trigger active' : 'pomodoro-trigger'} onClick={() => setIsOpen(current => !current)} aria-label="Sessão de prática" aria-expanded={isOpen} title="Sessão de prática">
        <TomatoIcon />
        {isActive ? <span>{timer.timerText}</span> : null}
      </button>

      {isOpen ? (
        <section className="pomodoro-popover" aria-label="Ciclos de prática">
          <header className="pomodoro-popover-header">
            <div>
              <h2>Ciclos de prática</h2>
              <p>{phaseLabels[timer.phase]} · {timer.timerText}</p>
            </div>
            <button type="button" className="icon-control-button" onClick={() => setIsOpen(false)} aria-label="Fechar temporizador" title="Fechar temporizador">
              <X aria-hidden="true" size={16} strokeWidth={2.1} />
            </button>
          </header>

          <div className="pomodoro-settings">
            <DurationSelect label="Tempo de foco" value={timer.focusMinutes} options={focusMinuteOptions} disabled={timer.status !== 'idle'} onChange={timer.setFocusMinutes} />
            <DurationSelect label="Tempo de pausa" value={timer.breakMinutes} options={breakMinuteOptions} disabled={timer.status !== 'idle'} onChange={timer.setBreakMinutes} />
          </div>

          <div className="pomodoro-readout">
            <span>{timer.phase === 'focus' ? 'Tempo de foco' : 'Tempo de pausa'}</span>
            <strong>{timer.timerText}</strong>
            <small>Práticas concluídas: {timer.completedFocusSessions}</small>
          </div>

          <div className="pomodoro-footer-actions">
            <button type="button" className="pomodoro-primary-action" onClick={isRunning ? timer.pause : timer.start}>
              {isRunning ? <Pause aria-hidden="true" size={16} strokeWidth={2.2} /> : <Play aria-hidden="true" size={16} strokeWidth={2.2} />}
              {primaryLabel}
            </button>
            <button type="button" className="icon-control-button" onClick={timer.reset} aria-label="Reiniciar" title="Reiniciar">
              <RotateCcw aria-hidden="true" size={16} strokeWidth={2.1} />
            </button>
            <button type="button" className="icon-control-button" onClick={timer.switchPhase} aria-label="Próxima etapa" title="Próxima etapa">
              <SkipForward aria-hidden="true" size={16} strokeWidth={2.1} />
            </button>
          </div>

        </section>
      ) : null}
    </div>
  );
}

export default PomodoroTimer;
