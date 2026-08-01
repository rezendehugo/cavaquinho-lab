import { Check, TriangleAlert } from 'lucide-react';
import { useEffect, useState } from 'react';

const accidental = value => value === 1 ? '♯' : value === -1 ? '♭' : '';

export default function ScoreMeasureEditor({ measure, revision, onSave, busy, expanded = false }) {
  const [chordText, setChordText] = useState(() => measure.chords.map(chord => chord.symbol).join(' | '));
  const [events, setEvents] = useState(measure.events);
  const [open, setOpen] = useState(expanded);
  const uncertain = measure.issues.length > 0
    || measure.events.some(event => event.confidence < .8)
    || measure.chords.some(chord => chord.confidence < .8);
  useEffect(() => { if (expanded) setOpen(true); }, [expanded]);

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

  return <article className={`${measure.issues.some(issue => issue.severity === 'critical') ? 'has-critical-issue ' : ''}${uncertain ? 'needs-review' : 'is-confident'}`}>
    <button type="button" data-ui-text-reason="domain-choice" className="score-measure-toggle" aria-expanded={open} onClick={() => setOpen(value => !value)}>
      <span>{uncertain ? <TriangleAlert size={16} aria-hidden="true" /> : <Check size={16} aria-hidden="true" />}<strong>Medida {measure.number}</strong></span>
      <span>{uncertain ? 'Revisar' : 'Confiável'} · {events.reduce((sum, event) => sum + event.durationTicks, 0)}/{measure.expectedTicks} ticks</span>
    </button>
    {open ? <div className="score-measure-editor-body">
    <label><span>Cifras, separadas por |</span><input value={chordText} onChange={event => setChordText(event.target.value)} /></label>
    <ol>{events.map((event, index) => <li key={event.id} className="score-event-editor">
      <span>{event.rest ? 'Pausa' : `${event.pitch.step}${accidental(event.pitch.alter)}${event.pitch.octave}`}</span>
      {!event.rest && <><label><span>Nota</span><select value={event.pitch.step} onChange={input => updateEvent(index, 'pitch', { ...event.pitch, step: input.target.value })}>{['C', 'D', 'E', 'F', 'G', 'A', 'B'].map(note => <option key={note}>{note}</option>)}</select></label>
        <label><span>Acidente</span><select value={event.pitch.alter} onChange={input => updateEvent(index, 'pitch', { ...event.pitch, alter: Number(input.target.value) })}><option value="-1">♭</option><option value="0">Natural</option><option value="1">♯</option></select></label>
        <label><span>Oitava</span><input type="number" min="0" max="9" value={event.pitch.octave} onChange={input => updateEvent(index, 'pitch', { ...event.pitch, octave: Number(input.target.value) })} /></label></>}
      <label><span>Duração</span><input type="number" min="1" value={event.durationTicks} onChange={input => updateEvent(index, 'durationTicks', Number(input.target.value))} /></label>
    </li>)}</ol>
    {measure.issues.map(issue => <p className="validation-error" key={issue.code}>{issue.message}</p>)}
    <button type="button" data-ui-text-reason="workflow" onClick={save} disabled={busy}>Salvar correção</button>
    </div> : null}
  </article>;
}
