import { useState } from 'react';
import { getChordFormulaLegend } from '../domain/chordTheory';

function LegendIndicator({ id, className, label, activeId, setActiveId }) {
  const tooltipId = `chord-legend-tooltip-${id}`;
  const active = activeId === id;
  return (
    <span className="chord-legend-indicator">
      <span
        className={className}
        role="img"
        tabIndex="0"
        aria-label={label}
        aria-describedby={active ? tooltipId : undefined}
        onMouseEnter={() => setActiveId(id)}
        onMouseLeave={() => setActiveId(null)}
        onFocus={() => setActiveId(id)}
        onBlur={() => setActiveId(null)}
      />
      <span id={tooltipId} className="chord-legend-tooltip" role="tooltip" hidden={!active}>
        {label}
      </span>
    </span>
  );
}

export default function ChordLegendStrip({ chordKey, chordSuffix, statuses }) {
  const [activeId, setActiveId] = useState(null);
  const degrees = getChordFormulaLegend(chordKey, chordSuffix);
  if (!degrees.length && !statuses.length) return null;

  return (
    <div className="chord-legend-strip" aria-label="Cores e informações do acorde">
      <div className="chord-legend-group" aria-label="Notas e graus do acorde">
        {degrees.map((degree) => (
          <LegendIndicator
            key={degree.interval}
            id={`degree-${degree.interval}`}
            className={`chord-legend-dot chord-legend-degree degree-${degree.colorGroup}`}
            label={`${degree.spokenNote} · ${degree.degreeLabel} · ${degree.description}`}
            activeId={activeId}
            setActiveId={setActiveId}
          />
        ))}
      </div>
      <div className="chord-legend-group" aria-label="Estados das formas">
        {statuses.map((status) => (
          <LegendIndicator
            key={status.id}
            id={`status-${status.id}`}
            className={`voicing-status-dot voicing-status-dot--${status.id} chord-legend-status`}
            label={status.label}
            activeId={activeId}
            setActiveId={setActiveId}
          />
        ))}
      </div>
    </div>
  );
}
