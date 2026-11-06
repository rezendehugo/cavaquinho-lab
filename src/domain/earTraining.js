import { chromaticKeys } from '../sequences';
import { formatRootOption, formatSequenceChord } from '../chordDisplay';
import { cavaquinhoChords } from './chords';
import { findChord, optimizeSequence } from '../progressionOptimizer';
import { buildSequencePractice } from './sequencePractice';

export const earTrainingLevels = [
  { id: 'mode', label: 'Maior ou menor', title: 'Sinta o modo', description: 'Ouça a harmonia em contexto e reconheça sua cor maior ou menor.' },
  { id: 'center', label: 'Centro tonal', title: 'Encontre a nota de repouso', description: 'Use a cadência como pista para cantar e localizar o centro tonal.' },
  { id: 'progression', label: 'Caminhos', title: 'Reconheça o caminho', description: 'Identifique uma progressão pelos graus e pela direção da harmonia.' },
  { id: 'prediction', label: 'Próximo acorde', title: 'Antecipe a resolução', description: 'Escute a preparação e a tensão; imagine onde a música quer chegar.' },
  { id: 'transpose', label: 'Transposição', title: 'Ouça a mudança de tom', description: 'Compare uma progressão com sua versão transposta.' },
  { id: 'sequence', label: 'Minha sequência', title: 'Antecipe seus acordes', description: 'Ouça um trecho da sua própria sequência salva e imagine o próximo acorde antes de conferir.' }
];

export const earTrainingProgressKey = 'cavaquinhoLabEarTraining:v1';
export const sequenceEarReviewKey = 'cavaquinhoLabSequenceEarReview:v1';

const progressionTemplates = [
  { id: 'ii-v-i', label: 'ii – V7 – I', offsets: [[2, 'minor', 'ii'], [7, '7', 'V7'], [0, 'major', 'I']] },
  { id: 'i-vi-ii-v', label: 'I – vi – ii – V7', offsets: [[0, 'major', 'I'], [9, 'minor', 'vi'], [2, 'minor', 'ii'], [7, '7', 'V7']] },
  { id: 'i-iv-v-i', label: 'I – IV – V7 – I', offsets: [[0, 'major', 'I'], [5, 'major', 'IV'], [7, '7', 'V7'], [0, 'major', 'I']] }
];

const minorCadence = [[0, 'minor', 'i'], [5, 'minor', 'iv'], [7, '7', 'V7'], [0, 'minor', 'i']];
const majorCadence = [[0, 'major', 'I'], [5, 'major', 'IV'], [7, '7', 'V7'], [0, 'major', 'I']];
const transpositionIntervals = [-2, -1, 0, 1, 2];

const mod = (value, length) => ((value % length) + length) % length;
const transposeKey = (key, semitones) => chromaticKeys[mod(chromaticKeys.indexOf(key) + semitones, chromaticKeys.length)];
const randomItem = (items, random) => items[Math.min(items.length - 1, Math.floor(random() * items.length))];

function buildProgression(root, offsets, chordDb) {
  const steps = offsets.map(([offset, suffix, numeral]) => ({ key: transposeKey(root, offset), suffix, numeral }));
  if (steps.some(step => !findChord(chordDb, step.key, step.suffix)?.positions?.length)) return null;
  const optimized = optimizeSequence(steps, chordDb);
  if (optimized.missing.length) return null;
  return optimized.steps.map(step => ({
    ...step,
    midi: (step.position?.midi || []).filter(note => Number.isFinite(note) && note > 0).sort((left, right) => left - right)
  }));
}

function validRoots(offsetSets, chordDb, transpositions = [0]) {
  return chromaticKeys.filter(root => transpositions.every(semitones => {
    const transposedRoot = transposeKey(root, semitones);
    return offsetSets.every(offsets => offsets.every(([offset, suffix]) => {
      const chord = findChord(chordDb, transposeKey(transposedRoot, offset), suffix);
      return chord?.positions?.length > 0;
    }));
  }));
}

function spellProgression(steps) {
  return steps.map(step => formatSequenceChord(step)).join(' → ');
}

function shuffle(items, random) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

