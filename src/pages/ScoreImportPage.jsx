import { FileMusic } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import ScoreFailureStep from '../components/score-import/ScoreFailureStep';
import ScoreImportStepper from '../components/score-import/ScoreImportStepper';
import ScoreImportHistory from '../components/score-import/ScoreImportHistory';
import ScoreProcessingStep from '../components/score-import/ScoreProcessingStep';
import ScoreResultStep from '../components/score-import/ScoreResultStep';
import ScoreReviewStep from '../components/score-import/ScoreReviewStep';
import ScoreUploadStep from '../components/score-import/ScoreUploadStep';
import { parseRootInput } from '../domain/chordInput';
import { buildTabScore } from '../domain/tabScore';
import { MAX_SEQUENCE_STEPS } from '../sequences';
import {
  activeSequenceStorageKey, loadFreeSolos, loadSequences, saveFreeSolos, sequencesStorageKey, writeStorage
} from '../storage';
import {
  createScorePractice, deleteScoreImport, getScoreImport, getScoreSourceUrl, importMusicXml,
  listScoreImports, retryScoreImport, updateScoreMeasure, uploadScore, validateScoreImport, waitForScoreImport
} from '../services/scoreImports';

const activeImportSessionKey = 'cavaquinhoLabActiveScoreImport';
const maximumFileSize = 20 * 1024 * 1024;
const supportedFilePattern = /\.(pdf|mxl|musicxml|xml)$/i;

const errorMessages = {
  encrypted_pdf: ['Este PDF está protegido', 'Remova a senha do arquivo e tente novamente.'],
  invalid_pdf_signature: ['O arquivo não é um PDF válido', 'Escolha o arquivo original ou exporte a partitura novamente.'],
  pdf_page_limit: ['A partitura tem páginas demais', 'Use um arquivo com até 20 páginas.'],
  pdf_size_limit: ['O arquivo é muito grande', 'Use um arquivo com até 20 MB.'],
  no_musical_content: ['Não encontramos conteúdo musical', 'Confira se o PDF contém uma partitura impressa legível.'],
  no_musical_systems: ['Não encontramos pautas musicais', 'Tente uma versão com melhor resolução ou menos ruído.'],
  image_too_large: ['A página é grande demais para reconhecimento', 'Tente novamente; o sistema tentará normalizar a página automaticamente.'],
  audiveris_timeout: ['O reconhecimento demorou além do esperado', 'Tente novamente ou divida a partitura em arquivos menores.'],
  audiveris_export_failed: ['A partitura precisa de revisão antes da exportação', 'O reconhecimento encontrou elementos, mas não conseguiu formar uma partitura válida.'],
  musicxml_empty: ['O reconhecimento não produziu notas', 'Tente uma versão mais nítida da partitura.'],
  musicxml_invalid: ['O resultado musical ficou inválido', 'Tente novamente ou escolha outro arquivo.'],
  mxl_member_limit: ['O arquivo MXL possui itens demais', 'Exporte novamente a partitura como um único arquivo MusicXML.'],
  mxl_size_limit: ['O conteúdo do MXL é grande demais', 'Exporte uma versão menor da partitura.'],
  encrypted_mxl: ['O arquivo MXL está protegido', 'Exporte novamente sem senha ou criptografia.'],
  invalid_mxl_path: ['A estrutura do MXL é inválida', 'Exporte novamente usando um editor de partituras confiável.'],
  audiveris_failed: ['Não conseguimos reconhecer esta partitura', 'Tente novamente ou use MusicXML para obter um resultado mais confiável.'],
  api_unavailable: ['A API de importação está indisponível', 'Inicie o backend local ou tente novamente quando o serviço estiver acessível.'],
  upload_transport_blocked: ['O navegador bloqueou o envio do arquivo', 'Verifique a configuração CORS da API e tente novamente.'],
  omr_worker_unavailable: ['O reconhecimento está indisponível', 'O serviço de partituras não está disponível neste momento.']
};

function describeError(error) {
  const code = error instanceof Error ? error.message : 'import_failed';
  const uploadResponseError = code.startsWith('upload_http_')
    ? ['A API recusou o envio do arquivo', `O serviço respondeu com ${code.replace('upload_http_', 'HTTP ')}.`]
    : null;
  const [title, message] = errorMessages[code] || uploadResponseError
    || ['Não foi possível concluir a importação', 'Você pode tentar novamente ou escolher outro arquivo.'];
  return { code, title, message };
}

