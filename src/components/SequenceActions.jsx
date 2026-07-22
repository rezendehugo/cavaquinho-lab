import { Plus } from 'lucide-react';

export function AddSequenceButton({ onClick }) {
  return (
    <button type="button" className="new-sequence-button icon-button" onClick={onClick} aria-label="Adicionar sequência" title="Adicionar sequência">
      <Plus aria-hidden="true" size={18} strokeWidth={2.5} />
    </button>
  );
}

export function AddChordSlot({ onClick, disabled = false, title = 'Adicionar acorde' }) {
  return (
    <button type="button" className="add-lab-card" onClick={onClick} disabled={disabled} aria-label={title} title={title}>
      <Plus aria-hidden="true" size={30} strokeWidth={2.2} />
      {disabled ? <span>Limite de 50 acordes</span> : null}
    </button>
  );
}
