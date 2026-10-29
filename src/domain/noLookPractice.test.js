import { getChordQualityHint } from './noLookPractice';

describe('dicas de qualidade para a prática sem olhar', () => {
  test.each([
    ['major', 'maior'], ['minor', 'menor'], ['7', 'dominante com sétima'],
    ['maj7', 'maior com sétima maior'], ['m7b5', 'meio-diminuto'], ['sus4', 'suspenso com quarta']
  ])('descreve %s sem revelar a fundamental', (suffix, hint) => {
    expect(getChordQualityHint(suffix)).toBe(hint);
  });

  test('mantém uma descrição segura para uma qualidade desconhecida', () => {
    expect(getChordQualityHint('other')).toBe('qualidade especial');
  });
});
