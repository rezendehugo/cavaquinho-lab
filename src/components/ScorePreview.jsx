import { useEffect, useRef } from 'react';

export default function ScorePreview({ musicXml }) {
  const containerRef = useRef(null);
  useEffect(() => {
    let disposed = false;
    async function renderScore() {
      const { OpenSheetMusicDisplay } = await import('opensheetmusicdisplay');
      if (disposed || !containerRef.current) return;
      const display = new OpenSheetMusicDisplay(containerRef.current, { autoResize: true, drawTitle: true });
      await display.load(musicXml);
      if (!disposed) display.render();
    }
    renderScore().catch(() => { if (containerRef.current) containerRef.current.textContent = 'Não foi possível renderizar a partitura original.'; });
    return () => { disposed = true; if (containerRef.current) containerRef.current.replaceChildren(); };
  }, [musicXml]);
  return <div ref={containerRef} className="score-original-preview" aria-label="Partitura MusicXML original" />;
}
