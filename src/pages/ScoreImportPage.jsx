import { useState } from 'react';
import { createScorePractice, importMusicXml, validateScoreImport } from '../services/scoreImports';
import ScorePreview from '../components/ScorePreview';

function Confidence({ value }) { return <span className={value < 0.8 ? 'score-confidence uncertain' : 'score-confidence'}>{Math.round(value * 100)}%</span>; }

export default function ScoreImportPage() {
  const [result, setResult] = useState(null);
  const [artifacts, setArtifacts] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('MusicXML é processado como fonte simbólica; PDF/OMR permanece beta.');
  const [musicXml, setMusicXml] = useState('');
  async function handleFile(event) {
    const file = event.target.files?.[0]; if (!file) return; setBusy(true);
    try { const content = await file.text(); const imported = await importMusicXml(file, content); setMusicXml(content); setResult(imported); setArtifacts(null); setMessage(imported.item.status === 'needs_correction' ? 'Revise os problemas críticos antes de criar a prática.' : 'Rascunho privado criado. Revise antes de validar.'); }
    catch (error) { setMessage(error.message); } finally { setBusy(false); }
  }
  async function approve() {
    setBusy(true);
    try { const item = await validateScoreImport(result.item.id); const created = await createScorePractice(item.id); setResult(current => ({ ...current, item })); setArtifacts(created); setMessage('Rascunho validado; exercícios gerados sem substituir seus dados locais.'); }
    catch (error) { setMessage(error.message); } finally { setBusy(false); }
  }
  return <section className="panel score-import-page" aria-labelledby="score-import-title">
    <header><p className="eyebrow">Importação privada</p><h2 id="score-import-title">Partitura para prática</h2><p>Importe uma pauta melódica monofônica com cifras, revise medida por medida e só então crie exercícios.</p></header>
    <div className="score-import-upload"><label className="button"><span>{busy ? 'Processando…' : 'Escolher MusicXML'}</span><input type="file" accept=".musicxml,.xml,application/xml,text/xml" disabled={busy} onChange={handleFile} /></label><small>Máximo de 20 MB. O arquivo e o rascunho são privados.</small></div>
    <p className="score-import-status" role="status">{message}</p>
    {result?.draft && <div className="score-review-workspace"><aside><h3>{result.draft.title}</h3><p>{result.draft.meter.beats}/{result.draft.meter.beatType} · {result.draft.tempo} BPM</p><p>Revisão {result.draft.revision}</p><button type="button" disabled={busy || result.item.status === 'needs_correction'} onClick={approve}>Validar e criar prática</button></aside>
      <ScorePreview musicXml={musicXml} />
      <div className="score-measures" aria-label="Medidas reconhecidas">{result.draft.measures.map(measure => <article key={measure.number} className={measure.issues.some(issue => issue.severity === 'critical') ? 'has-critical-issue' : ''}><header><h3>Medida {measure.number}</h3><span>{measure.events.reduce((sum, event) => sum + event.durationTicks, 0)}/{measure.expectedTicks} ticks</span></header><p><strong>Cifras:</strong> {measure.chords.length ? measure.chords.map(chord => <span key={chord.id}>{chord.symbol} <Confidence value={chord.confidence} /> </span>) : '—'}</p><ol>{measure.events.map(event => <li key={event.id}>{event.rest ? 'Pausa' : `${event.pitch.step}${event.pitch.alter === 1 ? '♯' : event.pitch.alter === -1 ? '♭' : ''}${event.pitch.octave}`} · {event.durationTicks} ticks <Confidence value={event.confidence} /></li>)}</ol>{measure.issues.map(issue => <p className="validation-error" key={issue.code}>{issue.message}</p>)}</article>)}</div></div>}
    {artifacts && <p className="score-import-success">{artifacts.sequence?.steps.length || 0} cifras e {artifacts.melody?.events.length || 0} eventos rítmicos preparados.</p>}
  </section>;
}
