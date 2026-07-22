import { Metronome, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import MetronomeControl from './MetronomeControl';
import { useSharedMetronome } from './MetronomeContext';

function MetronomeWidget() {
  const metronome = useSharedMetronome();
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);
  const bpmInputRef = useRef(null);
  const metronomeRef = useRef(metronome);
  metronomeRef.current = metronome;

  useEffect(() => {
    if (!isOpen) return undefined;
    const closeOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setIsOpen(false);
    };
    bpmInputRef.current?.focus();
    const handlePopoverKeyboard = (event) => {
      if (event.defaultPrevented) return;
      if (event.key === 'Escape') {
        setIsOpen(false);
        return;
      }
      const target = event.target;
      const isEditable = target instanceof HTMLElement && (target.matches('input, select, textarea') || target.isContentEditable);
      if (isEditable || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        event.preventDefault();
        const current = metronomeRef.current;
        current.setBpm(current.bpm + (event.key === 'ArrowUp' ? 1 : -1));
      } else if (/^\d$/.test(event.key)) {
        event.preventDefault();
        bpmInputRef.current?.startDigitEntry(event.key);
      }
    };
    document.addEventListener('mousedown', closeOutside);
    document.addEventListener('keydown', handlePopoverKeyboard);
    return () => {
      document.removeEventListener('mousedown', closeOutside);
      document.removeEventListener('keydown', handlePopoverKeyboard);
    };
  }, [isOpen]);

  return (
    <div className="metronome-global" ref={wrapperRef}>
      <button type="button" className={metronome.isRunning ? 'metronome-trigger active' : 'metronome-trigger'} onClick={() => setIsOpen(current => !current)} aria-label="Metrônomo" aria-expanded={isOpen} title="Metrônomo">
        <Metronome aria-hidden="true" size={18} strokeWidth={2.1} />
        {metronome.isRunning ? <span>{metronome.bpm} BPM</span> : null}
      </button>
      {isOpen ? <section className="metronome-popover" aria-label="Controle do metrônomo">
        <button type="button" className="icon-control-button metronome-close" onClick={() => setIsOpen(false)} aria-label="Fechar metrônomo" title="Fechar metrônomo">
          <X aria-hidden="true" size={16} strokeWidth={2.1} />
        </button>
        <MetronomeControl metronome={metronome} bpmInputRef={bpmInputRef} />
      </section> : null}
    </div>
  );
}

export default MetronomeWidget;
