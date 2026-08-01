import { Download, FileMusic, TriangleAlert } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { downloadTabScorePdf } from '../domain/tabPdf';
import { buildSystemTablatureMarkdown, downloadMarkdown } from '../domain/practiceExports';
import {
  createNotationWithTabMusicXml,
  createTabOnlyMusicXml,
  safeScoreFileName
} from '../domain/tabScore';
import ScorePreview from './ScorePreview';

export default function TabScoreSheet({ score, compact = false }) {
  const [mode, setMode] = useState('combined');
  const [exporting, setExporting] = useState('');
  const [exportError, setExportError] = useState('');
  const [renderedPages, setRenderedPages] = useState(0);
  const baseName = safeScoreFileName(score.title);
  const blocked = score.issues.length > 0;
  const documents = useMemo(() => ({
    combined: createNotationWithTabMusicXml(score),
    tab: createTabOnlyMusicXml(score)
  }), [score]);
  const activeMusicXml = documents[mode];
  const systemCount = Math.max(1, ...score.measures.map(measure => measure.system || 1));
  const declaredPages = Math.max(1, ...score.measures.map(measure => measure.page || 1));
  const onRendered = useCallback(({ pageCount }) => setRenderedPages(pageCount), []);

  const downloadPdf = async (format) => {
    setExporting(format);
    setExportError('');
    try {
      await downloadTabScorePdf(documents[format], {
        fileName: `${baseName}-${format === 'combined' ? 'partitura-tab' : 'somente-tab'}.pdf`
      });
    } catch {
      setExportError('Não foi possível gerar o PDF. Revise a prévia e tente novamente.');
    } finally {
      setExporting('');
    }
  };

  return <section className={`tab-score-sheet ${compact ? 'is-compact' : ''}`} aria-label="Folha TAB">
    {!compact ? <header>
      <div><h4><FileMusic size={17} /> Folha TAB</h4><p>Exporte a partitura original com TAB ou sua tradução em TAB rítmica.</p></div>
      <div className="tab-layout-summary" aria-label="Resumo da folha TAB">
        <span>{renderedPages || declaredPages} {(renderedPages || declaredPages) === 1 ? 'página' : 'páginas'}</span>
        <span>{systemCount} {systemCount === 1 ? 'sistema' : 'sistemas'}</span>
        <span>{score.measures.length} compassos</span>
        <strong className={score.hasOriginalLayout ? 'original' : 'approximate'}>{score.hasOriginalLayout ? 'Layout original' : 'Layout aproximado'}</strong>
      </div>
    </header> : null}
    {!score.hasOriginalLayout ? <p className="tab-layout-warning">Layout aproximado: as quebras originais não foram reconhecidas.</p> : null}
    <div className="tab-export-toolbar">
      <div className="tab-score-mode" role="tablist" aria-label="Formato da folha TAB">
        <button type="button" role="tab" aria-selected={mode === 'combined'} onClick={() => setMode('combined')}>Partitura + TAB</button>
        <button type="button" role="tab" aria-selected={mode === 'tab'} onClick={() => setMode('tab')}>Somente TAB</button>
      </div>
      <div className="tab-score-actions">
        <button type="button" className="secondary-button tab-markdown-download" disabled={blocked} onClick={() => downloadMarkdown(buildSystemTablatureMarkdown(score))}><Download size={15} /> Markdown</button>
        <button type="button" className="primary-button" aria-label={exporting ? 'Gerando PDF' : 'Baixar PDF'} title={exporting ? 'Gerando PDF' : 'Baixar PDF'} disabled={blocked || Boolean(exporting)} onClick={() => downloadPdf(mode)}><Download size={15} /> {exporting ? 'Gerando PDF…' : 'Baixar PDF'}</button>
      </div>
    </div>
    {blocked ? <div className="tab-position-issues" role="alert"><TriangleAlert size={18} /><div><strong>Revise {score.issues.length} notas antes de baixar</strong><span>Os downloads serão liberados quando todas as notas tiverem uma posição tocável.</span>{score.issues.slice(0, 6).map(issue => <span key={issue.eventId}>Medida {issue.measure}: {issue.message}</span>)}</div></div> : null}
    {exportError ? <p className="validation-error" role="alert">{exportError}</p> : null}
    <div className="tab-score-preview">
      <ScorePreview
        musicXml={activeMusicXml}
        ariaLabel={mode === 'combined' ? 'Prévia da partitura com tablatura' : 'Prévia somente da tablatura'}
        preserveLayout={score.hasOriginalLayout}
        onRendered={onRendered}
      />
    </div>
  </section>;
}
