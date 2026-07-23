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
});
