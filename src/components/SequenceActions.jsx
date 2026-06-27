import { Plus } from 'lucide-react';

export function AddSequenceButton({ onClick }) {
  return (
    <button type="button" className="new-sequence-button icon-button" onClick={onClick} aria-label="Adicionar sequência" title="Adicionar sequência">
      <Plus aria-hidden="true" size={18} strokeWidth={2.5} />
    </button>
  );
}

export function AddChordSlot({ onClick }) {
  return (
    <button type="button" className="add-lab-card" onClick={onClick} aria-label="Adicionar acorde" title="Adicionar acorde">
      <Plus aria-hidden="true" size={30} strokeWidth={2.2} />
    </button>
  );
}
