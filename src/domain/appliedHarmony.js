import { chromaticKeys } from '../sequences';

const majorField = [
  { interval: 0, suffix: 'major', numeral: 'I', functionId: 'tonic' },
  { interval: 2, suffix: 'minor', numeral: 'ii', functionId: 'predominant' },
  { interval: 4, suffix: 'minor', numeral: 'iii', functionId: 'tonic' },
  { interval: 5, suffix: 'major', numeral: 'IV', functionId: 'predominant' },
  { interval: 7, suffix: 'major', numeral: 'V', functionId: 'dominant' },
  { interval: 9, suffix: 'minor', numeral: 'vi', functionId: 'tonic' },
  { interval: 11, suffix: 'dim', numeral: 'vii°', functionId: 'dominant' }
];

const minorField = [
  { interval: 0, suffix: 'minor', numeral: 'i', functionId: 'tonic' },
  { interval: 2, suffix: 'dim', numeral: 'ii°', functionId: 'predominant' },
  { interval: 3, suffix: 'major', numeral: 'III', functionId: 'tonic' },
  { interval: 5, suffix: 'minor', numeral: 'iv', functionId: 'predominant' },
  { interval: 7, suffix: 'minor', numeral: 'v', functionId: 'dominant' },
  { interval: 8, suffix: 'major', numeral: 'VI', functionId: 'tonic' },
  { interval: 10, suffix: 'major', numeral: 'VII', functionId: 'dominant' }
];

const functionNames = {
  tonic: 'repouso',
  predominant: 'preparação',
  dominant: 'tensão dominante'
};

function normalizeSuffix(suffix) {
  if (suffix === '7') return 'major';
  if (suffix === 'm7' || suffix === 'm9') return 'minor';
  if (suffix === 'maj7' || suffix === 'maj9' || suffix === '6' || suffix === '69') return 'major';
  return suffix;
}

export function buildHarmonicField(keyCenter) {
  if (!keyCenter || !chromaticKeys.includes(keyCenter.key)) return [];
  const tonicIndex = chromaticKeys.indexOf(keyCenter.key);
  const formula = keyCenter.mode === 'menor' ? minorField : majorField;
  return formula.map(degree => ({
    ...degree,
    key: chromaticKeys[(tonicIndex + degree.interval) % 12],
    functionName: functionNames[degree.functionId]
  }));
}

export function analyzeHarmonicFunction(step, keyCenter) {
  if (!step || !keyCenter) return null;
  const field = buildHarmonicField(keyCenter);
  const normalizedSuffix = normalizeSuffix(step.suffix);
  const degree = field.find(item => item.key === step.key && item.suffix === normalizedSuffix);
  if (degree) {
    return {
      ...degree,
      numeral: step.suffix === '7' ? `${degree.numeral}7` : degree.numeral
    };
  }
  if (keyCenter.mode === 'menor' && step.suffix === '7') {
    const tonicIndex = chromaticKeys.indexOf(keyCenter.key);
    if (step.key === chromaticKeys[(tonicIndex + 7) % 12]) {
      return { key: step.key, suffix: step.suffix, numeral: 'V7', functionId: 'dominant', functionName: functionNames.dominant };
    }
  }
  return { key: step.key, suffix: step.suffix, numeral: 'fora do campo', functionId: 'chromatic', functionName: 'cor cromática' };
}

export function getFunctionalSubstitutions(step, keyCenter) {
  const analysis = analyzeHarmonicFunction(step, keyCenter);
  if (!analysis || analysis.functionId === 'chromatic') return [];
  return buildHarmonicField(keyCenter)
    .filter(candidate => candidate.functionId === analysis.functionId)
    .filter(candidate => !(candidate.key === step.key && candidate.suffix === normalizeSuffix(step.suffix)));
}