export function createEarTrainingExercise(levelId, { chordDb = cavaquinhoChords, random = Math.random } = {}) {
  if (levelId === 'mode') {
    const modes = [
      { id: 'major', label: 'Maior', offsets: majorCadence },
      { id: 'minor', label: 'Menor', offsets: minorCadence }
    ];
    const mode = randomItem(modes, random);
    const root = randomItem(validRoots(modes.map(item => item.offsets), chordDb), random);
    const audioSteps = buildProgression(root, mode.offsets, chordDb);
    if (!audioSteps) return null;
    return {
      levelId, prompt: 'O centro tonal soa maior ou menor?', options: modes.map(({ id, label }) => ({ id, label })),
      answerId: mode.id, audioRounds: [audioSteps.map(step => step.midi)], answerAudioRounds: [audioSteps.map(step => step.midi)],
      explanation: `O centro é ${root} ${mode.id === 'major' ? 'maior' : 'menor'}. A cadência ${mode.id === 'major' ? 'I – IV – V7 – I' : 'i – iv – V7 – i'} termina no acorde de repouso: ${spellProgression(audioSteps)}.`,
      transfer: 'Toque essa cadência no cavaquinho e tente cantar a nota de repouso antes de conferir.'
    };
  }

  if (levelId === 'center') {
    const mode = randomItem([
      { id: 'major', offsets: majorCadence },
      { id: 'minor', offsets: minorCadence }
    ], random);
    const root = randomItem(validRoots([majorCadence, minorCadence], chordDb), random);
    const audioSteps = buildProgression(root, mode.offsets, chordDb);
    if (!audioSteps) return null;
    const relativeOffset = mode.id === 'major' ? 9 : 3;
    const answerKeys = [root, transposeKey(root, 5), transposeKey(root, 7), transposeKey(root, relativeOffset)];
    return {
      levelId, prompt: 'Qual nota é o centro tonal, a sensação de repouso?',
      options: shuffle([...new Set(answerKeys)].map(key => ({ id: key, label: formatRootOption(key) })), random),
      answerId: root, audioRounds: [audioSteps.map(step => step.midi)], answerAudioRounds: [audioSteps.map(step => step.midi)],
      explanation: `A nota de repouso é ${formatRootOption(root)}; o trecho está em ${root} ${mode.id === 'major' ? 'maior' : 'menor'} e termina na tônica: ${spellProgression(audioSteps)}.`,
      transfer: 'Cante essa nota final e encontre a mesma altura no cavaquinho antes de conferir.'
    };
  }

  if (levelId === 'progression') {
    const template = randomItem(progressionTemplates, random);
    const root = randomItem(validRoots(progressionTemplates.map(item => item.offsets), chordDb), random);
    const audioSteps = buildProgression(root, template.offsets, chordDb);
    if (!audioSteps) return null;
    return {
      levelId, prompt: 'Qual caminho de graus você ouviu?',
      options: shuffle(progressionTemplates.map(({ id, label }) => ({ id, label })), random),
      answerId: template.id, audioRounds: [audioSteps.map(step => step.midi)], answerAudioRounds: [audioSteps.map(step => step.midi)],
      explanation: `Você ouviu ${template.label} em ${root} maior: ${spellProgression(audioSteps)}. Os graus descrevem a função; os nomes dos acordes mudam quando a tonalidade muda.`,
      transfer: 'Depois de responder, toque os mesmos graus em outra tonalidade.'
    };
  }

  if (levelId === 'prediction') {
    const offsets = progressionTemplates[0].offsets;
    const root = randomItem(validRoots([offsets], chordDb), random);
    const fullSteps = buildProgression(root, offsets, chordDb);
    if (!fullSteps) return null;
    const options = [
      { id: 'tonic', label: 'I · tônica, repouso' },
      { id: 'relative', label: 'vi · relativa menor' },
      { id: 'predominant', label: 'IV · preparação' }
    ];
    return {
      levelId, prompt: 'Depois de ii – V7, qual função você espera ouvir?', options,
      answerId: 'tonic', audioRounds: [fullSteps.slice(0, 2).map(step => step.midi)], answerAudioRounds: [fullSteps.map(step => step.midi)],
      explanation: `A resolução esperada é I, a tônica de ${root} maior: ${spellProgression(fullSteps)}. O V7 cria tensão que tende a resolver na tônica.`,
      transfer: 'Cante a nota de repouso e depois encontre o acorde no braço do cavaquinho.'
    };
  }

  if (levelId === 'transpose') {
    const template = progressionTemplates[0];
    const root = randomItem(validRoots([template.offsets], chordDb, transpositionIntervals), random);
    const interval = randomItem(transpositionIntervals, random);
    const first = buildProgression(root, template.offsets, chordDb);
    const nextRoot = transposeKey(root, interval);
    const second = buildProgression(nextRoot, template.offsets, chordDb);
    if (!first || !second) return null;
    const labels = new Map([
      [-2, 'Desceu um tom'], [-1, 'Desceu um semitom'], [0, 'Ficou no mesmo tom'],
      [1, 'Subiu um semitom'], [2, 'Subiu um tom']
    ]);
    return {
      levelId, prompt: 'A segunda versão subiu, desceu ou ficou no mesmo tom?',
      options: transpositionIntervals.map(value => ({ id: String(value), label: labels.get(value) })),
      answerId: String(interval), audioRounds: [first.map(step => step.midi), second.map(step => step.midi)], answerAudioRounds: [first.map(step => step.midi), second.map(step => step.midi)],
      explanation: `A segunda versão ${labels.get(interval).toLowerCase()}: ${root} → ${nextRoot}. A sequência continua ii – V7 – I: ${spellProgression(first)} → ${spellProgression(second)}.`,
      transfer: 'Escolha uma sequência sua e toque a mesma harmonia um tom acima.'
    };
  }

  return null;
}

