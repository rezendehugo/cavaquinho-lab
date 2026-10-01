import { useState } from 'react';
import { Download } from 'lucide-react';

export default function SequencePdfExport({ sequence, study, resolvedSteps, bpm = sequence?.practiceBpm }) {
  const [kind, setKind] = useState('guide');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const download = async () => {
    if (busy || !sequence?.steps.length) return;
    setBusy(true);
    setStatus('Preparando seu PDF…');
    try {
      const { createSequencePdf, sequencePdfFileName } = await import('../domain/sequencePdf');
      const pdf = await createSequencePdf({ ...sequence, practiceBpm: bpm }, { study, kind, resolvedSteps });
      pdf.save(sequencePdfFileName(sequence.title, kind));
      setStatus('PDF pronto. Abra em Arquivos ou Downloads para estudar e anotar.');
    } catch {
      setStatus('Não foi possível gerar o PDF. Suas alterações continuam aqui; tente novamente.');
    } finally { setBusy(false); }
  };
  return <div className="sequence-export">
    <div className="sequence-export-controls"><label><span>Levar meu estudo</span><select aria-label="Conteúdo do PDF" value={kind} onChange={event => setKind(event.target.value)}><option value="guide">Guia de estudo · mapa + reflexão</option><option value="map">Mapa para tocar · só acordes</option></select></label><button type="button" data-ui-text-reason="workflow" aria-label={busy ? 'Gerando PDF' : 'Baixar PDF'} title="Baixar PDF" onClick={download} disabled={busy || !sequence?.steps.length} aria-busy={busy}><Download size={17} aria-hidden="true" />{busy ? 'Gerando PDF…' : 'Baixar PDF'}</button></div>
    <p role="status">{status || (sequence?.steps.length ? 'PDF legível no tablet, para usar offline ou imprimir.' : 'Adicione um acorde para criar seu mapa em PDF.')}</p>
  </div>;
}
