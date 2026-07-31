import { Clock3, RotateCcw, Trash2 } from 'lucide-react';
import IconButton from '../IconButton';

export default function ScoreImportHistory({ items, busy, onOpen, onRetry, onDelete, onRefresh }) {
  return <section className="score-import-history" aria-labelledby="score-import-history-title">
    <header><div><p className="eyebrow">Histórico privado</p><h3 id="score-import-history-title"><Clock3 size={18} /> Importações anteriores</h3></div><IconButton label="Atualizar importações" onClick={onRefresh} disabled={busy}><RotateCcw size={16} /></IconButton></header>
    {items.length ? <div className="score-import-history-list">{items.map(({ item, summary }) =>
      <article key={item.id}>
        <div><strong>{summary?.title || item.originalName}</strong><span>{new Date(item.createdAt).toLocaleDateString('pt-BR')} · {item.status} · {summary?.measureCount ?? 0} medidas</span><small>{summary?.chordCount ?? 0} cifras · {summary?.melodyEventCount ?? 0} eventos</small></div>
        <div><button type="button" data-ui-text-reason="workflow" onClick={() => onOpen(item.id)} disabled={busy || !summary}>Abrir revisão</button><button type="button" onClick={() => onRetry(item.id)} disabled={busy || ['queued', 'processing'].includes(item.status)}>Reprocessar</button><IconButton label={`Excluir ${summary?.title || item.originalName}`} onClick={() => onDelete(item.id)} disabled={busy}><Trash2 size={16} /></IconButton></div>
      </article>)}</div> : <p>Nenhuma importação processada ainda.</p>}
  </section>;
}
