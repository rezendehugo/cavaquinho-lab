import { useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function FocusedPracticePortal({ ariaLabel, className, onEscape, onKeyDown, children }) {
  useEffect(() => {
    const root = document.getElementById('root') || document.body.firstElementChild;
    root?.setAttribute('inert', '');
    root?.setAttribute('aria-hidden', 'true');
    document.body.classList.add('focused-practice-active');
    document.body.classList.add('sequence-practice-active');
    return () => {
      root?.removeAttribute('inert');
      root?.removeAttribute('aria-hidden');
      document.body.classList.remove('focused-practice-active');
      document.body.classList.remove('sequence-practice-active');
    };
  }, []);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') onEscape();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onEscape]);

  return createPortal(<div className={className} role="dialog" aria-modal="true" aria-label={ariaLabel} tabIndex={-1} onKeyDown={onKeyDown}>{children}</div>, document.body);
}
