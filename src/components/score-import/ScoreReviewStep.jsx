import { Check, FileText, ListMusic, Music2, TriangleAlert } from 'lucide-react';
import { useMemo, useState } from 'react';
import { parseRootInput } from '../../domain/chordInput';
import { MAX_SEQUENCE_STEPS } from '../../sequences';
import { buildTabScore } from '../../domain/tabScore';
import ScoreMeasureEditor from '../ScoreMeasureEditor';
import ScorePreview from '../ScorePreview';
import TabScoreSheet from '../TabScoreSheet';

const needsReview = measure => measure.issues.length > 0
  || measure.events.some(event => event.confidence < .8)
  || measure.chords.some(chord => chord.confidence < .8);

export default function ScoreReviewStep({
  result, musicXml, sourceUrl, sourcePreviewUnavailable = false, busy, range, targets,
  onRangeChange, onTargetsChange, onSaveMeasure, onApprove
}) {
  const [mobileView, setMobileView] = useState('measures');
  const [selectedMeasure, setSelectedMeasure] = useState(null);
  const measures = result.draft.measures;
  const reviewMeasures = useMemo(() => measures.filter(needsReview), [measures]);
  const confidentCount = measures.length - reviewMeasures.length;
  const selectedCount = measures.filter(item => item.number >= range.startMeasure && item.number <= range.endMeasure).length;
  const criticalCount = measures.filter(item => item.issues.some(issue => issue.severity === 'critical')).length;
  const chordEvents = measures
    .filter(measure => measure.number >= range.startMeasure && measure.number <= range.endMeasure)
    .flatMap(measure => measure.chords.map(chord => ({ ...chord, measure: measure.number })));
  const invalidChords = chordEvents.filter(chord => !parseRootInput(chord.symbol, 'major'));
  const sequenceProblem = targets.sequence && (invalidChords.length > 0 || chordEvents.length > MAX_SEQUENCE_STEPS);
  const tabScore = useMemo(() => buildTabScore(result.draft), [result.draft]);

  const chooseRangePreset = value => {
    if (value === 'all') return onRangeChange({ startMeasure: measures[0].number, endMeasure: measures.at(-1).number });
    const section = result.draft.sections?.find(item => item.id === value);
    if (section) onRangeChange({ startMeasure: section.startMeasure, endMeasure: section.endMeasure });
  };

  return <section className="score-review-step" aria-labelledby="score-review-heading">
    <header className="score-review-header">
      <div><p className="eyebrow">Rascunho privado</p><h3 id="score-review-heading">{result.draft.title}</h3><p>{result.draft.composer || 'Compositor não identificado'}</p>{result.item.cacheHit ? <span className="score-cache-badge">Resultado reutilizado do cache</span> : null}</div>
      <dl>
        <div><dt>Páginas</dt><dd>{result.item.pageCount || '—'}</dd></div>
        <div><dt>Compasso</dt><dd>{result.draft.meter.beats}/{result.draft.meter.beatType}</dd></div>
        <div><dt>Andamento</dt><dd>{result.draft.tempo} BPM</dd></div>
        <div><dt>Medidas</dt><dd>{measures.length}</dd></div>
      </dl>
    </header>

    <div className="score-review-summary" aria-label="Resumo da revisão">
      <div className={reviewMeasures.length ? 'attention' : 'success'}>
        {reviewMeasures.length ? <TriangleAlert size={19} /> : <Check size={19} />}
        <strong>{reviewMeasures.length ? `${reviewMeasures.length} medidas precisam de revisão` : 'Todas as medidas estão confiáveis'}</strong>
      </div>
      {reviewMeasures.length ? <span>{confidentCount} medidas confiáveis</span> : null}
      {criticalCount ? <span className="critical">{criticalCount} impedem a criação</span> : null}
    </div>
    {sequenceProblem ? <div className="score-import-rejections" role="alert"><strong>A sequência precisa de correção</strong>{invalidChords.length ? <p>{invalidChords.slice(0, 8).map(chord => `Medida ${chord.measure}: ${chord.symbol}`).join(' · ')}</p> : null}{chordEvents.length > MAX_SEQUENCE_STEPS ? <p>O trecho possui {chordEvents.length} cifras; selecione até {MAX_SEQUENCE_STEPS}.</p> : null}<small>Você pode corrigir as cifras ou criar somente o Solo com melodia.</small></div> : null}

    <div className="score-review-mobile-tabs" role="tablist" aria-label="Visualização da revisão">
      <button type="button" role="tab" aria-selected={mobileView === 'original'} onClick={() => setMobileView('original')}>Original</button>
      <button type="button" role="tab" aria-selected={mobileView === 'recognized'} onClick={() => setMobileView('recognized')}>Reconhecida</button>
      <button type="button" role="tab" aria-selected={mobileView === 'tab'} onClick={() => setMobileView('tab')}>Folha TAB</button>
      <button type="button" role="tab" aria-selected={mobileView === 'measures'} onClick={() => setMobileView('measures')}>Medidas</button>
    </div>
    <div className="score-preview-pair">
      <section className={`score-preview-panel original ${mobileView === 'original' ? 'is-mobile-active' : ''}`}><h4><FileText size={16} /> Original</h4>
        {sourceUrl
          ? <iframe title="PDF original" src={sourceUrl} />
          : <p>{sourcePreviewUnavailable
            ? 'A prévia do PDF original não está disponível nesta sessão. A revisão reconhecida continua acessível.'
            : 'O arquivo simbólico não possui uma visualização PDF.'}</p>}
      </section>
      <section className={`score-preview-panel recognized ${mobileView === 'recognized' ? 'is-mobile-active' : ''}`}><h4><Music2 size={16} /> Reconhecida</h4><ScorePreview musicXml={musicXml} /></section>
      <section className={`score-preview-panel tab ${mobileView === 'tab' ? 'is-mobile-active' : ''}`}><TabScoreSheet score={tabScore} compact /></section>
    </div>

    <section className={`score-measure-review ${mobileView === 'measures' ? 'is-mobile-active' : ''}`} aria-label="Medidas reconhecidas">
      <header><div><h4><ListMusic size={17} /> Revisão por medida</h4><p>Problemas aparecem primeiro. Abra qualquer medida para conferir.</p></div>
        <label>Ir para <select value={selectedMeasure || ''} onChange={event => setSelectedMeasure(Number(event.target.value) || null)}><option value="">Escolha</option>{measures.map(item => <option key={item.number} value={item.number}>Medida {item.number}</option>)}</select></label>
      </header>
      <div className="score-measure-list">
        {[...measures].sort((left, right) => Number(needsReview(right)) - Number(needsReview(left)) || left.number - right.number).map(measure =>
          <ScoreMeasureEditor
            key={`${measure.number}-${result.draft.revision}`}
            measure={measure}
            revision={result.draft.revision}
            busy={busy}
            expanded={selectedMeasure === measure.number || needsReview(measure)}
            onSave={onSaveMeasure}
          />)}
      </div>
    </section>

    <div className="score-create-bar">
      <div className="score-range-control">
        <label>Trecho <select defaultValue="all" onChange={event => chooseRangePreset(event.target.value)}><option value="all">Música inteira</option>{result.draft.sections?.map(section => <option key={section.id} value={section.id}>{section.title}</option>)}<option value="custom">Intervalo personalizado</option></select></label>
        <label>De <select value={range.startMeasure} onChange={event => onRangeChange({ ...range, startMeasure: Number(event.target.value) })}>{measures.map(item => <option key={item.number} value={item.number}>{item.number}</option>)}</select></label>
        <label>Até <select value={range.endMeasure} onChange={event => onRangeChange({ ...range, endMeasure: Number(event.target.value) })}>{measures.map(item => <option key={item.number} value={item.number}>{item.number}</option>)}</select></label>
      </div>
      <div className="score-target-cards" aria-label="Práticas a criar">
        <label className={targets.sequence ? 'selected' : ''}><input type="checkbox" checked={targets.sequence} onChange={event => onTargetsChange({ ...targets, sequence: event.target.checked })} /><strong>Sequência de acordes</strong><span>Pratique as trocas reconhecidas.</span></label>
        <label className={targets.melody ? 'selected' : ''}><input type="checkbox" checked={targets.melody} onChange={event => onTargetsChange({ ...targets, melody: event.target.checked })} /><strong>Solo com melodia</strong><span>Pratique notas, pausas e ritmo.</span></label>
      </div>
      <div className="score-create-action"><span>{selectedCount} medidas selecionadas</span><button type="button" data-ui-text-reason="workflow" className="primary-button" disabled={busy || criticalCount > 0 || sequenceProblem || range.startMeasure > range.endMeasure || !Object.values(targets).some(Boolean)} onClick={onApprove}>Validar e criar prática</button></div>
    </div>
  </section>;
}
