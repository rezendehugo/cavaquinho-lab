import { formatSequenceChord, noteNames } from '../chordDisplay';
import { getCavaquinhoChords } from './chords';
import { getChordToneDetail } from './chordTheory';
import { getAbsoluteFrets, optimizeSequence } from '../progressionOptimizer';
import { normalizePracticeBeats } from './sequencePractice';
import { normalizeLoopStartIndex, normalizePracticeBpm } from '../sequences';
import { analyzeSequence, buildExercises } from '../harmony';
import { normalizeStudy, studyFields } from './sequenceStudy';
import { drawChordDiagramPdf } from './chordDiagramPdf';
import { getSequenceChordCatalog } from './sequenceChordCatalog';

// The built-in PDF font covers Portuguese. Musical symbols get readable text equivalents.
const printable = value => String(value ?? '').replace(/♯/g, '#').replace(/♭/g, 'b').replace(/→/g, ' > ').replace(/[–—]/g, '-').replace(/ø/g, 'm7b5').replace(/Δ/g, 'maj').replace(/[^\x20-\x7e\xa0-\xff\n]/g, '');
const getSequencePdfNames = sequence => {
  const rawTitle = typeof sequence === 'string' ? sequence : sequence?.musicTitle || sequence?.title;
  const explicitArtist = typeof sequence === 'object' ? sequence?.artist || sequence?.composer : '';
  const legacyParts = !explicitArtist && typeof rawTitle === 'string' ? rawTitle.split(/\s+·\s+/, 2) : [];
  return {
    title: legacyParts.length === 2 ? legacyParts[0] : rawTitle || 'Minha sequência',
    artist: explicitArtist || legacyParts[1] || ''
  };
};

const safeFilePart = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
export const sequencePdfFileName = (sequence, kind = 'guide') => {
  const { title, artist } = getSequencePdfNames(sequence);
  const base = [safeFilePart(title), safeFilePart(artist)].filter(Boolean).join('-').slice(0, 100) || 'sequencia';
  return `${base}-${kind === 'map' ? 'mapa' : 'guia'}.pdf`;
};

export const getSequencePdfGridLayout = (stepCount, pageWidth = 595.28) => {
  const margin = 24;
  const gap = 8;
  const columns = 4;
  const rows = Math.max(1, Math.ceil(Math.min(Math.max(0, stepCount), 16) / columns));
  const cardWidth = (pageWidth - margin * 2 - gap * (columns - 1)) / columns;
  const cardHeight = rows === 4 ? 174 : 196;
  const diagramHeight = Math.min(136, cardHeight - 58, (cardWidth - 18) * 190 / 154);
  const informationArea = diagramHeight * diagramHeight * 154 / 190 + cardWidth * 50;
  return {
    columns, rows, cardWidth, cardHeight, diagramHeight, margin, gap,
    cardsPerPage: columns * 4,
    contentOccupancy: informationArea / (cardWidth * cardHeight)
  };
};

export function buildSequencePdfModel(sequence, options = {}) {
  if (!sequence?.steps?.length) throw new Error('Adicione acordes antes de exportar.');
  const resolved = options.resolvedSteps ? { steps: options.resolvedSteps, missing: [] } : optimizeSequence(sequence.steps, getCavaquinhoChords());
  if (resolved.steps.length !== sequence.steps.length || resolved.steps.some((step, index) => !step?.position || step.id !== sequence.steps[index].id)) throw new Error('As formas da sequência mudaram. Tente novamente.');
  if (resolved.missing.length) throw new Error('Há acordes sem forma disponível.');
  const spell = (step, midi) => getChordToneDetail(step.displayKey || step.key, step.suffix, midi)?.note || noteNames[midi % 12];
  const analysis = analyzeSequence(sequence.steps, resolved.steps, { tonic: sequence.tonic });
  const chordCatalog = getSequenceChordCatalog(sequence.steps);
  const names = getSequencePdfNames(sequence);
  return {
    ...names, title: names.title, artist: names.artist, bpm: normalizePracticeBpm(sequence.practiceBpm),
    loop: normalizeLoopStartIndex(sequence.loopStartIndex, sequence.steps.length),
    study: normalizeStudy(options.study), exercises: buildExercises(sequence.steps, analysis, resolved.steps),
    progressionLength: sequence.steps.length,
    steps: chordCatalog.map(({ firstIndex }, index) => {
      const step = resolved.steps[firstIndex];
      return { ...step, ...sequence.steps[firstIndex], positionIndex: step.positionIndex, name: formatSequenceChord(step), number: index + 1,
      beats: normalizePracticeBeats(step.practiceBeats), frets: getAbsoluteFrets(step.position), theory: { ...analysis.chords[firstIndex].theory,
        playedNotes: [...new Set(step.position.midi.map(midi => spell(step, midi)))],
        missingNotes: analysis.chords[firstIndex].theory.missingNotes.map(note => spell(step, noteNames.indexOf(note))) } };
    })
  };
}

