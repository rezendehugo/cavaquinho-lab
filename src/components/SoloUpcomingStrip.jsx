function label(step) {
  if (step?.rest) return 'Pausa';
  if (!step) return '—';
  const position = step.position || step;
  return `${position.note || '?'}${position.octave ?? ''}`;
}

export default function SoloUpcomingStrip({ steps, currentIndex }) {
  if (!steps.length) return null;
  const indexes = [-1, 0, 1, 2, 3, 4, 5, 6]
    .map(offset => ({ offset, index: (currentIndex + offset + steps.length) % steps.length }));
  return <section className="solo-upcoming-strip" aria-label="Próximas notas">
    {indexes.map(({ offset, index }) => {
      const step = steps[index];
      const position = step.position || step;
      return <div key={`${offset}-${index}`} className={offset < 0 ? 'previous' : offset === 0 ? 'current' : 'upcoming'}>
        <small>{offset < 0 ? 'Anterior' : offset === 0 ? 'Agora' : `+${offset}`}</small>
        <strong>{label(step)}</strong>
        <span>{step.rest ? 'pausa' : `corda ${(position.stringIndex ?? 0) + 1} · casa ${position.fret ?? '?'}`}</span>
        {step.durationLabel ? <em>{step.durationLabel}</em> : null}
      </div>;
    })}
  </section>;
}
