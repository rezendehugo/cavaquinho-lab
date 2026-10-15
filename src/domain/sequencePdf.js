import { formatSequenceChord, noteNames } from '../chordDisplay';
import { cavaquinhoChords } from './chords';
import { getChordToneDetail } from './chordTheory';
import { getAbsoluteFrets, optimizeSequence } from '../progressionOptimizer';
import { normalizePracticeBeats } from './sequencePractice';
import { normalizeLoopStartIndex, normalizePracticeBpm } from '../sequences';
import { analyzeSequence, buildExercises } from '../harmony';
import { normalizeStudy, studyFields } from './sequenceStudy';
import { drawChordDiagramPdf } from './chordDiagramPdf';

// The built-in PDF font covers Portuguese. Musical symbols get readable text equivalents.
const printable = value => String(value ?? '').replace(/♯/g, '#').replace(/♭/g, 'b').replace(/→/g, ' > ').replace(/[–—]/g, '-').replace(/ø/g, 'm7b5').replace(/Δ/g, 'maj').replace(/[^\x20-\x7e\xa0-\xff\n]/g, '');
export const sequencePdfFileName = (title, kind = 'guide') => `${(title || 'sequencia').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 100) || 'sequencia'}-${kind === 'map' ? 'mapa' : 'guia'}.pdf`;

export function buildSequencePdfModel(sequence, options = {}) {
  if (!sequence?.steps?.length) throw new Error('Adicione acordes antes de exportar.');
  const resolved = options.resolvedSteps ? { steps: options.resolvedSteps, missing: [] } : optimizeSequence(sequence.steps, cavaquinhoChords);
  if (resolved.steps.length !== sequence.steps.length || resolved.steps.some((step, index) => !step?.position || step.id !== sequence.steps[index].id)) throw new Error('As formas da sequência mudaram. Tente novamente.');
  if (resolved.missing.length) throw new Error('Há acordes sem forma disponível.');
  const spell = (step, midi) => getChordToneDetail(step.displayKey || step.key, step.suffix, midi)?.note || noteNames[midi % 12];
  const analysis = analyzeSequence(sequence.steps, resolved.steps, { tonic: sequence.tonic });
  return {
    title: sequence.title || 'Minha sequência', bpm: normalizePracticeBpm(sequence.practiceBpm),
    loop: normalizeLoopStartIndex(sequence.loopStartIndex, sequence.steps.length),
    study: normalizeStudy(options.study), exercises: buildExercises(sequence.steps, analysis, resolved.steps),
    steps: resolved.steps.map((step, index) => ({ ...step, ...sequence.steps[index], positionIndex: step.positionIndex, name: formatSequenceChord(step), number: index + 1,
      beats: normalizePracticeBeats(step.practiceBeats), frets: getAbsoluteFrets(step.position), theory: { ...analysis.chords[index].theory,
        playedNotes: [...new Set(step.position.midi.map(midi => spell(step, midi)))],
        missingNotes: analysis.chords[index].theory.missingNotes.map(note => spell(step, noteNames.indexOf(note))) } }))
  };
}

export async function createSequencePdf(sequence, options = {}) {
  const model = buildSequencePdfModel(sequence, options);
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ unit: 'pt', format: 'a4', compress: true });
  pdf.setProperties({ title: model.title, subject: 'Mapa de acordes e prática deliberada', author: 'Cavaquinho Lab' });
  const W = 595.28, H = 841.89, margin = 36, width = W - margin * 2;
  const ink = '#20372f', muted = '#52645b', green = '#24745b', line = '#ccd9d1';
  const text = (value, x, y, size = 11, bold = false, color = ink) => {
    pdf.setFont('helvetica', bold ? 'bold' : 'normal'); pdf.setFontSize(size); pdf.setTextColor(color);
    pdf.text(printable(value), x, y);
  };
  const shortTitle = printable(model.title).length > 75 ? `${printable(model.title).slice(0, 72)}...` : printable(model.title);
  const header = subtitle => {
    text('CAVAQUINHO LAB / MEU MAPA DE PRÁTICA', margin, 32, 9, true, green);
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(16);
    text(shortTitle, margin, 61, Math.min(16, 16 * width / Math.max(1, pdf.getTextWidth(shortTitle))), true);
    text(subtitle, margin, 82, 10, false, muted);
    pdf.setDrawColor(line); pdf.setLineWidth(.7); pdf.line(margin, 94, W - margin, 94);
  };
  const drawCard = async (step, x, y, cardW, cardH) => {
    pdf.setFillColor('#f6f8f5'); pdf.setDrawColor(line); pdf.roundedRect(x, y, cardW, cardH, 7, 7, 'FD');
    text(String(step.number).padStart(2, '0'), x + 12, y + 21, 10, true, green);
    text(step.name, x + 42, y + 25, 21, true);
    text(`${step.beats} ${step.beats === 1 ? 'batida' : 'batidas'} · forma ${step.positionIndex + 1}`, x + 12, y + 44, 10, false, muted);
    await drawChordDiagramPdf(pdf, step, x + (cardW - 210 * 154 / 190) / 2, y + 49, 210);
    pdf.setLineWidth(.7);
    text(`Casas: ${step.frets.map(f => f < 0 ? 'x' : f).join(' / ')}`, x + 12, y + 278, 10);
    text(`Soam: ${step.theory.playedNotes.join(' · ')}`, x + 12, y + 293, 10);
    text(step.theory.extraNotes.length ? `Notas adicionais: ${step.theory.extraNotes.join(', ')}` : step.theory.missingNotes.length ? `Omite: ${step.theory.missingNotes.join(', ')}` : 'Acorde completo', x + 12, y + 308, 9, false, muted);
  };
  const perPage = 4, gap = 12, cardW = (width - gap) / 2, cardH = 320;
  for (let start = 0; start < model.steps.length; start += perPage) {
    if (start) pdf.addPage();
    header(`${model.bpm} BPM · ${model.steps.length} acordes · ao terminar, volte ao acorde ${model.loop + 1}`);
    for (const [i, step] of model.steps.slice(start, start + perPage).entries()) await drawCard(step, margin + (i % 2) * (cardW + gap), 107 + Math.floor(i / 2) * (cardH + gap), cardW, cardH);
    text('Da esquerda para a direita: D4 · G4 · B4 · D5. Notas e cores como na tela; x = não tocar.', margin, 800, 9, false, muted);
  }
  if (options.kind !== 'map') {
    let y;
    const newStudyPage = () => { pdf.addPage(); header('Caderno de prática / escutar, experimentar e aprender'); y = 117; };
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
    if (printable(model.title) !== shortTitle) paragraph(model.title, 14, true);
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
    pdf.setPage(p); text('Cavaquinho Lab · prática com intenção', margin, H - 18, 8, false, muted);
    text(`${p} / ${pageCount}`, W - 64, H - 18, 9, false, muted);
  }
  return pdf;
}
