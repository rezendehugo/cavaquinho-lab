function findRenderedPages(container) {
  const osmdPages = [...container.querySelectorAll('.osmdCanvasPage')]
    .map(page => page.querySelector('svg'))
    .filter(Boolean);
  if (osmdPages.length) return osmdPages;
  return [...container.children].flatMap(child => {
    const svg = child.matches?.('svg') ? child : child.querySelector?.('svg');
    return svg ? [svg] : [];
  });
}

export async function downloadTabScorePdf(musicXml, metadata) {
  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  Object.assign(host.style, {
    position: 'fixed',
    left: '-10000px',
    top: '0',
    width: '794px',
    minHeight: '1123px',
    background: '#fff',
    pointerEvents: 'none'
  });
  document.body.append(host);

  try {
    const [{ OpenSheetMusicDisplay }, { jsPDF }] = await Promise.all([
      import('opensheetmusicdisplay'),
      import('jspdf'),
      import('svg2pdf.js')
    ]);
    const display = new OpenSheetMusicDisplay(host, {
      autoResize: false,
      backend: 'svg',
      drawTitle: true,
      drawingParameters: 'default',
      pageBackgroundColor: '#FFFFFF',
      pageFormat: 'A4_P',
      newSystemFromXML: true,
      newSystemFromNewPageInXML: true,
      newPageFromXML: true
    });
    await display.load(musicXml);
    display.render();

    const svgPages = findRenderedPages(host);
    if (!svgPages.length) throw new Error('tab_export_render_failed');
    const pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait', compress: true });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    for (let index = 0; index < svgPages.length; index += 1) {
      if (index > 0) pdf.addPage();
      await pdf.svg(svgPages[index], { x: 0, y: 0, width: pageWidth, height: pageHeight });
    }
    pdf.save(metadata.fileName);
    return { pageCount: svgPages.length };
  } finally {
    host.remove();
  }
}