export function normalizeEarTrainingProgress(value) {
  return Object.fromEntries(earTrainingLevels.map(({ id }) => {
    const item = value?.[id] || {};
    const attempts = Number.isInteger(item.attempts) && item.attempts > 0 ? item.attempts : 0;
    return [id, {
      attempts,
      correct: Number.isInteger(item.correct) && item.correct > 0 ? Math.min(item.correct, attempts) : 0,
      bestStreak: Number.isInteger(item.bestStreak) && item.bestStreak > 0 ? Math.min(item.bestStreak, attempts) : 0
    }];
  }));
}

export function updateEarTrainingProgress(progress, levelId, correct, currentStreak) {
  const normalized = normalizeEarTrainingProgress(progress);
  if (!normalized[levelId]) return normalized;
  const current = normalized[levelId];
  normalized[levelId] = {
    attempts: current.attempts + 1,
    correct: current.correct + (correct ? 1 : 0),
    bestStreak: Math.max(current.bestStreak, correct ? currentStreak : 0)
  };
  return normalized;
}

export function getRecommendedEarTrainingLevel(progress) {
  const normalized = normalizeEarTrainingProgress(progress);
  return earTrainingLevels.find(level => {
    const item = normalized[level.id];
    return item.attempts < 3 || item.correct / item.attempts < 2 / 3;
  }) || earTrainingLevels[earTrainingLevels.length - 1];
}

export function createSequenceRecallExercise(sequence, { chordDb = cavaquinhoChords, random = Math.random } = {}) {
  if (!sequence || !Array.isArray(sequence.steps) || sequence.steps.length < 2) return null;
  const resolved = buildSequencePractice(sequence.steps, chordDb);
  if (resolved.missing.length || resolved.steps.length < 2) return null;
  const distinct = new Map();
  resolved.steps.forEach(step => distinct.set(`${step.key}:${step.suffix}`, step));
  if (distinct.size < 2) return null;
  const nextIndex = 1 + Math.floor(random() * (resolved.steps.length - 1));
  const answer = resolved.steps[nextIndex];
  const options = shuffle([...distinct.values()].map(step => ({
    id: `${step.key}:${step.suffix}`,
    label: formatSequenceChord(step)
  })), random);
  return {
    levelId: 'sequence', sequenceId: sequence.id, sequenceTitle: sequence.title,
    prompt: `Ouça até o acorde ${nextIndex} de ${resolved.steps.length}. Qual acorde vem depois?`,
    options, answerId: `${answer.key}:${answer.suffix}`,
    audioRounds: [resolved.steps.slice(0, nextIndex).map(step => step.positions.map(position => position.midi).filter(Number.isFinite))],
    answerAudioRounds: [resolved.steps.slice(0, nextIndex + 1).map(step => step.positions.map(position => position.midi).filter(Number.isFinite))],
    explanation: `Na sequência “${sequence.title}”, o próximo acorde é ${formatSequenceChord(answer)}. Ouça novamente e repare como a passagem chega a ele.`,
    transfer: 'Toque o trecho no cavaquinho e tente antecipar essa troca antes de conferir.'
  };
}

export function normalizeSequenceEarReviews(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([id, item]) => typeof id === 'string' && item && Number.isFinite(Date.parse(item.dueAt))).map(([id, item]) => [id, {
    attempts: Number.isInteger(item.attempts) && item.attempts > 0 ? item.attempts : 0,
    correct: Number.isInteger(item.correct) && item.correct > 0 ? Math.min(item.correct, item.attempts || 0) : 0,
    streak: Number.isInteger(item.streak) && item.streak > 0 ? item.streak : 0,
    dueAt: new Date(item.dueAt).toISOString(),
    lastAnswer: item.lastAnswer === 'correct' ? 'correct' : 'incorrect'
  }]));
}

export function updateSequenceEarReview(reviews, sequenceId, correct, now = Date.now()) {
  if (typeof sequenceId !== 'string' || !sequenceId) return normalizeSequenceEarReviews(reviews);
  const normalized = normalizeSequenceEarReviews(reviews);
  const previous = normalized[sequenceId] || { attempts: 0, correct: 0, streak: 0 };
  const streak = correct ? previous.streak + 1 : 0;
  const delay = correct ? (streak > 1 ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000) : 10 * 60 * 1000;
  return { ...normalized, [sequenceId]: {
    attempts: previous.attempts + 1,
    correct: previous.correct + (correct ? 1 : 0),
    streak,
    dueAt: new Date(now + delay).toISOString(),
    lastAnswer: correct ? 'correct' : 'incorrect'
  } };
}
