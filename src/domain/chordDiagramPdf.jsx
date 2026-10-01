import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ChordDiagram from '../components/ChordDiagram';

// Render the same React SVG as the editor, then freeze its computed appearance so
// the exported vector keeps note labels, degree colours and selected fret geometry.
export function createChordDiagramSvg(step) {
  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  host.style.cssText = 'position:fixed;left:-10000px;top:0;pointer-events:none;--color-border:#bdc9c2;--color-text:#1f2933;--color-muted:#596672';
  host.innerHTML = renderToStaticMarkup(createElement(ChordDiagram, {
    position: step.position, name: step.name, chordKey: step.key,
    chordSuffix: step.suffix, mode: 'notes'
  }));
  document.body.append(host);
  try {
    const source = host.querySelector('svg');
    const svg = source.cloneNode(true);
    const originals = [source, ...source.querySelectorAll('*')];
    const copies = [svg, ...svg.querySelectorAll('*')];
    originals.forEach((element, index) => {
      const computed = getComputedStyle(element);
      for (const property of ['fill', 'stroke', 'stroke-width', 'stroke-linecap', 'opacity', 'font-size', 'font-weight', 'font-family', 'text-anchor']) {
        const value = computed.getPropertyValue(property);
        if (value) copies[index].style.setProperty(property, value);
      }
    });
    // Use the PDF's built-in sans-serif face rather than silently falling back
    // to Times when the screen's Verdana font is unavailable in the PDF.
    svg.querySelectorAll('text, tspan').forEach(node => {
      node.style.fontFamily = 'helvetica';
      node.setAttribute('font-family', 'helvetica');
      node.style.fontWeight = Number(node.style.fontWeight) >= 600 ? '700' : '400';
    });
    svg.querySelectorAll('[class]').forEach(node => node.removeAttribute('class'));
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svg.setAttribute('width', '154');
    svg.setAttribute('height', '190');
    return svg;
  } finally { host.remove(); }
}

export async function drawChordDiagramPdf(pdf, step, x, y, height = 120) {
  const { svg2pdf } = await import('svg2pdf.js');
  await svg2pdf(createChordDiagramSvg(step), pdf, { x, y, width: height * 154 / 190, height });
}
