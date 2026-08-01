import { formatSequenceChord } from '../chordDisplay';
import { cavaquinhoChords } from './chords';

export const MARKDOWN_MEASURES_PER_SYSTEM = 8;

const safeFileName = value => (value || 'pratica').normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-zA-Z0-9_-]+/g, '-')
  .replace(/^-|-$/g, '')
  .toLowerCase() || 'pratica';

export function buildChordMarkdown(sequence, metadata = {}) {
  const shapeDescription = step => {
    if (!Number.isInteger(step.positionIndex)) return 'Automática';
    const chord = (cavaquinhoChords.chords[step.key] || []).find(item => item.suffix === step.suffix);
    const position = chord?.positions?.[step.positionIndex];
    const frets = position?.frets?.map(fret => fret < 0 ? 'X' : fret).join('–');
    return `Forma ${step.positionIndex + 1}${frets ? ` (${frets})` : ''}`;
  };
  const lines = [
    `# ${metadata.title || sequence.title || 'Sequência de acordes'}`,
    '',
    metadata.composer ? `**Compositor:** ${metadata.composer}` : '',
    `**Andamento:** ${metadata.tempo || sequence.practiceBpm || 80} BPM`,
    metadata.meter ? `**Compasso:** ${metadata.meter.beats}/${metadata.meter.beatType}` : '',
    '',
    '## Progressão',
    '',
    sequence.steps.map(formatSequenceChord).join(' | '),
    '',
    '## Acordes',
    '',
    '| # | Medida | Pulso | Acorde | Forma |',
    '|---:|---:|---:|---|---|',
    ...sequence.steps.map((step, index) => {
      const shape = shapeDescription(step);
      return `| ${index + 1} | ${step.measure ?? '—'} | ${step.offsetTicks ?? '—'} | ${formatSequenceChord(step)} | ${shape} |`;
    })
  ].filter(line => line !== '');
  return { fileName: `${safeFileName(metadata.title || sequence.title)}-acordes.md`, content: `${lines.join('\n')}\n` };
}

function eventPosition(event) {
  return event.selectedPosition || event.suggestedPosition || null;
}

export function buildTablatureMarkdown(melody) {
  const tuning = ['D', 'G', 'B', 'D'];
  const warnings = [];
  const measures = new Map();
  for (const event of melody.events || []) {
    const list = measures.get(event.measure) || [];
    list.push(event);
    measures.set(event.measure, list);
  }
  const tabLines = tuning.map((name, stringIndex) => ({ stringIndex, value: `${name}|` }));
  for (const [measure, events] of measures) {
    const sorted = [...events].sort((left, right) => left.offsetTicks - right.offsetTicks);
    for (const event of sorted) {
      const position = eventPosition(event);
      const token = event.rest ? 'r' : position ? String(position.fret) : '?';
      if (!event.rest && !position) warnings.push(`Medida ${measure}: posição não definida para ${event.id}.`);
      const width = Math.max(3, token.length + 2);
      tabLines.forEach(line => {
        const played = position?.stringIndex === line.stringIndex;
        const marker = played ? token : event.tie === 'stop' && played ? '~' : '-';
        line.value += marker.padStart(Math.ceil((width + marker.length) / 2), '-').padEnd(width, '-');
      });
    }
    tabLines.forEach(line => { line.value += '|'; });
  }
  const lines = [
    `# ${melody.title || 'Tablatura'}`,
    '',
    `**Afinação:** D–G–B–D`,
    `**Andamento:** ${melody.tempo || 80} BPM`,
    `**Compasso:** ${melody.meter?.beats || 4}/${melody.meter?.beatType || 4}`,
    '',
    '## Tablatura',
    '',
    '```text',
    ...tabLines.slice().reverse().map(line => line.value),
    '```',
    ...(warnings.length ? ['', '## Avisos', '', ...warnings.map(item => `- ${item}`)] : [])
  ];
  return { fileName: `${safeFileName(melody.title)}-tablatura.md`, content: `${lines.join('\n')}\n`, warnings };
}

function tabMeasure(measure, warnings) {
  const events = [...measure.events].sort((left, right) => left.offsetTicks - right.offsetTicks);
  const lines = ['', '', '', ''];
  for (const event of events) {
    const position = event.position || eventPosition(event);
    const token = event.rest ? 'r' : position ? `${position.fret}${event.tie ? '~' : ''}` : '?';
    if (!event.rest && !position) warnings.push(`Medida ${measure.number}: posição não definida para ${event.id}.`);
    const width = Math.max(3, token.length + 2);
    lines.forEach((_line, stringIndex) => {
      const marker = event.rest
        ? stringIndex === 3 ? token : '-'
        : position?.stringIndex === stringIndex ? token : !position && stringIndex === 3 ? token : '-';
      lines[stringIndex] += marker.padStart(Math.ceil((width + marker.length) / 2), '-').padEnd(width, '-');
    });
  }
  return lines.map(line => `${line}|`);
}

export function buildSystemTablatureMarkdown(score) {
  const warnings = [];
  const measures = score.measures || [];
  const systems = [];
  for (let index = 0; index < measures.length; index += MARKDOWN_MEASURES_PER_SYSTEM) {
    const systemMeasures = measures.slice(index, index + MARKDOWN_MEASURES_PER_SYSTEM);
    systems.push({
      page: systemMeasures[0]?.page || 1,
      system: systems.length + 1,
      measures: systemMeasures
    });
  }
  const body = [];
  let currentPage = null;
  for (const system of systems) {
    if (system.page !== currentPage) {
      currentPage = system.page;
      body.push(`## Página ${currentPage}`, '');
    }
    const first = system.measures[0]?.number;
    const last = system.measures.at(-1)?.number;
    const chords = system.measures.flatMap(measure => measure.chords || [])
      .map(chord => chord.symbol).filter(Boolean);
    const renderedMeasures = system.measures.map(measure => tabMeasure(measure, warnings));
    body.push(
      `### Sistema ${system.system} · compassos ${first}${first === last ? '' : `–${last}`}`,
      '',
      chords.length ? `**Cifras:** ${chords.join(' · ')}` : '**Cifras:** —',
      '',
      '```text',
      `       ${system.measures.map(measure => `M${measure.number}|`).join(' ')}`,
      `D5 |${renderedMeasures.map(lines => lines[3]).join('')}`,
      `B4 |${renderedMeasures.map(lines => lines[2]).join('')}`,
      `G4 |${renderedMeasures.map(lines => lines[1]).join('')}`,
      `D4 |${renderedMeasures.map(lines => lines[0]).join('')}`,
      '```',
      ''
    );
  }
  const lines = [
    `# ${score.title || 'Tablatura'}`,
    '',
    score.composer ? `**Compositor:** ${score.composer}` : '',
    '**Afinação:** D–G–B–D',
    `**Andamento:** ${score.tempo || 80} BPM`,
    `**Compasso:** ${score.meter?.beats || 4}/${score.meter?.beatType || 4}`,
    '',
    ...body,
    ...(warnings.length ? ['## Avisos', '', ...warnings.map(item => `- ${item}`)] : [])
  ].filter((line, index, values) => line !== '' || values[index - 1] !== '');
  return { fileName: `${safeFileName(score.title)}-tablatura.md`, content: `${lines.join('\n')}\n`, warnings };
}

export function downloadMarkdown(document) {
  const url = URL.createObjectURL(new Blob([document.content], { type: 'text/markdown;charset=utf-8' }));
  const anchor = window.document.createElement('a');
  anchor.href = url;
  anchor.download = document.fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}
