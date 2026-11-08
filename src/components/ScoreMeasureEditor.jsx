import { Check, TriangleAlert } from 'lucide-react';
import { useEffect, useState } from 'react';

const accidental = value => value === 1 ? '♯' : value === -1 ? '♭' : '';

function coveredTicks(events) {
  const intervals = events.filter(event => event.durationTicks > 0)
    .map(event => [event.offsetTicks, event.offsetTicks + event.durationTicks])
    .sort((left, right) => left[0] - right[0]);
  let total = 0;
  let start = null;
  let end = null;
  for (const [nextStart, nextEnd] of intervals) {
    if (start === null) { start = nextStart; end = nextEnd; }
    else if (nextStart <= end) end = Math.max(end, nextEnd);
    else { total += end - start; start = nextStart; end = nextEnd; }
  }
  return start === null ? total : total + end - start;
}

export default function ScoreMeasureEditor({ measure, revision, onSave, busy, expanded = false, beatType = 4, showMelody = false }) {
  const [chordText, setChordText] = useState(() => measure.chords.map(chord => chord.symbol).join(' | '));
  const [events, setEvents] = useState(measure.events);
  const [open, setOpen] = useState(expanded);
  const uncertain = showMelody
    ? measure.issues.length > 0 || measure.events.some(event => event.confidence < .8) || measure.chords.some(chord => chord.confidence < .8)
    : measure.chords.length === 0 || measure.chords.some(chord => chord.confidence < .8);
  useEffect(() => { if (expanded) setOpen(true); }, [expanded]);
  const beatTicks = measure.divisions * 4 / beatType;
  const playedBeats = (coveredTicks(events) / beatTicks).toFixed(beatTicks === 1 ? 0 : 1).replace(/\.0$/, '');
  const expectedBeats = (measure.expectedTicks / beatTicks).toFixed(beatTicks === 1 ? 0 : 1).replace(/\.0$/, '');
  const chordSummary = measure.chords.map(chord => chord.symbol).join(' · ') || 'Sem cifras reconhecidas';

  function updateEvent(index, field, value) {
    setEvents(current => current.map((event, eventIndex) => eventIndex === index
      ? { ...event, [field]: value }
      : event));
  }

  function save() {
    const symbols = chordText.split('|').map(value => value.trim()).filter(Boolean);
    const chords = symbols.map((symbol, index) => ({
      ...(measure.chords[index] || {
        id: crypto.randomUUID(),
        offsetTicks: 0,
        confidence: 1,
        alternatives: []
      }),
      symbol
    }));
    onSave(measure.number, { revision, events, chords });
  }

  return <article className={`${showMelody && measure.issues.some(issue => issue.severity === 'critical') ? 'has-critical-issue ' : ''}${uncertain ? 'needs-review' : 'is-confident'}`}>
    <button type="button" data-ui-text-reason="domain-choice" className="score-measure-toggle" aria-expanded={open} onClick={() => setOpen(value => !value)}>
      <span>{uncertain ? <TriangleAlert size={16} aria-hidden="true" /> : <Check size={16} aria-hidden="true" />}<strong>Medida {measure.number}</strong></span>
      <span className="score-measure-summary"><strong>{chordSummary}</strong><small>{uncertain ? 'Revisar' : 'Confiável'} · {playedBeats}/{expectedBeats} tempos</small></span>
    </button>
    {open ? <div className="score-measure-editor-body">
    <label><span>Cifras como aparecem na partitura, separadas por |</span><input value={chordText} placeholder="Ex.: F#13 | F#7b13 | B9" onChange={event => setChordText(event.target.value)} /></label>
    {showMelody ? <ol>{events.map((event, index) => <li key={event.id} className="score-event-editor">
      <span>{event.rest ? 'Pausa' : `${event.pitch.step}${accidental(event.pitch.alter)}${event.pitch.octave}`}</span>
      {!event.rest && <><label><span>Nota</span><select value={event.pitch.step} onChange={input => updateEvent(index, 'pitch', { ...event.pitch, step: input.target.value })}>{['C', 'D', 'E', 'F', 'G', 'A', 'B'].map(note => <option key={note}>{note}</option>)}</select></label>
        <label><span>Acidente</span><select value={event.pitch.alter} onChange={input => updateEvent(index, 'pitch', { ...event.pitch, alter: Number(input.target.value) })}><option value="-1">♭</option><option value="0">Natural</option><option value="1">♯</option></select></label>
        <label><span>Oitava</span><input type="number" min="0" max="9" value={event.pitch.octave} onChange={input => updateEvent(index, 'pitch', { ...event.pitch, octave: Number(input.target.value) })} /></label></>}
      <label><span>Duração (tempos)</span><input aria-label={`Duração em tempos da nota ${index + 1}`} type="number" min="0.25" step="0.25" value={Number((event.durationTicks / beatTicks).toFixed(2))} onChange={input => updateEvent(index, 'durationTicks', Math.max(1, Math.round(Number(input.target.value) * beatTicks)))} /></label>
    </li>)}</ol>
      : <p className="score-measure-chord-help">Confira as cifras reconhecidas. A revisão de melodia fica disponível ao selecionar “Solo com melodia”.</p>}
    {showMelody ? measure.issues.map(issue => <p className="validation-error" key={issue.code}>{issue.message}</p>) : null}
    <button type="button" data-ui-text-reason="workflow" onClick={save} disabled={busy}>Salvar correção</button>
    </div> : null}
  </article>;
}
