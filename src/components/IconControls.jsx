import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight } from 'lucide-react';

const arrowIcons = {
  left: ChevronLeft,
  right: ChevronRight,
  up: ArrowUp,
  down: ArrowDown
};

export function IconControlButton({ children, ariaLabel, onClick, disabled = false, className = '', title }) {
  const classes = ['icon-control-button', className].filter(Boolean).join(' ');

  return (
    <button type="button" className={classes} aria-label={ariaLabel} title={title} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

export function ArrowControlButton({ direction, ariaLabel, onClick, disabled = false, variant = 'subtle', className = '', size = 16 }) {
  const Icon = arrowIcons[direction];
  const classes = ['arrow-control-button', 'arrow-control-button--' + variant, direction, className].filter(Boolean).join(' ');

  return (
    <IconControlButton className={classes} ariaLabel={ariaLabel} onClick={onClick} disabled={disabled}>
      <Icon aria-hidden="true" size={size} strokeWidth={2.2} />
    </IconControlButton>
  );
}
