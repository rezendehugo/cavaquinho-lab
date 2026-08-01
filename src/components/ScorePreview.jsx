import { useEffect, useRef } from 'react';

const ignoreRendered = () => undefined;

export default function ScorePreview({
  musicXml,
  ariaLabel = 'Partitura MusicXML original',
  preserveLayout = false,
  onRendered = ignoreRendered
}) {
  const containerRef = useRef(null);
  useEffect(() => {
    let disposed = false;
    async function renderScore() {
      const { OpenSheetMusicDisplay } = await import('opensheetmusicdisplay');
      if (disposed || !containerRef.current) return;
      const display = new OpenSheetMusicDisplay(containerRef.current, {
        autoResize: true,
        drawTitle: true,
        pageFormat: 'A4_P',
        drawingParameters: 'default',
        newSystemFromXML: preserveLayout,
        newSystemFromNewPageInXML: preserveLayout,
        newPageFromXML: preserveLayout
      });
      await display.load(musicXml);
      if (!disposed) {
        display.render();
        const pageCount = containerRef.current.querySelectorAll('.osmdCanvasPage').length
          || containerRef.current.querySelectorAll('svg').length;
        onRendered({ pageCount });
      }
    }
    renderScore().catch(() => { if (containerRef.current) containerRef.current.textContent = 'Não foi possível renderizar a partitura original.'; });
    return () => { disposed = true; if (containerRef.current) containerRef.current.replaceChildren(); };
  }, [musicXml, onRendered, preserveLayout]);
  return <div ref={containerRef} className="score-original-preview" aria-label={ariaLabel} />;
}
