const midiFrequency = midi => 440 * (2 ** ((midi - 69) / 12));

function schedulePluckedNote(context, midi, startTime, duration) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = 'triangle';
  oscillator.frequency.setValueAtTime(midiFrequency(midi), startTime);
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(0.055, startTime + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.012, startTime + 0.16);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(startTime);
  oscillator.stop(startTime + duration + 0.01);
}

export function playEarTrainingRounds(context, rounds, { chordSeconds = 0.68, chordGapSeconds = 0.12, roundGapSeconds = 0.9 } = {}) {
  if (!context || !Array.isArray(rounds) || !rounds.length || rounds.some(round => !Array.isArray(round) || !round.length || round.some(chord => !Array.isArray(chord) || chord.length < 2))) {
    throw new Error('Sequência de áudio inválida.');
  }
  let cursor = context.currentTime + 0.08;
  rounds.forEach((round, roundIndex) => {
    round.forEach(chord => {
      chord.forEach(midi => schedulePluckedNote(context, midi, cursor, chordSeconds));
      cursor += chordSeconds + chordGapSeconds;
    });
    if (roundIndex < rounds.length - 1) cursor += roundGapSeconds;
  });
  return Math.max(0, (cursor - context.currentTime) * 1000);
}
