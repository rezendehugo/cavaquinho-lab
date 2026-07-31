import { Check, CircleAlert } from 'lucide-react';

const steps = [
  { id: 'upload', label: 'Enviar' },
  { id: 'processing', label: 'Processar' },
  { id: 'review', label: 'Revisar' },
  { id: 'success', label: 'Praticar' }
];

export default function ScoreImportStepper({ current, failed = false, onNavigate }) {
  const currentIndex = steps.findIndex(step => step.id === current);
  return <ol className="score-import-stepper" aria-label="Progresso da importação">
    {steps.map((step, index) => {
      const state = failed && index === currentIndex ? 'error' : index < currentIndex ? 'complete' : index === currentIndex ? 'current' : 'pending';
      const canNavigate = (step.id === 'upload' && currentIndex > 0)
        || (step.id === 'review' && current === 'success');
      return <li key={step.id} className={state} aria-current={state === 'current' ? 'step' : undefined}>
        {canNavigate ? <button
          type="button"
          className="score-step-navigation"
          aria-label={`Voltar para etapa ${step.label}`}
          title={`Voltar para etapa ${step.label}`}
          onClick={() => onNavigate(step.id)}
        >
          <span className="score-step-marker" aria-hidden="true">
            {state === 'complete' ? <Check size={15} /> : index + 1}
          </span>
          <span>{step.label}</span>
        </button> : <>
          <span className="score-step-marker" aria-hidden="true">
            {state === 'complete' ? <Check size={15} /> : state === 'error' ? <CircleAlert size={15} /> : index + 1}
          </span>
          <span>{step.label}</span>
        </>}
      </li>;
    })}
  </ol>;
}
