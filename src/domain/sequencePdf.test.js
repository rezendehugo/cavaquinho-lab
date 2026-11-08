import { describe, expect, it, vi } from 'vitest';
import { buildSequencePdfModel, createSequencePdf, getSequencePdfGridLayout, sequencePdfFileName } from './sequencePdf';
import { getCavaquinhoChords } from './chords';
import { getAbsoluteFrets } from '../progressionOptimizer';

const cavaquinhoChords = getCavaquinhoChords();

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
  it('exports one card per distinct chord while retaining the complete progression for study', () => {
    const sequence = { ...sample, steps: [
      { id: 'dm-first', key: 'D', suffix: 'minor', practiceBeats: 2 },
      { id: 'e7', key: 'E', suffix: '7', practiceBeats: 3 },
      { id: 'dm-repeat', key: 'D', suffix: 'minor', practiceBeats: 5 },
      { id: 'c-sharp', key: 'Db', displayKey: 'C#', suffix: 'major', practiceBeats: 4 },
      { id: 'd-flat', key: 'Db', displayKey: 'Db', suffix: 'major', practiceBeats: 6 }
    ] };
    const model = buildSequencePdfModel(sequence);
    expect(model.progressionLength).toBe(5);
    expect(model.steps.map(step => step.name)).toEqual(['Dm', 'E7', 'C#']);
    expect(model.steps.map(step => step.id)).toEqual(['dm-first', 'e7', 'c-sharp']);
    expect(model.steps.map(step => step.beats)).toEqual([2, 3, 4]);
    expect(model.exercises[5].answer.split(' | ')).toHaveLength(5);
  });
  it('uses the song title and artist as PDF metadata and a portable filename', () => {
    const sequence = { ...sample, title: 'Wave', musicTitle: 'Wave', artist: 'Antonio Carlos Jobim' };
    expect(buildSequencePdfModel(sequence)).toMatchObject({ title: 'Wave', artist: 'Antonio Carlos Jobim' });
    expect(sequencePdfFileName(sequence, 'map')).toBe('Wave-Antonio-Carlos-Jobim-mapa.pdf');
  });
  it('rejects empty maps and unsupported shapes instead of exporting incomplete maps', () => {
    expect(() => buildSequencePdfModel({ steps: [] })).toThrow();
    expect(() => buildSequencePdfModel({ steps: [{ key: 'Z', suffix: 'major' }] })).toThrow();
  });
  it.each([1, 3, 4, 5])('lays out %i shapes in portrait with four columns and useful card occupancy', count => {
    const layout = getSequencePdfGridLayout(count);
    expect(layout.columns).toBe(4);
    expect(layout.cardWidth).toBeGreaterThan(125);
    expect(layout.diagramHeight).toBeGreaterThan(100);
    expect(layout.contentOccupancy).toBeGreaterThan(0.65);
    expect(layout.cardsPerPage).toBe(16);
    expect(layout.rows).toBe(Math.ceil(count / 4));
  });
  it('builds and exports a four-chord sequence on one portrait page', async () => {
    const sequence = { ...sample, steps: [
      { id: 'g7', key: 'G', suffix: '7' },
      { id: 'dm', key: 'D', suffix: 'minor' },
      { id: 'a7', key: 'A', suffix: '7' },
      { id: 'c', key: 'C', suffix: 'major' }
    ] };
    const model = buildSequencePdfModel(sequence);
    const layout = getSequencePdfGridLayout(model.steps.length);
    const pdf = await createSequencePdf(sequence, { kind: 'map' });
    expect(model.steps.map(step => step.name)).toEqual(['G7', 'Dm', 'A7', 'C']);
    expect(layout.rows).toBe(1);
    expect(layout.contentOccupancy).toBeGreaterThan(0.65);
    expect(pdf.getNumberOfPages()).toBe(1);
    expect(pdf.internal.pageSize.getWidth()).toBeLessThan(pdf.internal.pageSize.getHeight());
  });
  it('paginates all distinct chord cards, including a last partial page', async () => {
    const keys = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
    const steps = keys.flatMap((key, index) => [
      { id: `major-${index}`, key, suffix: 'major', positionIndex: 0 },
      { id: `minor-${index}`, key, suffix: 'minor', positionIndex: 0 }
    ]);
    const sequence = { ...sample, steps };
    const pdf = await createSequencePdf(sequence, { kind: 'map' });
    expect(pdf.getNumberOfPages()).toBe(2);
    expect(pdf.internal.pageSize.getWidth()).toBeLessThan(pdf.internal.pageSize.getHeight());
    expect(pdf.output('arraybuffer').byteLength).toBeGreaterThan(3000);
  });
  it('creates an annotated guide and paginates long personal notes', async () => {
    const pdf = await createSequencePdf(sample, { study: { intention: 'Trocar com continuidade e escutar as notas comuns.' } });
    expect(pdf.getNumberOfPages()).toBe(3);
    const long = await createSequencePdf(sample, { study: { observation: 'Uma descoberta musical com intenção. '.repeat(50), connection: 'Relacionar com outras músicas. '.repeat(60) } });
    expect(long.getNumberOfPages()).toBeGreaterThan(3);
  });
  it('makes portable file names', () => {
    expect(sequencePdfFileName('As Rosas não falam')).toBe('As-Rosas-nao-falam-guia.pdf');
    expect(sequencePdfFileName('../', 'map')).toBe('sequencia-mapa.pdf');
  });
});
