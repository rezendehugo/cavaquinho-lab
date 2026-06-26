import { fireEvent, render, screen, within } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';
import App from './App.jsx';
import { getRoutes } from './config';

const renderAt = (hash = '#/cavaquinho/sequences') => {
  window.localStorage.clear();
  window.location.hash = hash;
  return render(<App />);
};

describe('Cavaquinho Lab', () => {
  test('abre o Lab sem áudio, movimento ou títulos separados por painel', () => {
    renderAt();
    expect(screen.getByRole('link', { name: 'Sequências' })).toHaveClass('active');
    expect(screen.getByText('Teoria')).toBeInTheDocument();
    expect(screen.getByText('Exercícios')).toBeInTheDocument();
    expect(screen.getByText('Harmonia em Cores')).toBeInTheDocument();
    expect(screen.queryByText(/Painel de/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Movimento/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Tocar acorde')).not.toBeInTheDocument();
  });

  test('esconde páginas vazias em modo de teste e permite habilitar por flag', () => {
    renderAt();
    expect(screen.queryByRole('link', { name: 'Braço' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Prática' })).not.toBeInTheDocument();
    expect(getRoutes(true).map(route => route.label)).toEqual(['Cavaquinho', 'Formas', 'Sequências', 'Braço', 'Prática']);
  });

  test('usa notas como padrão e alterna para dedos', () => {
    renderAt();
    expect(screen.getByRole('button', { name: 'Notas' })).toHaveClass('active');
    expect(screen.getAllByText('D').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Dedos' }));
    expect(screen.getByRole('button', { name: 'Dedos' })).toHaveClass('active');
    expect(window.localStorage.getItem('cavaquinhoLabDiagramMode')).toBe('fingers');
  });

  test('cria, seleciona e exclui sequências', () => {
    renderAt();
    fireEvent.click(screen.getByRole('button', { name: '+ Nova sequência' }));
    expect(screen.getByDisplayValue('Nova sequência')).toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem('cavaquinhoLabSequences'))).toHaveLength(2);
    fireEvent.click(screen.getByLabelText('Excluir sequência atual'));
    expect(JSON.parse(window.localStorage.getItem('cavaquinhoLabSequences'))).toHaveLength(1);
  });

  test('adiciona, remove, reordena e fixa forma de acorde', () => {
    renderAt();
    fireEvent.click(screen.getByText('Adicionar acorde'));
    expect(screen.getAllByRole('article')).toHaveLength(4);
    fireEvent.click(screen.getByLabelText('Mover acorde 2 para cima'));
    expect(screen.getByLabelText('Sequência atual')).toHaveTextContent('D7 → Ebmaj7 → Gm → C');
    fireEvent.click(screen.getByLabelText('Próxima forma do acorde 1'));
    expect(JSON.parse(window.localStorage.getItem('cavaquinhoLabSequences'))[0].steps[0].positionIndex).not.toBe(null);
    fireEvent.click(screen.getByLabelText('Remover acorde 4'));
    expect(screen.getAllByRole('article')).toHaveLength(3);
  });

  test('formato integrado mantém controles do acorde dentro do cartão', () => {
    renderAt();
    const cards = screen.getByLabelText('Acordes da sequência');
    const firstCard = within(cards).getAllByRole('article')[0];
    expect(within(firstCard).getByLabelText('Raiz do acorde 1')).toBeInTheDocument();
    expect(within(firstCard).getByLabelText('Qualidade do acorde 1')).toBeInTheDocument();
    expect(within(firstCard).getByText(/Voz completa/)).toBeInTheDocument();
  });

  test('não importa o wrapper com som no código da aplicação', () => {
    const sourceFiles = [
      'src/App.jsx',
      'src/components/SequenceLab.jsx',
      'src/components/ChordDiagram.jsx',
      'src/pages/ShapesPage.jsx'
    ].map(file => fs.readFileSync(path.join(process.cwd(), file), 'utf8')).join('\n');
    expect(sourceFiles).not.toContain('ChordBlock');
    expect(sourceFiles).not.toContain('AudioContext');
    expect(sourceFiles).not.toContain('playChord');
  });
});
