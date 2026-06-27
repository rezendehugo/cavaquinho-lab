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
    const { container } = render(<ChordDiagram position={position} name="C" />);
    expect(screen.getAllByText('C').length).toBeGreaterThan(0);
    expect(screen.getAllByText('D').length).toBeGreaterThan(0);
    expect(screen.getAllByText('E').length).toBeGreaterThan(0);
    expect(screen.getAllByText('F').length).toBeGreaterThan(0);
    expect(screen.queryByText('1')).not.toBeInTheDocument();
    expect(container.querySelector('figcaption')).toBe(null);
    expect(container.querySelector('.diagram-tuning')).toBe(null);
  });

  test('mostra pestana visual apenas na primeira posição', () => {
    const { container } = render(<ChordDiagram position={position} name="C" />);
    expect(container.querySelectorAll('.diagram-nut')).toHaveLength(1);
    expect(screen.queryByText('1fr')).not.toBeInTheDocument();
  });

  test('expande a janela de fretes de acordo com o tamanho da forma', () => {
    const wideShape = { ...position, frets: [1, 4, 6, 8], baseFret: 10 };
    const { container, rerender } = render(<ChordDiagram position={position} name="C" />);
    const svg = container.querySelector('svg');
    const compactLines = container.querySelectorAll('.diagram-line').length;
    const compactDots = [...container.querySelectorAll('.diagram-dot')];

    expect(svg).toHaveAttribute('viewBox', '0 0 154 190');
    expect(compactLines).toBe(8);
    expect(Number(compactDots[3].getAttribute('cy')) - Number(compactDots[0].getAttribute('cy'))).toBeGreaterThan(100);

    rerender(<ChordDiagram position={wideShape} name="C" />);
    expect(container.querySelectorAll('.diagram-line')).toHaveLength(13);
    expect(screen.getByText('10fr')).toHaveAttribute('text-anchor', 'end');
    container.querySelectorAll('.diagram-dot').forEach(dot => {
      const cx = Number(dot.getAttribute('cx'));
      const cy = Number(dot.getAttribute('cy'));
      const radius = Number(dot.getAttribute('r'));
      expect(cx - radius).toBeGreaterThanOrEqual(0);
      expect(cx + radius).toBeLessThanOrEqual(154);
      expect(cy - radius).toBeGreaterThanOrEqual(0);
      expect(cy + radius).toBeLessThanOrEqual(190);
    });
  });

  test('não mostra pestana visual em formas deslocadas para 7fr', () => {
    const shifted = { ...position, baseFret: 7 };
    const { container } = render(<ChordDiagram position={shifted} name="C" />);
    expect(container.querySelectorAll('.diagram-nut')).toHaveLength(0);
    expect(container.querySelectorAll('.diagram-line').length).toBeGreaterThan(0);
    expect(screen.getByText('7fr')).toBeInTheDocument();
  });

  test('não mostra pestana visual em formas deslocadas para 8fr', () => {
    const shifted = { ...position, baseFret: 8 };
    const { container } = render(<ChordDiagram position={shifted} name="C" />);
    expect(container.querySelectorAll('.diagram-nut')).toHaveLength(0);
    expect(container.querySelectorAll('.diagram-line').length).toBeGreaterThan(0);
    expect(screen.getByText('8fr')).toBeInTheDocument();
  });

  test('não mostra pestana visual em formas deslocadas para 10fr', () => {
    const shifted = { ...position, baseFret: 10 };
    const { container } = render(<ChordDiagram position={shifted} name="C" />);
    expect(container.querySelectorAll('.diagram-nut')).toHaveLength(0);
    expect(screen.getByText('10fr')).toBeInTheDocument();
  });

  test('mostra dedos quando solicitado', () => {
    render(<ChordDiagram position={position} name="C" mode="fingers" />);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });
});
