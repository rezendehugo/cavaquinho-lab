import { describe, expect, it, vi } from 'vitest';
import { buildSequencePdfModel, createSequencePdf, sequencePdfFileName } from './sequencePdf';
import { cavaquinhoChords } from './chords';
import { getAbsoluteFrets } from '../progressionOptimizer';

// jsdom has no SVG text measurement. Layout tests isolate conversion; SVG parity
// is checked separately and the actual conversion is verified in the browser.
vi.mock('./chordDiagramPdf', () => ({ drawChordDiagramPdf: vi.fn() }));

const sample = {
  id: 'pdf-example', title: 'As Rosas não falam', practiceBpm: 60, loopStartIndex: 1,
  steps: [['D', 'minor'], ['E', '7'], ['G', 'minor'], ['A', '7'], ['D', '7']].map(([key, suffix], index) => ({ id: `s${index}`, key, suffix, practiceBeats: index + 1, positionIndex: 1 }))
};

describe('sequence study PDF', () => {
  it('preserves order, selected shapes, absolute frets, durations and return point', () => {
    const model = buildSequencePdfModel(sample);
    expect(model.steps.map(step => step.name)).toEqual(['Dm', 'E7', 'Gm', 'A7', 'D7']);
    expect(model.steps.map(step => step.beats)).toEqual([1, 2, 3, 4, 5]);
    expect(model.loop).toBe(1);
    expect(model.steps[1].theory.playedNotes).toContain('G#');
    expect(model.steps[3].theory.playedNotes).toContain('C#');
    model.steps.forEach(step => {
      const chord = cavaquinhoChords.chords[step.key].find(item => item.suffix === step.suffix);
      expect(step.positionIndex).toBe(1);
      expect(step.frets).toEqual(getAbsoluteFrets(chord.positions[1]));
    });
  });
  it('rejects empty maps and unsupported shapes instead of exporting incomplete maps', () => {
    expect(() => buildSequencePdfModel({ steps: [] })).toThrow();
    expect(() => buildSequencePdfModel({ steps: [{ key: 'Z', suffix: 'major' }] })).toThrow();
  });
  it('paginates all occurrences, including a last partial page', async () => {
    const sequence = { ...sample, steps: Array.from({ length: 13 }, (_, i) => ({ ...sample.steps[i % 5], id: `${i}` })) };
    const pdf = await createSequencePdf(sequence, { kind: 'map' });
    expect(pdf.getNumberOfPages()).toBe(4);
    expect(pdf.output('arraybuffer').byteLength).toBeGreaterThan(3000);
  });
  it('creates an annotated guide and paginates long personal notes', async () => {
    const pdf = await createSequencePdf(sample, { study: { intention: 'Trocar com continuidade e escutar as notas comuns.' } });
    expect(pdf.getNumberOfPages()).toBe(4);
    const long = await createSequencePdf(sample, { study: { observation: 'Uma descoberta musical com intenção. '.repeat(50), connection: 'Relacionar com outras músicas. '.repeat(60) } });
    expect(long.getNumberOfPages()).toBeGreaterThan(4);
  });
  it('makes portable file names', () => {
    expect(sequencePdfFileName('As Rosas não falam')).toBe('As-Rosas-nao-falam-guia.pdf');
    expect(sequencePdfFileName('../', 'map')).toBe('sequencia-mapa.pdf');
  });
});
