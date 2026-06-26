import { render, screen } from '@testing-library/react';
import ChordDiagram from './ChordDiagram';

const position = {
  frets: [1, 2, 3, 4],
  fingers: [1, 2, 3, 4],
  baseFret: 1,
  barres: [],
  midi: [60, 62, 64, 65]
};

describe('ChordDiagram', () => {
  test('mostra notas por padrão', () => {
    render(<ChordDiagram position={position} name="C" />);
    expect(screen.getAllByText('C').length).toBeGreaterThan(0);
    expect(screen.getAllByText('D').length).toBeGreaterThan(0);
    expect(screen.getAllByText('E').length).toBeGreaterThan(0);
    expect(screen.getAllByText('F').length).toBeGreaterThan(0);
    expect(screen.queryByText('1')).not.toBeInTheDocument();
  });

  test('mostra dedos quando solicitado', () => {
    render(<ChordDiagram position={position} name="C" mode="fingers" />);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });
});
