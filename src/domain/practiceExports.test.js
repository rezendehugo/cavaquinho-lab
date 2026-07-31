import { describe, expect, test } from 'vitest';
import {
  buildChordMarkdown,
  buildSystemTablatureMarkdown,
  buildTablatureMarkdown,
  MARKDOWN_MEASURES_PER_SYSTEM
} from './practiceExports';

describe('exportação de práticas', () => {
  test('preserva inversões, medidas e shapes por ocorrência', () => {
    const document = buildChordMarkdown({
      title: 'Teste',
      steps: [
        { key: 'G', suffix: 'major', bassNote: 'B', positionIndex: 1, measure: 2, offsetTicks: 0 },
        { key: 'G', suffix: 'major', positionIndex: 4, measure: 3, offsetTicks: 2 }
      ]
    });
    expect(document.content).toContain('G/B | G');
    expect(document.content).toMatch(/\| 1 \| 2 \| 0 \| G\/B \| Forma 2/);
    expect(document.content).toMatch(/\| 2 \| 3 \| 2 \| G \| Forma 5/);
  });

  test('gera tablatura e marca posições desconhecidas', () => {
    const document = buildTablatureMarkdown({
      title: 'Solo',
      tempo: 85,
      meter: { beats: 2, beatType: 4 },
      events: [
        { id: 'one', measure: 1, offsetTicks: 0, rest: false, suggestedPosition: { stringIndex: 0, fret: 10, midi: 72 } },
        { id: 'two', measure: 1, offsetTicks: 1, rest: false, suggestedPosition: null }
      ]
    });
    expect(document.content).toContain('**Compasso:** 2/4');
    expect(document.content).toContain('10');
    expect(document.warnings).toHaveLength(1);
  });

  test('organiza a tablatura em blocos correspondentes aos sistemas', () => {
    const tab = buildSystemTablatureMarkdown({
      title: 'Choro',
      tempo: 85,
      meter: { beats: 2, beatType: 4 },
      measures: [
        {
          number: 1, page: 1, system: 1, chords: [{ symbol: 'G7' }],
          events: [{ id: 'one', offsetTicks: 0, rest: false, position: { stringIndex: 0, fret: 10 } }]
        },
        {
          number: 2, page: 1, system: 1, chords: [{ symbol: 'C' }],
          events: [{ id: 'two', offsetTicks: 0, rest: false, position: { stringIndex: 2, fret: 3 } }]
        },
        {
          number: 3, page: 1, system: 2, chords: [],
          events: [{ id: 'rest', offsetTicks: 0, rest: true, position: null }]
        }
      ]
    });
    expect(tab.content).toContain('Sistema 1 · compassos 1–3');
    expect(tab.content).toContain('G7 · C');
    expect(tab.content).toContain('D4 |');
    expect(tab.content).toContain('10');
  });

  test('agrupa oito compassos por sistema no Markdown', () => {
    const measures = Array.from({ length: MARKDOWN_MEASURES_PER_SYSTEM + 2 }, (_, index) => ({
      number: index + 1,
      page: 1,
      system: Math.floor(index / 4) + 1,
      chords: [],
      events: [{ id: `event-${index}`, offsetTicks: 0, rest: true, position: null }]
    }));
    const tab = buildSystemTablatureMarkdown({ title: 'Oito por linha', measures });

    expect(tab.content).toContain('Sistema 1 · compassos 1–8');
    expect(tab.content).toContain('Sistema 2 · compassos 9–10');
    expect(tab.content).not.toContain('Sistema 1 · compassos 1–4');
  });
});
