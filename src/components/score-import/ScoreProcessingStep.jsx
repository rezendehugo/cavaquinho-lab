import { FileMusic, LoaderCircle } from 'lucide-react';

const phases = [
  { id: 'uploading', label: 'Enviando arquivo' },
  { id: 'queued', label: 'Aguardando reconhecimento' },
  { id: 'processing', label: 'Reconhecendo partitura' },
  { id: 'normalizing', label: 'Normalizando notas e cifras' },
  { id: 'preparing', label: 'Preparando revisão' }
];

export default function ScoreProcessingStep({ fileName, phase, elapsed, onCancel }) {
  const currentIndex = Math.max(0, phases.findIndex(item => item.id === phase));
  return <section className="score-processing-card" aria-labelledby="score-processing-heading">
    <LoaderCircle className="score-processing-spinner" size={32} aria-hidden="true" />
    <p className="eyebrow">Processamento privado</p>
    <h3 id="score-processing-heading">Lendo sua partitura</h3>
    <p className="score-processing-file"><FileMusic size={16} aria-hidden="true" /> {fileName}</p>
    <ol className="score-processing-phases">
      {phases.map((item, index) => <li key={item.id} className={index < currentIndex ? 'complete' : index === currentIndex ? 'current' : ''}>
        <span aria-hidden="true" />{item.label}
      </li>)}
    </ol>
    <p role="status">{phases[currentIndex].label}. Tempo decorrido: {elapsed}s.</p>
    <small>O reconhecimento pode levar alguns minutos. Nenhuma prática será criada sem sua confirmação.</small>
    <button type="button" data-ui-text-reason="destructive" className="text-button danger-text" onClick={onCancel}>Cancelar importação</button>
  </section>;
}
