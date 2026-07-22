import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { maximumBpm, minimumBpm } from './metronomeConstants';

const normalizeBpm = (value, fallback) => {
  if (value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(maximumBpm, Math.max(minimumBpm, Math.round(parsed)));
};

const BpmInput = forwardRef(function BpmInput({ value, onChange, ariaLabel = 'Batidas por minuto', variant = 'default' }, ref) {
  const [draft, setDraft] = useState(String(value));
  const inputRef = useRef(null);
  const skipBlurRef = useRef(false);

  useEffect(() => setDraft(String(value)), [value]);

  const commit = () => {
    if (skipBlurRef.current) {
      skipBlurRef.current = false;
      return;
    }
    const next = normalizeBpm(draft, value);
    setDraft(String(next));
    if (next !== value) onChange(next);
  };

  const step = (direction) => {
    const next = normalizeBpm(value + direction, value);
    setDraft(String(next));
    onChange(next);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      step(event.key === 'ArrowUp' ? 1 : -1);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      commit();
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      skipBlurRef.current = true;
      setDraft(String(value));
      inputRef.current?.blur();
    }
  };

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
    startDigitEntry: (digit) => {
      setDraft(String(digit));
      inputRef.current?.focus();
    }
  }), []);

  return <label className={'bpm-input bpm-input-' + variant}>
    <input ref={inputRef} type="text" role="spinbutton" inputMode="numeric" pattern="[0-9]*" aria-label={ariaLabel} aria-valuemin={minimumBpm} aria-valuemax={maximumBpm} aria-valuenow={normalizeBpm(draft, value)} value={draft} onFocus={event => event.currentTarget.select()} onChange={event => setDraft(event.target.value.replace(/\D/g, '').slice(0, 3))} onBlur={commit} onKeyDown={handleKeyDown} />
    <small>BPM</small>
  </label>;
});

export default BpmInput;
