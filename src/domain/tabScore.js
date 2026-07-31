import { cavaquinhoOpenMidi } from './scalePaths';

const pitchSteps = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

const escapeXml = value => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&apos;');

export function pitchToMidi(pitch) {
  if (!pitch || pitchSteps[pitch.step] === undefined) return null;
  return (pitch.octave + 1) * 12 + pitchSteps[pitch.step] + (pitch.alter || 0);
}

export function getPlayablePositions(pitch) {
  const midi = pitchToMidi(pitch);
  if (midi === null) return [];
  return cavaquinhoOpenMidi.flatMap((openMidi, stringIndex) => {
    const fret = midi - openMidi;
    return fret >= 0 && fret <= 12 ? [{ stringIndex, fret, midi }] : [];
  });
}

function choosePosition(event, previous, override) {
  if (event.rest) return null;
  const preferred = override || event.selectedPosition || event.suggestedPosition;
  const candidates = getPlayablePositions(event.pitch);
  if (preferred && candidates.some(item => item.stringIndex === preferred.stringIndex && item.fret === preferred.fret)) {
    return { ...preferred, midi: pitchToMidi(event.pitch) };
  }
  return candidates.toSorted((left, right) => {
    if (!previous) return left.fret - right.fret || left.stringIndex - right.stringIndex;
    const leftCost = Math.abs(left.fret - previous.fret) * 2 + Math.abs(left.stringIndex - previous.stringIndex);
    const rightCost = Math.abs(right.fret - previous.fret) * 2 + Math.abs(right.stringIndex - previous.stringIndex);
    return leftCost - rightCost || left.fret - right.fret;
  })[0] || null;
}

