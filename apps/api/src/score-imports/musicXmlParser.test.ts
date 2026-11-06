import { describe, expect, test } from 'vitest';
import { hasCriticalIssues, parseMusicXml } from './musicXmlParser.js';

const score = `<?xml version="1.0"?>
<score-partwise version="4.0"><work><work-title>Estudo em C</work-title></work><part-list><score-part id="P1"><part-name>Melodia</part-name></score-part></part-list><part id="P1">
<measure number="1"><attributes><divisions>2</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes><direction><sound tempo="96"/></direction>
<harmony><root><root-step>C</root-step></root><kind>major</kind></harmony>
<note><pitch><step>C</step><octave>4</octave></pitch><duration>2</duration></note><note><pitch><step>D</step><octave>4</octave></pitch><duration>2</duration></note><note><rest/><duration>4</duration></note></measure>
</part></score-partwise>`;

describe('MusicXML normalizer', () => {
  test('preserves meter, rhythm, chords, rests and confidence', () => {
    const draft = parseMusicXml(score, { importId: 'import-1', ownerId: 'user-1' });
    expect(draft).toMatchObject({ title: 'Estudo em C', tempo: 96, meter: { beats: 4, beatType: 4 }, revision: 1 });
    expect(draft.measures[0]).toMatchObject({ expectedTicks: 8, issues: [], chords: [expect.objectContaining({ symbol: 'C', confidence: 1 })] });
    expect(draft.measures[0].events).toEqual([
      expect.objectContaining({ offsetTicks: 0, durationTicks: 2, pitch: { step: 'C', alter: 0, octave: 4 }, rest: false }),
      expect.objectContaining({ offsetTicks: 2, durationTicks: 2, pitch: { step: 'D', alter: 0, octave: 4 }, rest: false }),
      expect.objectContaining({ offsetTicks: 4, durationTicks: 4, pitch: null, rest: true })
    ]);
    expect(hasCriticalIssues(draft)).toBe(false);
  });

  test('blocks structurally incomplete measures and hostile XML', () => {
    const incomplete = parseMusicXml(score.replace('<duration>4</duration>', '<duration>2</duration>'), { importId: 'i', ownerId: 'u' });
    expect(hasCriticalIssues(incomplete)).toBe(true);
    expect(() => parseMusicXml('<!DOCTYPE x [<!ENTITY a "b">]><score-partwise/>', { importId: 'i', ownerId: 'u' })).toThrow('unsafe_musicxml');
    expect(() => parseMusicXml(score.replace('</part></score-partwise>', '</part><part id="P2"/></score-partwise>'), { importId: 'i', ownerId: 'u' })).toThrow('unsupported_musicxml_structure');
  });

  test('preserves rehearsal sections, composer, slash bass and compact chord qualities', () => {
    const nivaldoLike = score
      .replace('<work-title>Estudo em C</work-title>', '<work-title>Nivaldo no choro</work-title>')
      .replace('<part-list>', '<identification><creator type="composer">Severino Araujo</creator></identification><part-list>')
      .replace('<direction><sound tempo="96"/></direction>', '<direction><direction-type><rehearsal>A</rehearsal></direction-type><sound tempo="85"/></direction>')
      .replace(
        '<harmony><root><root-step>C</root-step></root><kind>major</kind></harmony>',
        '<harmony><root><root-step>E</root-step></root><kind>dominant</kind><bass><bass-step>G</bass-step><bass-alter>1</bass-alter></bass></harmony>'
      )
      .replace('</measure>', '</measure><measure number="2"><direction><direction-type><rehearsal>B</rehearsal></direction-type></direction><note><rest/><duration>8</duration></note></measure>');
    const draft = parseMusicXml(nivaldoLike, { importId: 'nivaldo', ownerId: 'reviewer' });
    expect(draft).toMatchObject({
      title: 'Nivaldo no choro',
      composer: 'Severino Araujo',
      tempo: 85,
      sections: [
        { title: 'Seção A', startMeasure: 1, endMeasure: 1 },
        { title: 'Seção B', startMeasure: 2, endMeasure: 2 }
      ]
    });
    expect(draft.measures[0].chords[0].symbol).toBe('E7/G#');
  });

  test('includes printed chord symbols exported as text directions in score order', () => {
    const withChordNames = score.replace(
      '<direction><sound tempo="96"/></direction>',
      '<direction><direction-type><words>F#13</words></direction-type><offset>2</offset></direction>' +
        '<direction><direction-type><words>F#7b13</words></direction-type><offset>4</offset></direction>' +
        '<direction><direction-type><words>B9</words></direction-type><offset>6</offset></direction><direction><sound tempo="96"/></direction>'
    );
    const draft = parseMusicXml(withChordNames, { importId: 'printed-chords', ownerId: 'user-1' });
    expect(draft.measures[0].chords.map(chord => [chord.symbol, chord.offsetTicks])).toEqual([
      ['C', 0], ['F#13', 2], ['F#7b13', 4], ['B9', 6]
    ]);
  });

  test('splits and cleans OCR-combined chord labels without losing their printed suffixes', () => {
    const ocrWords = score.replace(
      '<direction><sound tempo="96"/></direction>',
      '<direction><direction-type><words>F#7|a13 B9</words></direction-type></direction>' +
        '<direction><direction-type><words>Em7b5A7l13</words></direction-type></direction>' +
        '<direction><direction-type><words>Fma7J</words></direction-type></direction>' +
        '<direction><direction-type><words>GmG</words></direction-type></direction>' +
        '<direction><sound tempo="96"/></direction>'
    );
    const draft = parseMusicXml(ocrWords, { importId: 'ocr-chords', ownerId: 'user-1' });
    expect(draft.measures[0].chords.map(chord => chord.symbol)).toEqual([
      'C', 'F#7b13', 'B9', 'Em7b5', 'A7b13', 'Fmaj7', 'Gm6'
    ]);
  });

  test('formats MusicXML major ninth chord kinds with the conventional maj9 suffix', () => {
    const majorNinth = score.replace(
      '<harmony><root><root-step>C</root-step></root><kind>major</kind></harmony>',
      '<harmony><root><root-step>D</root-step></root><kind>major-ninth</kind></harmony>'
    );
    expect(parseMusicXml(majorNinth, { importId: 'major-ninth', ownerId: 'user-1' }).measures[0].chords[0].symbol).toBe('Dmaj9');
  });
});