function readBlobText(blob) {
  if (typeof blob.text === 'function') return blob.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => resolve(String(reader.result || '')));
    reader.addEventListener('error', () => reject(reader.error || new Error('file_read_failed')));
    reader.readAsText(blob);
  });
}

function persistArtifacts(artifacts) {
  const report = { sequenceCreated: false, sequence: null, rejected: [] };
  if (artifacts.sequence) {
    const parsedSteps = artifacts.sequence.steps.slice(0, MAX_SEQUENCE_STEPS).flatMap(step => {
      const parsed = parseRootInput(step.symbol, 'major');
      if (!parsed) {
        report.rejected.push(step);
        return [];
      }
      return [{ ...parsed, sourceSymbol: step.symbol, measure: step.measure, offsetTicks: step.offsetTicks, sourceStepId: step.id }];
    });
    if (artifacts.sequence.steps.length > MAX_SEQUENCE_STEPS) {
      report.rejected.push(...artifacts.sequence.steps.slice(MAX_SEQUENCE_STEPS).map(step => ({ ...step, reason: 'sequence_limit' })));
    }
    if (parsedSteps.length) {
      const sequence = {
        id: artifacts.sequence.id, title: artifacts.sequence.title, sourceImportId: artifacts.sequence.sourceImportId,
        practiceBpm: 80, loopStartIndex: 0,
        steps: parsedSteps.map((chord, index) => ({
          id: chord.sourceStepId || `${artifacts.sequence.id}-step-${index + 1}`, ...chord, positionIndex: null, practiceBeats: 4
        }))
      };
      writeStorage(sequencesStorageKey, JSON.stringify(loadSequences().concat(sequence)));
      writeStorage(activeSequenceStorageKey, sequence.id);
      report.sequenceCreated = true;
      report.sequence = sequence;
    }
  }
  if (artifacts.melody) {
    const positions = artifacts.melody.events.flatMap(event => {
      const position = event.suggestedPosition;
      if (!position || event.rest || !event.pitch) return [];
      return [{
        ...position, pitchClass: position.midi % 12, octave: Math.floor(position.midi / 12) - 1,
        note: `${event.pitch.step}${event.pitch.alter === 1 ? '#' : event.pitch.alter === -1 ? 'b' : ''}`
      }];
    });
    if (positions.length) saveFreeSolos(loadFreeSolos().concat({
      id: artifacts.melody.id, name: artifacts.melody.title,
      sourceImportId: artifacts.melody.sourceImportId, positions,
      rhythm: {
        ticksPerQuarter: artifacts.melody.ticksPerQuarter, meter: artifacts.melody.meter,
        tempo: artifacts.melody.tempo, events: artifacts.melody.events
      },
      updatedAt: new Date().toISOString()
    }));
  }
  return report;
}

async function validateSelectedFile(file) {
  if (!supportedFilePattern.test(file.name)) return 'Escolha um arquivo PDF, MusicXML ou MXL.';
  if (file.size > maximumFileSize) return 'O arquivo deve ter no máximo 20 MB.';
  if (file.size === 0) return 'O arquivo está vazio.';
  if (/\.pdf$/i.test(file.name)) {
    const header = await readBlobText(file.slice(0, 5));
    if (header !== '%PDF-') return 'O arquivo selecionado não possui uma assinatura PDF válida.';
  }
  return '';
}

