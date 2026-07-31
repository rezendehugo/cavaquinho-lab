import { CheckCircle2, Download, ListMusic, Music2, RotateCcw } from 'lucide-react';
import { buildChordMarkdown, downloadMarkdown } from '../../domain/practiceExports';
import TabScoreSheet from '../TabScoreSheet';

export default function ScoreResultStep({ artifacts, persistenceReport, onOpenPractice, onReview, onReset }) {
  const sequenceCount = artifacts.sequence?.steps.length ?? 0;
  const melodyCount = artifacts.melody?.events.length ?? 0;
  return <section className="score-result-step" aria-labelledby="score-result-heading">
    <CheckCircle2 size={42} aria-hidden="true" />
    <p className="eyebrow">Importação concluída</p>
    <h3 id="score-result-heading">Sua prática está pronta</h3>
    <p>A partitura original continua privada e o rascunho permanece disponível para revisão.</p>
    <div className="score-result-cards">
      {artifacts.sequence ? <article><ListMusic size={24} /><div><strong>Sequência de acordes</strong><span>{persistenceReport?.sequenceCreated ? `${sequenceCount} cifras preparadas` : 'Revise as cifras não reconhecidas'}</span></div><div className="score-result-card-actions"><button type="button" data-ui-text-reason="workflow" className="primary-button" disabled={!persistenceReport?.sequenceCreated} onClick={() => onOpenPractice('sequence', artifacts.sequence.id)}>Praticar sequência</button>{persistenceReport?.sequence ? <button type="button" data-ui-text-reason="workflow" onClick={() => downloadMarkdown(buildChordMarkdown(persistenceReport.sequence))}><Download size={15} /> Exportar acordes</button> : null}</div></article> : null}
      {artifacts.melody ? <article><Music2 size={24} /><div><strong>Solo com melodia</strong><span>{melodyCount} eventos rítmicos preparados</span></div><div className="score-result-card-actions"><button type="button" data-ui-text-reason="workflow" className="primary-button" onClick={() => onOpenPractice('solo', artifacts.melody.id)}>Praticar solo</button></div></article> : null}
    </div>
    {artifacts.tabScore ? <TabScoreSheet score={artifacts.tabScore} /> : null}
    {persistenceReport?.rejected?.length ? <div className="score-import-rejections" role="alert"><strong>{persistenceReport.rejected.length} cifras precisam de correção</strong><ul>{persistenceReport.rejected.slice(0, 12).map(item => <li key={item.id}>Medida {item.measure}: <code>{item.symbol}</code> — símbolo não reconhecido</li>)}</ul></div> : null}
    <div className="score-result-actions">
      <button type="button" data-ui-text-reason="workflow" className="secondary-button" onClick={onReview}>Revisar novamente</button>
      <button type="button" data-ui-text-reason="workflow" className="text-button" onClick={onReset}><RotateCcw size={15} /> Importar outra partitura</button>
    </div>
  </section>;
}
