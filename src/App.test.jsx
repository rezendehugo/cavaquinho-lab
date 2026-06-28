import { fireEvent, render, screen, within, waitFor } from '@testing-library/react';
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
  test('mostra apenas Formas, Sequências e Braço na navegação', () => {
    renderAt();
    expect(getRoutes().map(route => route.label)).toEqual(['Formas', 'Sequências', 'Braço']);
    expect(screen.getByRole('link', { name: 'Formas' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sequências' })).toHaveClass('active');
    expect(screen.getByRole('link', { name: 'Braço' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Cavaquinho' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Prática' })).not.toBeInTheDocument();
  });

  test('redireciona rotas antigas para Sequências', async () => {
    renderAt('#/cavaquinho/practice');
    await waitFor(() => expect(window.location.hash).toBe('#/cavaquinho/sequences'));
    expect(screen.getByRole('link', { name: 'Sequências' })).toHaveClass('active');
  });

  test('abre o Lab sem áudio, movimento ou títulos separados por painel', () => {
    renderAt();
    expect(screen.getByText('Teoria')).toBeInTheDocument();
    expect(screen.getByText('Exercícios')).toBeInTheDocument();
    expect(screen.getByText('Harmonia em Cores')).toBeInTheDocument();
    expect(screen.getByLabelText('Sessão de prática')).toHaveTextContent('Foco');
    expect(screen.getByRole('button', { name: 'Iniciar' })).toBeInTheDocument();
    expect(screen.queryByText(/Painel de/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Movimento/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Tocar acorde')).not.toBeInTheDocument();
  });

  test('inicia com sequência vazia e cria o primeiro acorde', () => {
    renderAt();
    expect(screen.getByLabelText('Sequência atual')).toHaveTextContent('Nenhum acorde ainda');
    expect(screen.queryByRole('heading', { name: 'Nenhum acorde ainda' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar acorde' }));
    expect(screen.getByLabelText('Sequência atual')).toHaveTextContent('C');
    expect(screen.getAllByRole('article')).toHaveLength(1);
  });

  test('usa notas como padrão e não mostra alternância para dedos', () => {
    renderAt();
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar acorde' }));
    expect(screen.queryByRole('button', { name: 'Notas' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Dedos' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Conteúdo das bolinhas')).not.toBeInTheDocument();
    expect(screen.getAllByText('E').length).toBeGreaterThan(0);
  });

  test('cria, seleciona e exclui sequências', () => {
    renderAt();
    const addSequence = screen.getByRole('button', { name: 'Adicionar sequência' });
    expect(addSequence).toHaveTextContent('');
    fireEvent.click(addSequence);
    expect(screen.getByDisplayValue('Sequência')).toBeInTheDocument();
    expect(screen.queryByText('Nova sequência')).not.toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem('cavaquinhoLabSequences'))).toHaveLength(2);
    fireEvent.click(screen.getByLabelText('Excluir sequência atual'));
    expect(JSON.parse(window.localStorage.getItem('cavaquinhoLabSequences'))).toHaveLength(1);
  });

  test('setas alteram nota, sufixo e forma do card selecionado', () => {
    renderAt();
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar acorde' }));
    const nextRoot = screen.getByLabelText('Próxima nota do acorde 1');
    const nextSuffix = screen.getByLabelText('Próximo sufixo do acorde 1');
    const nextShape = screen.getByLabelText('Próxima forma do acorde 1');
    expect(nextRoot).toHaveClass('arrow-control-button');
    expect(nextSuffix).toHaveClass('arrow-control-button');
    expect(nextShape).toHaveClass('arrow-control-button');
    fireEvent.click(nextRoot);
    expect(screen.getByLabelText('Sequência atual')).toHaveTextContent('Db');
    fireEvent.click(nextSuffix);
    expect(screen.getByLabelText('Sequência atual')).not.toHaveTextContent('Db →');
    fireEvent.click(nextShape);
    expect(JSON.parse(window.localStorage.getItem('cavaquinhoLabSequences'))[0].steps[0].positionIndex).not.toBe(null);
    fireEvent.click(screen.getByLabelText('Próxima nota do acorde 1'));
    expect(JSON.parse(window.localStorage.getItem('cavaquinhoLabSequences'))[0].steps[0].positionIndex).toBe(null);
  });

  test('usa card compartilhado compacto na página Formas', () => {
    renderAt('#/cavaquinho/shapes');
    expect(screen.getByRole('link', { name: 'Formas' })).toHaveClass('active');
    expect(document.querySelectorAll('.chord-shape-card').length).toBeGreaterThan(0);
    expect(screen.getByText('1/7')).toBeInTheDocument();
    expect(screen.queryByText(/Forma 1 de 7/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Notas:/)).not.toBeInTheDocument();
    expect(document.querySelector('.chord-diagram figcaption')).toBe(null);
    expect(document.querySelector('.diagram-tuning')).toBe(null);
  });

  test('adiciona, remove e reordena acordes preservando cards', () => {
    renderAt();
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar acorde' }));
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar acorde' }));
    expect(screen.getAllByRole('article')).toHaveLength(2);
    fireEvent.click(screen.getByLabelText('Próxima nota do acorde 2'));
    const moveUp = screen.getByLabelText('Mover acorde 2 para cima');
    expect(moveUp).toHaveClass('arrow-control-button');
    fireEvent.click(moveUp);
    expect(screen.getByLabelText('Sequência atual')).toHaveTextContent('Db → C');
    fireEvent.click(screen.getByLabelText('Remover acorde 2'));
    expect(screen.getAllByRole('article')).toHaveLength(1);
  });

  test('remove informações duplicadas dos cards e deixa estudo fora do Lab principal', () => {
    renderAt();
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar acorde' }));
    const lab = document.querySelector('.sequence-lab');
    const cards = screen.getByLabelText('Acordes da sequência');
    const firstCard = within(cards).getAllByRole('article')[0];
    expect(within(firstCard).queryByText('Raiz')).not.toBeInTheDocument();
    expect(within(firstCard).queryByText('Qualidade')).not.toBeInTheDocument();
    expect(within(firstCard).queryByText(/Voz completa/)).not.toBeInTheDocument();
    expect(within(firstCard).queryByText(/cor predominante/i)).not.toBeInTheDocument();
    expect(within(firstCard).queryByText(/Notas:/)).not.toBeInTheDocument();
    expect(within(firstCard).queryByText(/Forma 1 de/)).not.toBeInTheDocument();
    expect(screen.queryByText('Adicionar acorde')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Adicionar sequência' })).toHaveTextContent('');
    expect(firstCard.querySelector('.chord-shape-card')).not.toBe(null);
    expect(firstCard.querySelector('.chord-shape-card--focus')).not.toBe(null);
    expect(firstCard.querySelector('.chord-diagram figcaption')).toBe(null);
    expect(within(lab).queryByText('Teoria')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Estudo da sequência')).toHaveTextContent('Teoria');
  });

  test('renderiza a página Braço com afinação e primeiras casas', () => {
    renderAt('#/cavaquinho/fretboard');
    expect(screen.getByRole('link', { name: 'Braço' })).toHaveClass('active');
    expect(screen.getByRole('heading', { name: 'Braço e notas no cavaquinho' })).toBeInTheDocument();
    expect(screen.getByText('Localize as notas diretamente no braço do cavaquinho.')).toBeInTheDocument();
    expect(screen.getByText('Localize as notas diretamente no braço do cavaquinho.')).not.toHaveTextContent('D G B D');
    expect(screen.getByLabelText('Afinação do cavaquinho: D G B D')).toHaveTextContent('DGBD');
    expect(screen.queryByText('soltas')).not.toBeInTheDocument();
    expect(document.querySelector('.fretboard-open-notes')).toBe(null);
    expect(document.querySelector('.open-row')).toBe(null);
    expect(screen.getByLabelText('Mapa de notas do braço do cavaquinho em D G B D')).toHaveTextContent('1EbD#AbG#CEbD#');
  });

  test('não importa o wrapper com som no código da aplicação', () => {
    const sourceFiles = [
      'src/App.jsx',
      'src/components/SequenceLab.jsx',
      'src/components/ChordDiagram.jsx',
      'src/pages/ShapesPage.jsx'
    ].map(file => fs.readFileSync(path.join(process.cwd(), file), 'utf8')).join('\\n');
    expect(sourceFiles).not.toContain('ChordBlock');
    expect(sourceFiles).not.toContain('AudioContext');
    expect(sourceFiles).not.toContain('playChord');
  });
});