export default function ScoreImportPage({ embedded = false, onOpenPractice = () => undefined }) {
  const [flow, setFlow] = useState('upload');
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState('');
  const [result, setResult] = useState(null);
  const [artifacts, setArtifacts] = useState(null);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState('uploading');
  const [elapsed, setElapsed] = useState(0);
  const [failure, setFailure] = useState(null);
  const [musicXml, setMusicXml] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [sourcePreviewUnavailable, setSourcePreviewUnavailable] = useState(false);
  const [targets, setTargets] = useState({ sequence: true, melody: true });
  const [history, setHistory] = useState([]);
  const [persistenceReport, setPersistenceReport] = useState(null);
  const [range, setRange] = useState({ startMeasure: 1, endMeasure: 1 });
  const activeIdRef = useRef('');

  const refreshHistory = async () => {
    try {
      const response = await listScoreImports();
      setHistory(response.items || []);
    } catch {
      setHistory([]);
    }
  };

  const openDraft = async imported => {
    const draft = imported.draft;
    setPhase('preparing');
    setResult(imported);
    setMusicXml(draft.sourceMusicXml || '');
    const first = draft.measures[0]?.number ?? 1;
    setRange({ startMeasure: first, endMeasure: draft.measures.at(-1)?.number ?? first });
    setSourceUrl('');
    setSourcePreviewUnavailable(false);
    if (imported.item.sourceType === 'pdf') {
      try {
        setSourceUrl(await getScoreSourceUrl(imported.item.id));
      } catch {
        setSourcePreviewUnavailable(true);
      }
    }
    setFlow('review');
    setBusy(false);
  };

  const monitorImport = async item => {
    activeIdRef.current = item.id;
    sessionStorage.setItem(activeImportSessionKey, item.id);
    setPhase(item.status === 'processing' ? 'processing' : 'queued');
    if (item.cacheHit && ['draft', 'needs_correction', 'ready'].includes(item.status)) {
      const cached = await getScoreImport(item.id);
      cached.item.cacheHit = true;
      return openDraft(cached);
    }
    const imported = await waitForScoreImport(item.id, {
      onProgress: status => setPhase(status === 'queued' ? 'queued' : 'processing')
    });
    await openDraft(imported);
  };

  useEffect(() => {
    refreshHistory();
    const activeId = sessionStorage.getItem(activeImportSessionKey);
    if (!activeId) return;
    activeIdRef.current = activeId;
    setBusy(true);
    setFlow('processing');
    getScoreImport(activeId).then(imported => {
      if (imported.draft && ['draft', 'needs_correction', 'ready'].includes(imported.item.status)) return openDraft(imported);
      if (imported.item.status === 'failed') throw new Error(imported.item.lastErrorCode || 'import_failed');
      return monitorImport(imported.item);
    }).catch(error => { setFailure(describeError(error)); setFlow('failure'); setBusy(false); });
  }, []);

  useEffect(() => {
    if (flow !== 'processing') return undefined;
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      const seconds = Math.floor((Date.now() - startedAt) / 1000);
      setElapsed(seconds);
      if (phase === 'processing' && seconds > 15) setPhase('normalizing');
    }, 1000);
    return () => window.clearInterval(timer);
  }, [flow, phase]);

  const chooseFile = async selected => {
    if (!selected) return;
    setFailure(null);
    const validationError = await validateSelectedFile(selected);
    setFileError(validationError);
    setFile(validationError ? null : selected);
  };

  const submit = async () => {
    if (!file) return;
    setBusy(true);
    setFailure(null);
    setFlow('processing');
    setPhase('uploading');
    setElapsed(0);
    try {
      if (/\.(xml|musicxml)$/i.test(file.name)) {
        const content = await readBlobText(file);
        const imported = await importMusicXml(file, content);
        sessionStorage.setItem(activeImportSessionKey, imported.item.id);
        activeIdRef.current = imported.item.id;
        setMusicXml(imported.draft.sourceMusicXml || content);
        await openDraft(imported);
      } else {
        await monitorImport(await uploadScore(file));
      }
    } catch (error) {
      setFailure(describeError(error));
      setFlow('failure');
      setBusy(false);
    }
  };

  const reset = async () => {
    sessionStorage.removeItem(activeImportSessionKey);
    activeIdRef.current = '';
    setFlow('upload'); setFile(null); setFileError(''); setResult(null); setArtifacts(null);
    setFailure(null); setSourceUrl(''); setSourcePreviewUnavailable(false); setMusicXml(''); setBusy(false);
  };

  const cancel = async () => {
    if (activeIdRef.current) await deleteScoreImport(activeIdRef.current).catch(() => undefined);
    await reset();
  };

  const retry = async () => {
    if (!activeIdRef.current) return reset();
    setBusy(true); setFlow('processing'); setFailure(null); setPhase('queued'); setElapsed(0);
    try { await monitorImport(await retryScoreImport(activeIdRef.current)); }
    catch (error) { setFailure(describeError(error)); setFlow('failure'); setBusy(false); }
  };

  const navigateToStep = async step => {
    if (step === 'upload') {
      if (flow === 'processing') await cancel();
      else await reset();
      return;
    }
    if (step === 'review' && result?.draft) {
      setFailure(null);
      setFlow('review');
    }
  };

  const saveMeasure = async (number, payload) => {
    setBusy(true);
    try {
      const draft = await updateScoreMeasure(result.item.id, number, payload);
      setResult(current => ({ ...current, draft, item: { ...current.item, status: draft.measures.some(measure => measure.issues.some(issue => issue.severity === 'critical')) ? 'needs_correction' : 'draft' } }));
    } catch (error) { setFailure(describeError(error)); setFlow('failure'); }
    finally { setBusy(false); }
  };

  const approve = async () => {
    setBusy(true);
    try {
      const selectedTargets = Object.entries(targets).filter(([, selected]) => selected).map(([target]) => target);
      const item = await validateScoreImport(result.item.id);
      const created = await createScorePractice(item.id, { targets: selectedTargets, range });
      setPersistenceReport(persistArtifacts(created));
      setResult(current => ({ ...current, item }));
      const positionOverrides = Object.fromEntries((created.melody?.events || []).flatMap(event => {
        const position = event.selectedPosition || event.suggestedPosition;
        return position ? [[event.id, position]] : [];
      }));
      setArtifacts({ ...created, tabScore: created.melody ? buildTabScore(result.draft, { positionOverrides }) : null });
      setFlow('success');
      sessionStorage.removeItem(activeImportSessionKey);
      refreshHistory();
    } catch (error) { setFailure(describeError(error)); setFlow('failure'); }
    finally { setBusy(false); }
  };

  const content = <>
    <header className="score-import-heading"><p className="eyebrow">Importação privada</p><h2 id="score-import-title"><FileMusic size={21} aria-hidden="true" /> Partitura para prática</h2><p>Transforme uma partitura em exercícios revisáveis, sem alterar suas práticas existentes.</p></header>
    <ScoreImportStepper
      current={flow === 'failure' ? 'processing' : flow}
      failed={flow === 'failure'}
      onNavigate={navigateToStep}
    />
    {flow === 'upload' ? <ScoreUploadStep file={file} error={fileError} onChoose={chooseFile} onClear={() => setFile(null)} onSubmit={submit} /> : null}
    {flow === 'upload' ? <ScoreImportHistory items={history} busy={busy} onRefresh={refreshHistory} onOpen={async id => {
      setBusy(true);
      try {
        activeIdRef.current = id;
        sessionStorage.setItem(activeImportSessionKey, id);
        await openDraft(await getScoreImport(id));
      } catch (error) {
        setFailure(describeError(error)); setFlow('failure'); setBusy(false);
      }
    }} onRetry={async id => {
      setBusy(true); setFlow('processing'); setPhase('queued');
      try { await monitorImport(await retryScoreImport(id)); }
      catch (error) { setFailure(describeError(error)); setFlow('failure'); setBusy(false); }
    }} onDelete={async id => {
      setBusy(true);
      try { await deleteScoreImport(id); await refreshHistory(); } finally { setBusy(false); }
    }} /> : null}
    {flow === 'processing' ? <ScoreProcessingStep fileName={file?.name || result?.item.originalName || 'Partitura'} phase={phase} elapsed={elapsed} onCancel={cancel} /> : null}
    {flow === 'failure' ? <ScoreFailureStep {...failure} canRetry={Boolean(activeIdRef.current)} onRetry={retry} onReset={reset} /> : null}
    {flow === 'review' && result?.draft ? <ScoreReviewStep
      result={result} musicXml={musicXml} sourceUrl={sourceUrl} sourcePreviewUnavailable={sourcePreviewUnavailable}
      busy={busy} range={range} targets={targets}
      onRangeChange={setRange} onTargetsChange={setTargets} onSaveMeasure={saveMeasure} onApprove={approve}
    /> : null}
    {flow === 'success' && artifacts ? <ScoreResultStep artifacts={artifacts} persistenceReport={persistenceReport} onOpenPractice={onOpenPractice} onReview={() => setFlow('review')} onReset={reset} /> : null}
  </>;

  return embedded
    ? <div className="score-import-page" aria-labelledby="score-import-title">{content}</div>
    : <section className="panel score-import-page" aria-labelledby="score-import-title">{content}</section>;
}
