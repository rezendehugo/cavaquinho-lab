import { useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import useDialogFocus from '../hooks/useDialogFocus';

const shortcuts = [
  ['S / Q / B / P', 'Abrir Formas, Sequências, Braço ou Prática'],
  ['N', 'Adicionar acorde em Sequências'],
  ['F', 'Escolher forma do acorde selecionado'],
  ['Espaço', 'Iniciar, pausar ou continuar a prática'],
  ['?', 'Abrir esta ajuda']
];

export default function KeyboardHelpDialog({ open, onClose }) {
  const closeRef = useRef(null);
  const dialogRef = useDialogFocus({ open, onClose, initialFocusRef: closeRef });
  if (!open) return null;

  return createPortal(<div className="keyboard-help-backdrop" onMouseDown={event => event.target === event.currentTarget && onClose()}>
    <section ref={dialogRef} tabIndex={-1} className="keyboard-help-dialog" role="dialog" aria-modal="true" aria-labelledby="keyboard-help-title">
      <header><div><p className="eyebrow">Teclado</p><h2 id="keyboard-help-title">Atalhos do Cavaquinho Lab</h2></div><button ref={closeRef} type="button" className="icon-button" aria-label="Fechar atalhos" title="Fechar atalhos" onClick={onClose}><X size={18} aria-hidden="true" /></button></header>
      <p>Os atalhos funcionam fora de campos de texto, seletores e janelas abertas. Tab e Shift+Tab continuam alcançando todos os controles.</p>
      <dl>{shortcuts.map(([key, description]) => <div key={key}><dt><kbd>{key}</kbd></dt><dd>{description}</dd></div>)}</dl>
      <footer><button type="button" onClick={onClose}>Fechar</button></footer>
    </section>
  </div>, document.body);
}
