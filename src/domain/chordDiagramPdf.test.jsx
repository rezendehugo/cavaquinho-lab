import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { expect, it } from 'vitest';
import ChordDiagram from '../components/ChordDiagram';
import { createChordDiagramSvg } from './chordDiagramPdf';
import { cavaquinhoChords } from './chords';
import { buildSequencePdfModel } from './sequencePdf';

it('exports the identical SVG geometry and note labels for every library shape', () => {
  for (const [key, chords] of Object.entries(cavaquinhoChords.chords)) {
    for (const chord of chords) for (const position of chord.positions) {
      const step = { key, suffix: chord.suffix, position, name: key + chord.suffix };
      const expected = document.createElement('div');
      expected.innerHTML = renderToStaticMarkup(createElement(ChordDiagram, { position, name: step.name, chordKey: key, chordSuffix: chord.suffix }));
      const exported = createChordDiagramSvg(step);
      // Presentation is frozen for PDF; all musical marks must be identical.
      exported.querySelectorAll('[style]').forEach(node => node.removeAttribute('style'));
      exported.querySelectorAll('[font-family]').forEach(node => node.removeAttribute('font-family'));
      expected.querySelectorAll('[class]').forEach(node => node.removeAttribute('class'));
      exported.removeAttribute('style');
      expect(exported.innerHTML).toBe(expected.querySelector('svg').innerHTML);
    }
  }
}, 60000);

it('uses the exact resolved on-screen shape, including automatic choices', () => {
  const chord = cavaquinhoChords.chords.D.find(chord => chord.suffix === 'minor');
  const sequence = { steps: [{ id: 'chosen', key: 'D', suffix: 'minor', positionIndex: null }] };
  const resolvedSteps = [{ ...sequence.steps[0], chord, position: chord.positions[3], positionIndex: 3 }];
  const model = buildSequencePdfModel(sequence, { resolvedSteps });
  expect(model.steps[0].position).toBe(resolvedSteps[0].position);
  expect(model.steps[0].positionIndex).toBe(3);
  expect(createChordDiagramSvg(model.steps[0]).textContent).toContain('F');
  expect(() => buildSequencePdfModel(sequence, { resolvedSteps: [{ ...resolvedSteps[0], id: 'stale' }] })).toThrow();
});
