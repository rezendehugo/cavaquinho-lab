import cavaquinho from '@tombatossals/chords-db/lib/cavaquinho.json';
import { qualityLabels, suffixLabels } from './chordDisplay';

describe('metadados leves de exibição de acordes', () => {
  test('preserva rótulos e símbolos publicados sem carregar a biblioteca de formas no app', () => {
    const expectedSuffixLabels = Object.fromEntries(
      Object.entries(cavaquinho.suffixMetadata).map(([suffix, metadata]) => [suffix, metadata.symbol])
    );
    const expectedQualityLabels = Object.fromEntries(
      Object.entries(cavaquinho.suffixMetadata).map(([suffix, metadata]) => [suffix, metadata.label])
    );

    expect(suffixLabels).toEqual(expectedSuffixLabels);
    expect(qualityLabels).toEqual(expectedQualityLabels);
  });
});
