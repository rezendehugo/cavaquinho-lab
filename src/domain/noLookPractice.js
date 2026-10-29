const chordQualities = {
  major: 'maior', minor: 'menor', '6': 'maior com sexta', 'm6': 'menor com sexta',
  '7': 'dominante com sétima', '9': 'dominante com nona', '69': 'maior com sexta e nona',
  add9: 'maior com nona adicionada', aug: 'aumentado', maj7: 'maior com sétima maior',
  maj9: 'maior com sétima maior e nona', m7: 'menor com sétima', m9: 'menor com sétima e nona',
  madd9: 'menor com nona adicionada', mmaj7: 'menor com sétima maior', m7b5: 'meio-diminuto',
  dim: 'diminuto', dim7: 'diminuto com sétima', sus2: 'suspenso com segunda',
  sus4: 'suspenso com quarta', '7sus4': 'dominante suspenso com quarta'
};

export function getChordQualityHint(suffix) {
  return chordQualities[suffix] || 'qualidade especial';
}
