import { useEffect, useRef, useState } from 'react';
import { formatChordName, formatSuffix, qualityLabels } from '../chordDisplay';
import { parseQualityInput, parseRootInput } from '../domain/chordInput';
import { ArrowControlButton } from './IconControls';

function ChordPartControl({ id, className, label, value, placeholder, previousLabel, nextLabel, onPrevious, onNext, onCommit }) {
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState('');
  const cancelBlurRef = useRef(false);
  const errorId = id + '-error';

  useEffect(() => { setDraft(value); setError(''); }, [value]);

  const commit = () => {
    if (onCommit(draft)) return setError('');
    setError('Acorde não disponível.');
  };

  const handleBlur = () => {
    if (cancelBlurRef.current) return void (cancelBlurRef.current = false);
    commit();
  };

  const handleKeyDown = (event) => {
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      (event.key === 'ArrowUp' ? onPrevious : onNext)();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      commit();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      cancelBlurRef.current = true;
      setDraft(value);
      setError('');
      event.currentTarget.blur();
    }
  };

  return (
    <span className={'chord-identity-part ' + className} onPointerDown={(event) => {
      if (event.pointerType === 'touch') event.currentTarget.classList.add('touch-revealed');
    }} onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.classList.remove('touch-revealed');
    }}>
      <input id={id} className="chord-identity-input" aria-label={label} aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined} value={draft} placeholder={placeholder}
        size="1" autoCapitalize="none" autoComplete="off" spellCheck="false"
        onChange={(event) => { setDraft(event.target.value); setError(''); }} onBlur={handleBlur} onKeyDown={handleKeyDown} />
      <ArrowControlButton direction="up" className="chord-identity-arrow chord-identity-arrow--previous" ariaLabel={previousLabel} onClick={onPrevious} size={13} />
      <ArrowControlButton direction="down" className="chord-identity-arrow chord-identity-arrow--next" ariaLabel={nextLabel} onClick={onNext} size={13} />
      <span id={errorId} className="chord-identity-error" aria-live="polite">{error}</span>
    </span>
  );
}

function ChordIdentityControl({ root, displayRoot, suffix, index, availableSuffixes, onPreviousRoot, onNextRoot, onPreviousSuffix, onNextSuffix, onCommitChord, onCommitSuffix }) {
  const chordName = formatChordName(root, suffix, displayRoot);
  const qualityLabel = qualityLabels[suffix] || suffix;
  const step = index + 1;
  const commitRoot = (draft) => {
    const parsed = parseRootInput(draft, suffix);
    if (!parsed || !availableSuffixes(parsed.key).includes(parsed.suffix)) return false;
    onCommitChord(parsed.key, parsed.suffix, parsed.displayKey);
    return true;
  };
  const commitSuffix = (draft) => {
    const parsed = parseQualityInput(draft);
    if (!parsed || !availableSuffixes(root).includes(parsed)) return false;
    onCommitSuffix(parsed);
    return true;
  };

  return (
    <div className="chord-identity-control" aria-label={'Acorde ' + chordName + ': ' + qualityLabel} title={'Acorde ' + chordName + ': ' + qualityLabel}>
      <ChordPartControl id={'chord-root-' + index} className="chord-identity-root" label={'Nota do acorde ' + step}
        value={displayRoot || root} previousLabel={'Nota anterior do acorde ' + step} nextLabel={'Próxima nota do acorde ' + step}
        onPrevious={onPreviousRoot} onNext={onNextRoot} onCommit={commitRoot} />
      <ChordPartControl id={'chord-quality-' + index} className="chord-identity-suffix" label={'Sufixo do acorde ' + step}
        value={formatSuffix(suffix)} placeholder="maj" previousLabel={'Sufixo anterior do acorde ' + step}
        nextLabel={'Próximo sufixo do acorde ' + step} onPrevious={onPreviousSuffix} onNext={onNextSuffix} onCommit={commitSuffix} />
    </div>
  );
}

export default ChordIdentityControl;
