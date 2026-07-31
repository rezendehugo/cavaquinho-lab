import { fireEvent, render, screen } from '@testing-library/react';
import ChordLegendStrip from './ChordLegendStrip';

const statuses = [
  {
    id: 'rootless',
    label: 'Voicing sem raiz: contém terça, sétima menor e nona.'
  }
];

describe('ChordLegendStrip', () => {
  test('mostra uma única faixa de pontos com tooltips sob demanda', () => {
    const { container } = render(
      <ChordLegendStrip chordKey="C" chordSuffix="9" statuses={statuses} />
    );

    expect(container.querySelectorAll('.chord-legend-strip')).toHaveLength(1);
    expect(container.querySelectorAll('.chord-legend-degree')).toHaveLength(5);
    expect(container.querySelectorAll('.chord-legend-status')).toHaveLength(1);
    expect(screen.queryByText('Mi · 3 · terça maior')).not.toBeVisible();

    const third = screen.getByLabelText('Mi · 3 · terça maior');
    fireEvent.focus(third);
    expect(screen.getByText('Mi · 3 · terça maior')).toBeVisible();
  });
});
