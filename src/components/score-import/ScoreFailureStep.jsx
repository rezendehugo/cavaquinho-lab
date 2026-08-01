import { CircleAlert, FilePlus2, RotateCcw } from 'lucide-react';
import IconButton from '../IconButton';

export default function ScoreFailureStep({ title, message, code, canRetry, onRetry, onReset }) {
  return <section className="score-failure-card" role="alert" aria-labelledby="score-failure-title">
    <CircleAlert size={30} aria-hidden="true" />
    <div>
      <p className="eyebrow">Importação interrompida</p>
      <h3 id="score-failure-title">{title}</h3>
      <p>{message}</p>
      {code ? <details><summary>Detalhes técnicos</summary><code>{code}</code></details> : null}
      <div className="score-failure-actions">
        {canRetry ? <IconButton className="primary-button" label="Tentar novamente" onClick={onRetry}><RotateCcw size={17} /></IconButton> : null}
        <IconButton className="secondary-button" label="Escolher outro arquivo" onClick={onReset}><FilePlus2 size={17} /></IconButton>
      </div>
    </div>
  </section>;
}
