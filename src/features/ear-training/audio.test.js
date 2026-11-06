import { playEarTrainingRounds } from './audio';

describe('reprodução dos desafios de ouvido', () => {
  test('agenda acordes como notas dedilhadas em duas comparações', () => {
    const oscillators = [];
    const context = {
      currentTime: 1,
      destination: {},
      createOscillator() {
        const node = { frequency: { setValueAtTime: vi.fn() }, connect: vi.fn(), start: vi.fn(), stop: vi.fn() };
        oscillators.push(node);
        return node;
      },
      createGain() {
        return { gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn() };
      }
    };
    const duration = playEarTrainingRounds(context, [[[60, 64, 67], [62, 65, 69]], [[62, 65, 69]]]);
    expect(oscillators).toHaveLength(9);
    expect(oscillators.every(node => node.start.mock.calls.length === 1 && node.stop.mock.calls.length === 1)).toBe(true);
    expect(duration).toBeGreaterThan(3000);
  });

  test('recusa áudios vazios ou com acordes sem altura definida', () => {
    expect(() => playEarTrainingRounds({}, [])).toThrow('Sequência de áudio inválida.');
    expect(() => playEarTrainingRounds({}, [[[60]]])).toThrow('Sequência de áudio inválida.');
  });
});
