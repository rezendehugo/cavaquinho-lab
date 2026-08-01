import { describe, expect, test } from 'vitest';
import {
  buildTabScore,
  buildTabScoreFromMelody,
  createNotationWithTabMusicXml,
  createTabOnlyMusicXml,
  getPlayablePositions
} from './tabScore';

const pitch = (step, octave, alter = 0) => ({ step, octave, alter });
const event = (id, note, offsetTicks = 0, durationTicks = 1) => ({
  id, pitch: note, rest: false, tie: null, offsetTicks, durationTicks, confidence: 1, alternatives: []
});

describe('partitura com tablatura', () => {
  test('mapeia cordas soltas e casas de dois dígitos', () => {
    expect(getPlayablePositions(pitch('D', 4))).toContainEqual({ stringIndex: 0, fret: 0, midi: 62 });
    expect(getPlayablePositions(pitch('C', 5))).toContainEqual({ stringIndex: 0, fret: 10, midi: 72 });
  });

  test.each([[2, 4], [3, 4], [4, 4]])('preserva compasso %s/%s e alinha duas pautas', (beats, beatType) => {
    const score = buildTabScore({
      title: 'Teste', tempo: 85, meter: { beats, beatType },
      measures: [{ number: 1, divisions: 1, expectedTicks: beats, chords: [{ symbol: 'G7', offsetTicks: 0 }], events: [event('a', pitch('D', 4))] }]
    });
    const xml = createNotationWithTabMusicXml(score);
    expect(xml).toContain(`<beats>${beats}</beats><beat-type>${beatType}</beat-type>`);
    expect(xml).toContain('<sign>TAB</sign>');
    expect(xml).toContain('<staff-lines>4</staff-lines>');
    expect(xml).toContain('<string>4</string><fret>0</fret>');
    expect(xml.match(/<note>/g)).toHaveLength(2);
  });

  test('prefere posição selecionada e acusa nota impossível', () => {
    const melody = {
      title: 'Solo', ticksPerQuarter: 1, meter: { beats: 4, beatType: 4 },
      events: [
        { ...event('one', pitch('D', 5)), measure: 1, selectedPosition: { stringIndex: 3, fret: 0, midi: 74 } },
        { ...event('two', pitch('C', 7), 1), measure: 1 }
      ]
    };
    const score = buildTabScoreFromMelody(melody);
    expect(score.measures[0].events[0].position).toMatchObject({ stringIndex: 3, fret: 0 });
    expect(score.issues).toEqual([expect.objectContaining({ eventId: 'two', code: 'unplayable_pitch' })]);
  });

  test('preserva deslocamentos e quebras de sistema da origem', () => {
    const score = buildTabScore({
      title: 'Estrutura', meter: { beats: 4, beatType: 4 },
      sourceMusicXml: '<measure number="2"><print new-system="yes"/></measure>',
      measures: [{
        number: 2, divisions: 2, expectedTicks: 8, chords: [],
        events: [event('late', pitch('G', 4), 2, 2)]
      }]
    });
    expect(score.measures[0].breakType).toBe('new-system');
    const xml = createNotationWithTabMusicXml(score);
    expect(xml).toContain('<print new-system="yes"/>');
    expect(xml.match(/<forward><duration>2<\/duration>/g)).toHaveLength(2);
  });

  test('traduz a pauta para TAB rítmica sem criar uma segunda parte', () => {
    const score = buildTabScore({
      title: 'TAB', meter: { beats: 2, beatType: 4 },
      measures: [{ number: 1, divisions: 1, expectedTicks: 2, chords: [], events: [event('a', pitch('D', 4))] }]
    });
    const xml = createTabOnlyMusicXml(score);
    expect(xml).toContain('<sign>TAB</sign>');
    expect(xml).toContain('<string>4</string><fret>0</fret>');
    expect(xml.match(/<part id="P1">/g)).toHaveLength(1);
    expect(xml).not.toContain('<staves>2</staves>');
  });

  test('preserva a estrutura editorial do MusicXML revisado nas duas versões', () => {
    const sourceMusicXml = `<?xml version="1.0"?>
      <score-partwise version="4.0">
        <part-list><score-part id="P1"><part-name>Melodia</part-name></score-part></part-list>
        <part id="P1">
          <measure number="1">
            <print new-system="yes"/>
            <attributes>
              <divisions>2</divisions>
              <time><beats>2</beats><beat-type>4</beat-type></time>
              <clef><sign>G</sign><line>2</line></clef>
            </attributes>
            <harmony><root><root-step>G</root-step></root><kind>dominant</kind></harmony>
            <note>
              <pitch><step>D</step><octave>4</octave></pitch>
              <duration>2</duration><voice>1</voice><type>quarter</type>
              <tie type="start"/><notations><tied type="start"/></notations>
            </note>
            <note><rest/><duration>2</duration><voice>1</voice><type>quarter</type></note>
            <barline location="right"><bar-style>light-heavy</bar-style><repeat direction="backward"/></barline>
          </measure>
        </part>
      </score-partwise>`;
    const score = buildTabScore({
      title: 'Original', sourceMusicXml, meter: { beats: 2, beatType: 4 },
      measures: [{
        number: 1, divisions: 2, expectedTicks: 4, newSystem: true, chords: [{ symbol: 'G7', offsetTicks: 0 }],
        events: [event('note', pitch('D', 4), 0, 2), { ...event('rest', null, 2, 2), pitch: null, rest: true }]
      }]
    });
    const combined = createNotationWithTabMusicXml(score);
    const tabOnly = createTabOnlyMusicXml(score);

    for (const xml of [combined, tabOnly]) {
      expect(xml).toContain('<print new-system="yes"/>');
      expect(xml).toContain('<harmony>');
      expect(xml).toContain('<tie type="start"/>');
      expect(xml).toContain('<repeat direction="backward"/>');
      expect(xml).toContain('<type>quarter</type>');
    }
    expect(combined.match(/<note>/g)).toHaveLength(4);
    expect(combined).toContain('<staves>2</staves>');
    expect(tabOnly.match(/<note>/g)).toHaveLength(2);
    expect(tabOnly).not.toContain('<staves>2</staves>');
  });
});