export function buildTabScore(source, options = {}) {
  const overrides = options.positionOverrides || {};
  let previous = null;
  const issues = [];
  const sourceXml = source.sourceMusicXml || '';
  const measures = (source.measures || []).map(measure => {
    const sourceMeasure = new RegExp(`<measure\\s+[^>]*number=["']${measure.number}["'][^>]*>([\\s\\S]*?)</measure>`, 'i')
      .exec(sourceXml)?.[1] || '';
    const events = [...measure.events].sort((left, right) => left.offsetTicks - right.offsetTicks).map(event => {
      const position = choosePosition(event, previous, overrides[event.id]);
      if (!event.rest && !position) {
        issues.push({ eventId: event.id, measure: measure.number, code: 'unplayable_pitch', message: 'Escolha uma posição tocável no braço.' });
      }
      if (position) previous = position;
      return { ...event, position };
    });
    return {
      number: measure.number,
      divisions: measure.divisions || source.ticksPerQuarter || 1,
      expectedTicks: measure.expectedTicks,
      page: measure.page || 1,
      system: measure.system || 1,
      newPage: Boolean(measure.newPage || /<print\s+[^>]*new-page=["']yes["']/i.test(sourceMeasure)),
      newSystem: Boolean(measure.newSystem || /<print\s+[^>]*(?:new-page|new-system)=["']yes["']/i.test(sourceMeasure)),
      events,
      chords: measure.chords || [],
      section: (source.sections || []).find(section => section.startMeasure === measure.number)?.title || null,
      breakType: /<print\s+[^>]*(new-page|new-system)=["']yes["']/i.exec(sourceMeasure)?.[1] || null
    };
  });
  return {
    title: source.title || 'Partitura com TAB',
    composer: source.composer || null,
    tempo: source.tempo || 80,
    meter: source.meter || { beats: 4, beatType: 4 },
    tuning: ['D4', 'G4', 'B4', 'D5'],
    sourceMusicXml: source.sourceMusicXml || '',
    hasOriginalLayout: (source.measures || []).some(measure => measure.newSystem || measure.newPage)
      || /<print\s+[^>]*(?:new-page|new-system)=["']yes["']/i.test(sourceXml),
    measures,
    issues
  };
}

export function buildTabScoreFromMelody(melody, options = {}) {
  const grouped = new Map();
  for (const event of melody.events || []) {
    const measure = grouped.get(event.measure) || {
      number: event.measure,
      divisions: melody.ticksPerQuarter || 1,
      expectedTicks: (melody.meter?.beats || 4) * (melody.ticksPerQuarter || 1) * 4 / (melody.meter?.beatType || 4),
      events: [],
      chords: []
    };
    measure.events.push(event);
    grouped.set(event.measure, measure);
  }
  return buildTabScore({ ...melody, measures: [...grouped.values()].sort((a, b) => a.number - b.number) }, options);
}

function pitchXml(pitch) {
  return `<pitch><step>${pitch.step}</step>${pitch.alter ? `<alter>${pitch.alter}</alter>` : ''}<octave>${pitch.octave}</octave></pitch>`;
}

function noteXml(event, staff, divisions) {
  const duration = Math.max(1, Math.round(event.durationTicks || divisions));
  const tie = event.tie ? `<tie type="${event.tie}"/>` : '';
  const tied = event.tie ? `<tied type="${event.tie}"/>` : '';
  const technical = staff === 2 && event.position
    ? `<technical><string>${4 - event.position.stringIndex}</string><fret>${event.position.fret}</fret></technical>`
    : '';
  const notation = tied || technical ? `<notations>${tied}${technical}</notations>` : '';
  return `<note>${event.rest ? '<rest/>' : pitchXml(event.pitch)}${tie}<duration>${duration}</duration><voice>1</voice><staff>1</staff>${notation}</note>`;
}

function directionXml(chord) {
  return `<direction placement="above"><direction-type><words font-weight="bold">${escapeXml(chord.symbol)}</words></direction-type><offset>${Math.max(0, chord.offsetTicks || 0)}</offset><staff>1</staff></direction>`;
}

function eventsXml(events, staff, divisions) {
  let cursor = 0;
  return events.map(event => {
    const gap = Math.max(0, Math.round(event.offsetTicks - cursor));
    const forward = gap ? `<forward><duration>${gap}</duration><voice>1</voice><staff>1</staff></forward>` : '';
    cursor = Math.max(cursor, event.offsetTicks) + event.durationTicks;
    return forward + noteXml(event, staff, divisions);
  }).join('');
}

export function tabScoreToMusicXml(score) {
  const standardMeasures = score.measures.map((measure, index) => {
    const attributes = index === 0
      ? `<attributes><divisions>${measure.divisions}</divisions><time><beats>${score.meter.beats}</beats><beat-type>${score.meter.beatType}</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>`
      : `<attributes><divisions>${measure.divisions}</divisions></attributes>`;
    const section = measure.section ? `<direction placement="above"><direction-type><rehearsal>${escapeXml(measure.section)}</rehearsal></direction-type><staff>1</staff></direction>` : '';
    const tempo = index === 0 ? `<direction placement="above"><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>${score.tempo}</per-minute></metronome></direction-type><sound tempo="${score.tempo}"/></direction>` : '';
    const pageBreak = measure.breakType ? `<print ${measure.breakType}="yes"/>` : '';
    return `<measure number="${measure.number}">${pageBreak}${attributes}${section}${tempo}${measure.chords.map(directionXml).join('')}${eventsXml(measure.events, 1, measure.divisions)}</measure>`;
  }).join('');
  return `<?xml version="1.0" encoding="UTF-8"?><score-partwise version="4.0"><work><work-title>${escapeXml(score.title)}</work-title></work><identification>${score.composer ? `<creator type="composer">${escapeXml(score.composer)}</creator>` : ''}</identification><part-list><score-part id="P1"><part-name>Cavaquinho</part-name></score-part></part-list><part id="P1">${standardMeasures}</part></score-partwise>`;
}

const directChildren = (element, tagName) => [...element.children].filter(child => child.tagName === tagName);

function setTextChild(document, parent, tagName, value) {
  let child = directChildren(parent, tagName)[0];
  if (!child) {
    child = document.createElement(tagName);
    parent.append(child);
  }
  child.textContent = String(value);
  return child;
}

function tabStaffDetails(document, number = null) {
  const details = document.createElement('staff-details');
  if (number) details.setAttribute('number', String(number));
  setTextChild(document, details, 'staff-type', 'alternate');
  setTextChild(document, details, 'staff-lines', 4);
  [['D', 4], ['G', 4], ['B', 4], ['D', 5]].forEach(([step, octave], index) => {
    const tuning = document.createElement('staff-tuning');
    tuning.setAttribute('line', String(index + 1));
    setTextChild(document, tuning, 'tuning-step', step);
    setTextChild(document, tuning, 'tuning-octave', octave);
    details.append(tuning);
  });
  return details;
}

function tabClef(document, number = null) {
  const clef = document.createElement('clef');
  if (number) clef.setAttribute('number', String(number));
  setTextChild(document, clef, 'sign', 'TAB');
  setTextChild(document, clef, 'line', 5);
  return clef;
}

function addTechnicalPosition(document, note, position) {
  if (!position || directChildren(note, 'rest').length) return;
  let notations = directChildren(note, 'notations')[0];
  if (!notations) {
    notations = document.createElement('notations');
    note.append(notations);
  }
  directChildren(notations, 'technical').forEach(node => node.remove());
  const technical = document.createElement('technical');
  setTextChild(document, technical, 'string', 4 - position.stringIndex);
  setTextChild(document, technical, 'fret', position.fret);
  notations.append(technical);
}

function ensureMeasurePrint(document, measureElement, measure) {
  if (!measure.newPage && !measure.newSystem) return;
  let print = directChildren(measureElement, 'print')[0];
  if (!print) {
    print = document.createElement('print');
    measureElement.prepend(print);
  }
  if (measure.newPage) print.setAttribute('new-page', 'yes');
  else print.setAttribute('new-system', 'yes');
}

function sourceDocument(score) {
  const parser = new DOMParser();
  if (score.sourceMusicXml?.includes('<score-partwise')) {
    const sourceDocument = parser.parseFromString(score.sourceMusicXml, 'application/xml');
    if (!sourceDocument.querySelector('parsererror') && sourceDocument.querySelector('score-partwise > part > measure')) {
      return sourceDocument;
    }
  }
  const fallback = parser.parseFromString(tabScoreToMusicXml(score), 'application/xml');
  if (fallback.querySelector('parsererror')) throw new Error('invalid_source_musicxml');
  return fallback;
}

function prepareAttributes(document, measure, mode, isFirst) {
  if (!isFirst) return;
  let attributes = directChildren(measure, 'attributes')[0];
  if (!attributes) {
    attributes = document.createElement('attributes');
    measure.prepend(attributes);
  }
  directChildren(attributes, 'staves').forEach(node => node.remove());
  directChildren(attributes, 'staff-details').forEach(node => node.remove());
  const clefs = directChildren(attributes, 'clef');
  if (mode === 'combined') {
    const staves = document.createElement('staves');
    staves.textContent = '2';
    if (clefs[0]) attributes.insertBefore(staves, clefs[0]);
    else attributes.append(staves);
    clefs.forEach(clef => clef.setAttribute('number', '1'));
    attributes.append(tabClef(document, 2), tabStaffDetails(document, 2));
  } else {
    clefs.forEach(node => node.remove());
    attributes.append(tabClef(document), tabStaffDetails(document));
  }
}

function attachTabToMeasure(document, measureElement, scoreMeasure, mode, isFirst) {
  ensureMeasurePrint(document, measureElement, scoreMeasure);
  const notes = directChildren(measureElement, 'note');
  if (mode === 'tab') {
    prepareAttributes(document, measureElement, mode, isFirst);
    notes.forEach((note, index) => {
      directChildren(note, 'staff').forEach(node => node.remove());
      addTechnicalPosition(document, note, scoreMeasure.events[index]?.position);
    });
    return;
  }

  prepareAttributes(document, measureElement, mode, isFirst);
  notes.forEach(note => {
    const staff = setTextChild(document, note, 'staff', 1);
    note.append(staff);
  });
  const backup = document.createElement('backup');
  setTextChild(document, backup, 'duration', Math.max(1, Math.round(scoreMeasure.expectedTicks || 1)));
  measureElement.append(backup);
  let cursor = 0;
  notes.forEach((note, index) => {
    const event = scoreMeasure.events[index];
    if (!event) return;
    const gap = Math.max(0, Math.round(event.offsetTicks - cursor));
    if (gap) {
      const forward = document.createElement('forward');
      setTextChild(document, forward, 'duration', gap);
      setTextChild(document, forward, 'voice', 2);
      setTextChild(document, forward, 'staff', 2);
      measureElement.append(forward);
    }
    const clone = note.cloneNode(true);
    setTextChild(document, clone, 'voice', 2);
    setTextChild(document, clone, 'staff', 2);
    addTechnicalPosition(document, clone, event.position);
    measureElement.append(clone);
    cursor = Math.max(cursor, event.offsetTicks) + event.durationTicks;
  });
}

function transformMusicXml(score, mode) {
  const document = sourceDocument(score);
  const part = document.querySelector('score-partwise > part');
  if (!part) throw new Error('invalid_source_musicxml');
  const measures = directChildren(part, 'measure');
  measures.forEach((measure, index) => {
    const scoreMeasure = score.measures[index];
    if (scoreMeasure) attachTabToMeasure(document, measure, scoreMeasure, mode, index === 0);
  });
  return new XMLSerializer().serializeToString(document);
}

export const createNotationWithTabMusicXml = score => transformMusicXml(score, 'combined');
export const createTabOnlyMusicXml = score => transformMusicXml(score, 'tab');

export function downloadTextFile(content, fileName, type = 'application/xml;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function safeScoreFileName(value) {
  return (value || 'partitura-tab').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'partitura-tab';
}