export async function createSequencePdf(sequence, options = {}) {
  const model = buildSequencePdfModel(sequence, options);
  const { jsPDF } = await import('jspdf');
  const isMap = options.kind === 'map';
  const pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait', compress: false });
  pdf.setProperties({ title: [model.title, model.artist].filter(Boolean).join(' - '), subject: 'Mapa de acordes e prática deliberada', author: model.artist || 'Cavaquinho Lab' });
  const W = 595.28, H = 841.89;
  const { columns, cardWidth, cardHeight, diagramHeight, margin, gap, cardsPerPage } = getSequencePdfGridLayout(model.steps.length, W);
  const width = W - margin * 2;
  const ink = '#20372f', muted = '#52645b', green = '#24745b', line = '#ccd9d1';
  const text = (value, x, y, size = 11, bold = false, color = ink) => {
    pdf.setFont('helvetica', bold ? 'bold' : 'normal'); pdf.setFontSize(size); pdf.setTextColor(color);
    pdf.text(printable(value), x, y);
  };
  const shortTitle = printable(model.title).length > 75 ? `${printable(model.title).slice(0, 72)}...` : printable(model.title);
  const shortArtist = printable(model.artist).length > 75 ? `${printable(model.artist).slice(0, 72)}...` : printable(model.artist);
  const header = section => {
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(17);
    text(shortTitle, margin, 35, Math.min(17, 17 * width / Math.max(1, pdf.getTextWidth(shortTitle))), true);
    if (shortArtist) text(shortArtist, margin, 53, 10, false, muted);
    pdf.setDrawColor(line); pdf.setLineWidth(.7); pdf.line(margin, 63, W - margin, 63);
    if (section) text(section, margin, 82, 11, true, green);
  };
  const drawCard = async (step, x, y, cardW, cardH) => {
    pdf.setFillColor('#f6f8f5'); pdf.setDrawColor(line); pdf.roundedRect(x, y, cardW, cardH, 7, 7, 'FD');
    text(String(step.number).padStart(2, '0'), x + 8, y + 16, 7, true, green);
    const regionName = ({ low: 'grave', middle: 'média', high: 'aguda' })[step.regionId];
    text(regionName ? `${step.name} · ${regionName}` : step.name, x + 28, y + 17, 9, true, ink);
    if (!isMap) {
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7); pdf.setTextColor(muted);
      pdf.text(`Forma ${(step.positionIndex ?? 0) + 1}`, x + cardW - 7, y + 17, { align: 'right' });
    }
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(6.5); pdf.setTextColor(muted);
    const formula = `Notas: ${(step.theory?.notes || []).join(' ')}`;
    pdf.text(pdf.splitTextToSize(printable(formula), cardW - 14).slice(0, 1), x + 7, y + 28);
    await drawChordDiagramPdf(pdf, step, x + (cardW - diagramHeight * 154 / 190) / 2, y + 31, diagramHeight);
    const coverage = `Toca: ${(step.theory?.playedNotes || []).join(' ')}${step.theory?.missingNotes?.length ? ` · falta: ${step.theory.missingNotes.join(' ')}` : ''}`;
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(5.5); pdf.setTextColor(muted);
    pdf.text(pdf.splitTextToSize(printable(coverage), cardW - 14).slice(0, 2), x + 7, y + cardH - 14);
  };
  for (let start = 0; start < model.steps.length; start += cardsPerPage) {
    if (start) pdf.addPage();
    header();
    const pageSteps = model.steps.slice(start, start + cardsPerPage);
    const startY = 76;
    for (const [i, step] of pageSteps.entries()) {
      const row = Math.floor(i / columns);
      await drawCard(step, margin + (i % columns) * (cardWidth + gap), startY + row * (cardHeight + gap), cardWidth, cardHeight);
    }
  }
  if (options.kind !== 'map') {
    let y;
    const newStudyPage = () => { pdf.addPage(); header('Caderno de prática / escutar, experimentar e aprender'); y = 104; };
    newStudyPage();
    const paragraph = (value, size = 12, bold = false) => {
      pdf.setFont('helvetica', bold ? 'bold' : 'normal'); pdf.setFontSize(size);
      const lines = pdf.splitTextToSize(printable(value), width);
      for (const lineText of lines) {
        if (y + size * 1.5 > 787) newStudyPage();
        text(lineText, margin, y, size, bold); y += size * 1.5;
      }
      y += 9;
    };
    const answerSpace = (value, count = 2) => {
      if (value) paragraph(value);
      else { if (y + count * 20 + 16 > 787) newStudyPage(); pdf.setDrawColor(line); pdf.setLineWidth(.6); for (let n = 0; n < count; n++) { y += 20; pdf.line(margin, y, W - margin, y); } y += 16; }
    };
    paragraph('01 / Uma intenção, um experimento', 17, true);
    paragraph('Escolha um trecho pequeno. Toque devagar, escute o resultado e ajuste uma coisa por vez. O andamento é uma referência, não uma nota de desempenho.');
    paragraph(studyFields[0].label, 12, true); answerSpace(model.study.intention);
    paragraph('02 / Toque e investigue', 17, true);
    paragraph('Repita o trecho buscando continuidade, som limpo e conforto. Quando estiver consistente, experimente um pequeno aumento de andamento. Se perder a qualidade, reduza e observe.');
    for (const exercise of model.exercises.slice(0, 4)) { paragraph(exercise.prompt, 12, true); answerSpace('', 1); }
    newStudyPage();
    paragraph('03 / Transforme a tentativa em aprendizado', 17, true);
    for (const field of studyFields.slice(1)) { paragraph(field.label, 12, true); answerSpace(model.study[field.key]); }
    paragraph('Compare suas próprias tentativas', 14, true);
    paragraph('Data: __________________     BPM confortável: ________');
    paragraph('O que ficou mais claro, fluido ou confortável? O que vou mudar na próxima sessão?'); answerSpace('');
    paragraph('Pistas para conferir depois de tocar', 14, true);
    paragraph('Estas são hipóteses de escuta, não respostas únicas. Um trecho isolado pode sugerir um centro tonal diferente do restante da música.', 11);
    for (const exercise of model.exercises.slice(0, 4)) paragraph(`${exercise.title}: ${exercise.answer}`, 11);
    if (model.study.sessions.length) {
      newStudyPage(); paragraph('Minha última sessão registrada', 17, true);
      const last = model.study.sessions[0];
      paragraph(`${new Date(last.date).toLocaleDateString('pt-BR')} · ${last.bpm} BPM`);
      for (const field of studyFields) if (last[field.key]) { paragraph(field.label, 12, true); paragraph(last[field.key]); }
    }
  }
  const pageCount = pdf.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    pdf.setPage(p);
    if (!isMap) text('Cavaquinho Lab · prática com intenção', margin, H - 18, 8, false, muted);
    text(`${p} / ${pageCount}`, W - 44, H - 12, 8, false, muted);
  }
  return pdf;
}
