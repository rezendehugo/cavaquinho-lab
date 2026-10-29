import { createEarTrainingExercise, createSequenceRecallExercise, earTrainingLevels, normalizeEarTrainingProgress, normalizeSequenceEarReviews, updateEarTrainingProgress, updateSequenceEarReview, getRecommendedEarTrainingLevel } from './earTraining';
import { createSequence } from '../sequences';

describe('trilha de ouvido', () => {
  test.each(earTrainingLevels.filter(({ id }) => id !== 'sequence').map(({ id }) => id))('gera áudio e respostas válidas para a etapa %s', levelId => {
    const exercise = createEarTrainingExercise(levelId, { random: () => 0 });
    expect(exercise).toMatchObject({ levelId, prompt: expect.any(String), answerId: expect.any(String) });
    expect(exercise.options.map(option => option.id)).toContain(exercise.answerId);
    expect(exercise.audioRounds.length).toBe(levelId === 'transpose' ? 2 : 1);
    expect(exercise.audioRounds.flat().every(chord => chord.length >= 2 && chord.every(Number.isFinite))).toBe(true);
    expect(exercise.explanation).toBeTruthy();
    expect(exercise.transfer).toBeTruthy();
  });

  test('usa uma sequência salva como exercício de escuta e antecipação', () => {
    const sequence = { ...createSequence(0), id: 'saved', title: 'Minha cadência', steps: [
      { id: 'a', key: 'C', suffix: 'major' }, { id: 'b', key: 'G', suffix: '7' }, { id: 'c', key: 'C', suffix: 'major' }
    ] };
    const exercise = createSequenceRecallExercise(sequence, { random: () => 0 });
    expect(exercise).toMatchObject({ levelId: 'sequence', sequenceId: 'saved', sequenceTitle: 'Minha cadência' });
    expect(exercise.audioRounds[0]).toHaveLength(1);
    expect(exercise.answerAudioRounds[0]).toHaveLength(2);
    expect(exercise.options.map(option => option.id)).toContain(exercise.answerId);
    expect(createSequenceRecallExercise({ ...sequence, steps: [sequence.steps[0]] })).toBeNull();
  });

  test('agenda revisões espaçadas: erro em dez minutos, acertos em um dia e depois uma semana', () => {
    const now = Date.UTC(2026, 0, 1);
    const missed = updateSequenceEarReview({}, 'saved', false, now);
    expect(Date.parse(missed.saved.dueAt) - now).toBe(10 * 60 * 1000);
    const first = updateSequenceEarReview(missed, 'saved', true, now);
    expect(Date.parse(first.saved.dueAt) - now).toBe(24 * 60 * 60 * 1000);
    const second = updateSequenceEarReview(first, 'saved', true, now);
    expect(Date.parse(second.saved.dueAt) - now).toBe(7 * 24 * 60 * 60 * 1000);
    expect(normalizeSequenceEarReviews({ saved: { ...second.saved, attempts: 1, correct: 8 } }).saved.correct).toBe(1);
  });

  test('pergunta previsão após ii–V e compara a transposição por um tom', () => {
    const prediction = createEarTrainingExercise('prediction', { random: () => 0 });
    expect(prediction.audioRounds[0]).toHaveLength(2);
    expect(prediction.answerId).toBe('tonic');
    const transposition = createEarTrainingExercise('transpose', { random: () => 0 });
    expect(transposition.answerId).toBe('-2');
    expect(transposition.explanation).toContain('desceu um tom');
  });

  test('gera as cinco comparações de transposição em passos cromáticos', () => {
    const expected = [-2, -1, 0, 1, 2];
    for (const [index, interval] of expected.entries()) {
      const values = [0, (index + 0.25) / expected.length];
      const exercise = createEarTrainingExercise('transpose', { random: () => values.shift() ?? 0 });
      expect(exercise.answerId).toBe(String(interval));
      expect(exercise.audioRounds).toHaveLength(2);
      expect(exercise.audioRounds[0]).toHaveLength(3);
      expect(exercise.audioRounds[1]).toHaveLength(3);
    }
  });

  test('alternates between major and minor cadences and identifies the tonal center in context', () => {
    const randomValues = [0.99, 0];
    const minor = createEarTrainingExercise('mode', { random: () => randomValues.shift() ?? 0 });
    expect(minor.answerId).toBe('minor');
    expect(minor.explanation).toContain('i – iv – V7 – i');
    const center = createEarTrainingExercise('center', { random: () => 0 });
    expect(center.options).toHaveLength(4);
    expect(center.options.map(option => option.id)).toContain(center.answerId);
    expect(center.transfer).toContain('no cavaquinho');
  });

  test('normaliza progresso inválido e soma acertos por etapa sem ultrapassar tentativas', () => {
    const progress = normalizeEarTrainingProgress({ mode: { attempts: 2, correct: 9, bestStreak: 5 }, progression: { attempts: -1, correct: -4 } });
    expect(progress.mode).toEqual({ attempts: 2, correct: 2, bestStreak: 2 });
    expect(progress.progression).toEqual({ attempts: 0, correct: 0, bestStreak: 0 });
    expect(updateEarTrainingProgress(progress, 'mode', false, 0).mode).toEqual({ attempts: 3, correct: 2, bestStreak: 2 });
  });

  test('sugere continuar a etapa até três tentativas e dois acertos, sem bloquear as demais', () => {
    expect(getRecommendedEarTrainingLevel({}).id).toBe('mode');
    const progress = normalizeEarTrainingProgress({ mode: { attempts: 3, correct: 2 }, center: { attempts: 3, correct: 3 } });
    expect(getRecommendedEarTrainingLevel(progress).id).toBe('progression');
  });
});
