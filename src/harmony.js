import { formatChordName, getPlayedNotes, qualityLabels } from './chordDisplay';
import { chromaticKeys } from './sequences';

const minorContext = {
  G: {
    Eb: { numeral: 'bVImaj7', functionName: 'cor predominante colorida', color: '#70a288' },
    D: { numeral: 'V7', functionName: 'dominante', color: '#d95d39' },
    G: { numeral: 'i', functionName: 'repouso menor', color: '#456990' },
    A: { numeral: 'iiø', functionName: 'preparação meio diminuta', color: '#b279a2' },
    Bb: { numeral: 'bIIImaj7', functionName: 'cor relativa maior', color: '#e9c46a' },
    E: { numeral: 'VI', functionName: 'cor cromática', color: '#9d4edd' }
  }
};

const degreeColors = ['#456990', '#70a288', '#e9c46a', '#f4a261', '#d95d39', '#b279a2', '#577590'];
const chromaticColors = ['#3a86ff', '#5e60ce', '#8338ec', '#b5179e', '#ff006e', '#fb5607', '#ffbe0b', '#80b918', '#2d6a4f', '#00b4d8', '#4361ee', '#7209b7'];
const qualityColors = { major: '#70a288', minor: '#456990', maj7: '#86bbd8', m7: '#577590', '7': '#d95d39', m7b5: '#b279a2', dim: '#6d597a', dim7: '#5e548e' };
const functionColors = { dominante: '#d95d39', repouso: '#456990', predominante: '#70a288', cromatica: '#9d4edd' };

const pitchIndex = (key) => chromaticKeys.indexOf(key);

export const inferKeyCenter = (sequence) => {
  const names = sequence.map(step => formatChordName(step.key, step.suffix));
  if (names.includes('Ebmaj7') && names.includes('D7') && names.some(name => name === 'Gm' || name === 'Gm7')) return { key: 'G', mode: 'menor', label: 'G menor' };
  const last = sequence[sequence.length - 1];
  if (!last) return null;
  if (last.suffix === 'minor' || last.suffix === 'm7') return { key: last.key, mode: 'menor', label: last.key + ' menor' };
  return { key: last.key, mode: 'maior', label: last.key + ' maior' };
};

export const analyzeSequence = (sequence, optimizedSteps = []) => {
  const keyCenter = inferKeyCenter(sequence);
  const context = keyCenter?.mode === 'menor' ? minorContext[keyCenter.key] : null;
  const chords = sequence.map((step, index) => {
    const contextInfo = context?.[step.key];
    const position = optimizedSteps[index]?.position;
    const currentNotes = position ? getPlayedNotes(position) : [];
    const nextNotes = optimizedSteps[index + 1]?.position ? getPlayedNotes(optimizedSteps[index + 1].position) : [];
    const commonTones = currentNotes.filter((note, noteIndex) => currentNotes.indexOf(note) === noteIndex && nextNotes.includes(note));
    return {
      ...step,
      name: formatChordName(step.key, step.suffix, step.bass),
      numeral: contextInfo?.numeral || 'análise aberta',
      functionName: contextInfo?.functionName || (step.suffix === '7' ? 'dominante possível' : 'cor harmônica'),
      commonTones,
      advice: commonTones.length > 0
        ? 'Mantenha em mente as notas comuns: ' + commonTones.join(', ') + '.'
        : 'Ouça a troca completa de cor entre estes acordes.'
    };
  });
  return {
    keyCenter,
    chords,
    summary: keyCenter
      ? 'Centro tonal provável: ' + keyCenter.label + '.'
      : 'Centro tonal ainda nao definido para esta sequencia.',
    tension: chords.some(chord => chord.functionName.includes('dominante'))
      ? 'O acorde dominante cria tensão e pede resolução no acorde de repouso.'
      : 'A sequencia privilegia cor e movimento, sem uma dominante clara.'
  };
};

export const getColorForChord = (step, analysisChord, mode, keyCenter) => {
  if (mode === 'desligado') return '#d7dde5';
  if (mode === 'notas') return chromaticColors[pitchIndex(step.key)] || '#d7dde5';
  if (mode === 'qualidade') return qualityColors[step.suffix] || '#90a4ae';
  if (mode === 'funcao') {
    const name = analysisChord?.functionName || '';
    if (name.includes('dominante')) return functionColors.dominante;
    if (name.includes('repouso')) return functionColors.repouso;
    if (name.includes('predominante')) return functionColors.predominante;
    return functionColors.cromatica;
  }
  if (mode === 'personalizadas') return '#7c3aed';
  if (!keyCenter) return chromaticColors[pitchIndex(step.key)] || '#d7dde5';
  const distance = (pitchIndex(step.key) - pitchIndex(keyCenter.key) + 12) % 12;
  const degreeMap = { 0: 0, 2: 1, 3: 2, 4: 2, 5: 3, 7: 4, 8: 5, 9: 5, 10: 6, 11: 6 };
  return degreeColors[degreeMap[distance] ?? 0];
};

export const buildExercises = (sequence, analysis, optimizedSteps = []) => {
  const dominant = analysis.chords.find(chord => chord.functionName.includes('dominante'));
  const resolution = analysis.chords.find(chord => chord.functionName.includes('repouso')) || analysis.chords[analysis.chords.length - 1];
  const firstWithCommon = analysis.chords.find(chord => chord.commonTones.length > 0);
  const firstShape = optimizedSteps[0];
  return [
    { title: 'Dominante', prompt: dominant ? 'Qual acorde cria a tensão dominante nesta sequencia?' : 'Existe uma dominante clara nesta sequencia?', answer: dominant ? dominant.name : 'Não há dominante clara.' },
    { title: 'Resolucao', prompt: 'Qual acorde soa como ponto de chegada?', answer: resolution?.name || 'A chegada ainda esta aberta.' },
    { title: 'Notas comuns', prompt: firstWithCommon ? 'Quais notas podem ligar dois acordes vizinhos?' : 'Procure se ha notas comuns entre acordes vizinhos.', answer: firstWithCommon ? firstWithCommon.commonTones.join(', ') : 'Nenhuma nota comum forte foi detectada nas formas atuais.' },
    { title: 'Forma suave', prompt: 'Compare duas formas e escolha o caminho com menor movimento.', answer: 'Use o menor movimento total como ponto de partida, depois ajuste pelo conforto.' },
    { title: 'Notas da forma', prompt: firstShape ? 'Quais notas aparecem na primeira forma selecionada?' : 'Escolha uma forma para identificar suas notas.', answer: firstShape ? getPlayedNotes(firstShape.position).join(', ') : 'Sem forma selecionada.' },
    { title: 'Transposição', prompt: 'Transponha a sequência para outro tom e compare a região do braço.', answer: 'Mantenha a mesma função harmônica e procure formas próximas.' },
    { title: 'Qualidade e cor', prompt: 'Associe cada qualidade de acorde a uma sensação de cor.', answer: sequence.map(step => formatChordName(step.key, step.suffix) + ': ' + (qualityLabels[step.suffix] || step.suffix)).join(' | ') },
    { title: 'Grau e cor', prompt: 'Use as cores por grau para perceber repouso, preparação e tensão.', answer: analysis.summary }
  ];
};