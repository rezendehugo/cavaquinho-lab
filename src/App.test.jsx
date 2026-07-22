import { fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';
import rawCavaquinhoChords from '@tombatossals/chords-db/lib/cavaquinho.json';
import App from './App.jsx';
import { getRoutes } from './config';
import { cavaquinhoChords } from './domain/chords';

const renderAt = (route = '/sequences') => {
  window.localStorage.clear();
  window.history.pushState(null, '', route);
  return render(<App />);
};

const getAbsoluteFrets = (position) => {
  const baseFret = position.baseFret || 1;
  return position.frets.map(fret => fret <= 0 ? fret : baseFret + fret - 1);
};

const getFirstPlayedFret = (position) => Math.min(...getAbsoluteFrets(position).filter(fret => fret >= 0));

const createDataTransfer = () => {
  const data = new Map();
  return {
    dropEffect: '',
    effectAllowed: '',
    getData: vi.fn(type => data.get(type) || ''),
    setData: vi.fn((type, value) => data.set(type, value))
  };
};

describe('Cavaquinho Lab', () => {
  test('abre Formas como experiência principal', async () => {
    renderAt('/');
    await waitFor(() => expect(window.location.pathname).toBe('/shapes'));
    expect(screen.getByRole('link', { name: 'Formas' })).toHaveClass('active');
    expect(screen.getByRole('heading', { name: 'Formas de acorde' })).toBeInTheDocument();
  });

  test('mostra Formas, Sequências, Braço e Prática na navegação', () => {
    renderAt();
    expect(getRoutes().map(route => route.label)).toEqual(['Formas', 'Sequências', 'Braço', 'Prática']);
    expect(screen.getByRole('link', { name: 'Formas' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sequências' })).toHaveClass('active');
    expect(screen.getByRole('link', { name: 'Braço' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Prática' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Cavaquinho' })).not.toBeInTheDocument();
  });

  test('redireciona a rota antiga de prática para a nova página', async () => {
    renderAt('/cavaquinho/practice');
    await waitFor(() => expect(window.location.pathname).toBe('/practice'));
    expect(screen.getByRole('link', { name: 'Prática' })).toHaveClass('active');
  });

  test('normaliza hashes antigos para rotas reais', async () => {
    window.localStorage.clear();
    window.history.pushState(null, '', '/');
    window.location.hash = '#/cavaquinho/shapes';
    render(<App />);

    await waitFor(() => expect(window.location.pathname).toBe('/shapes'));
    expect(window.location.hash).toBe('');
    expect(screen.getByRole('link', { name: 'Formas' })).toHaveClass('active');
  });

  test('abre o Lab sem áudio, movimento ou títulos separados por painel', () => {
    renderAt();
    expect(screen.getByText('Teoria')).toBeInTheDocument();
    expect(screen.getByText('Exercícios')).toBeInTheDocument();
    expect(screen.getByText('Harmonia em Cores')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sessão de prática' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Metrônomo' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Ciclos de prática')).not.toBeInTheDocument();
    expect(screen.queryByText(/Painel de/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Movimento/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Tocar acorde')).not.toBeInTheDocument();
  });

  test('mostra pomodoro e metrônomo como ferramentas globais separadas', () => {
    let view = renderAt('#/cavaquinho/shapes');
    expect(screen.getByRole('button', { name: 'Sessão de prática' })).toBeInTheDocument();
    view.unmount();

    view = renderAt('#/cavaquinho/fretboard');
    expect(screen.getByRole('button', { name: 'Sessão de prática' })).toBeInTheDocument();
    view.unmount();

    renderAt();
    const labControls = document.querySelector('.lab-controls');
    expect(within(labControls).queryByRole('button', { name: 'Sessão de prática' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Sessão de prática' }));
    expect(screen.getByLabelText('Ciclos de prática')).toHaveTextContent('Ciclos de prática');
    expect(screen.getByRole('button', { name: 'Iniciar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reiniciar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Próxima etapa' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Metrônomo' })).not.toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByLabelText('Ciclos de prática')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Metrônomo' }));
    expect(screen.getByRole('heading', { name: 'Metrônomo' })).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: 'Batidas por minuto' })).toHaveValue('80');
    expect(screen.getByRole('button', { name: 'Iniciar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Selecionar compasso 4/4' })).toHaveAttribute('aria-pressed', 'true');
  });

  test('edita BPM pelo popover e mantém o campo da Prática sincronizado', () => {
    renderAt('/practice');
    const practiceBpm = screen.getByRole('spinbutton', { name: 'BPM da prática de escala' });
    fireEvent.change(practiceBpm, { target: { value: '108' } });
    fireEvent.keyDown(practiceBpm, { key: 'Enter' });
    expect(practiceBpm).toHaveValue('108');

    fireEvent.click(screen.getByRole('button', { name: 'Metrônomo' }));
    const popoverBpm = screen.getByRole('spinbutton', { name: 'Batidas por minuto' });
    expect(popoverBpm).toHaveFocus();
    expect(popoverBpm).toHaveValue('108');
    const meterButton = screen.getByRole('button', { name: 'Selecionar compasso 4/4' });
    meterButton.focus();
    fireEvent.keyDown(meterButton, { key: 'ArrowUp' });
    expect(popoverBpm).toHaveValue('109');
    fireEvent.keyDown(meterButton, { key: '9' });
    expect(popoverBpm).toHaveFocus();
    expect(popoverBpm).toHaveValue('9');
    fireEvent.keyDown(popoverBpm, { key: 'Enter' });
    expect(popoverBpm).toHaveValue('40');
    fireEvent.change(popoverBpm, { target: { value: '120' } });
    fireEvent.keyDown(popoverBpm, { key: 'Escape' });
    expect(screen.getByLabelText('Controle do metrônomo')).toBeInTheDocument();
    meterButton.focus();
    fireEvent.keyDown(meterButton, { key: 'Escape' });
    expect(screen.queryByLabelText('Controle do metrônomo')).not.toBeInTheDocument();
  });

  test('inicia com sequência vazia e cria o primeiro acorde', () => {
    renderAt();
    expect(screen.getByRole('button', { name: 'Iniciar prática' })).toBeDisabled();
    expect(screen.getByLabelText('Sequência atual')).toHaveTextContent('Nenhum acorde ainda');
    expect(screen.queryByRole('heading', { name: 'Nenhum acorde ainda' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar acorde' }));
    expect(screen.getByLabelText('Sequência atual')).toHaveTextContent('C');
    expect(screen.getAllByRole('article')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Iniciar prática' })).toBeEnabled();
  });

  test('cria um exercício pronto sem substituir as sequências existentes', async () => {
    renderAt();
    fireEvent.click(screen.getByRole('button', { name: 'Exercícios prontos' }));
    const dialog = screen.getByRole('dialog', { name: 'Exercícios prontos' });
    expect(within(dialog).getByLabelText('Prévia dos acordes')).toHaveTextContent('CA7DmG7CC7FFmEm');
    fireEvent.change(within(dialog).getByLabelText('Tonalidade ou início'), { target: { value: 'D' } });
    expect(within(dialog).getByLabelText('Prévia dos acordes')).toHaveTextContent('DB7EmA7DD7GGmF#m');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Criar sequência' }));
    expect(screen.getByLabelText('Escolher sequência').value).toMatch(/^preset-/);
    expect(screen.getByLabelText('Sequência atual')).toHaveTextContent('F#m');
    expect(screen.getByText('Início da repetição')).toBeInTheDocument();
    await waitFor(() => expect(JSON.parse(window.localStorage.getItem('cavaquinhoLabSequences'))).toHaveLength(2));
  });

  test('ajusta e persiste a duração de cada card sem perder a forma', () => {
    renderAt();
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar acorde' }));
    fireEvent.click(screen.getByLabelText('Próxima forma do acorde 1'));
    const before = JSON.parse(window.localStorage.getItem('cavaquinhoLabSequences'))[0].steps[0].positionIndex;
    expect(screen.queryByLabelText('Batidas do acorde 1')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Durações' }));
    expect(screen.getByLabelText('Batidas do acorde 1')).toHaveTextContent('4');
    fireEvent.click(screen.getByRole('button', { name: 'Aumentar duração do acorde 1' }));
    expect(screen.getByLabelText('Batidas do acorde 1')).toHaveTextContent('5');
    const saved = JSON.parse(window.localStorage.getItem('cavaquinhoLabSequences'))[0].steps[0];
    expect(saved.practiceBeats).toBe(5);
    expect(saved.positionIndex).toBe(before);
  });

  test('indica voicing incompleto e atualiza o ponto ao trocar a forma', () => {
    const bm = cavaquinhoChords.chords.B.find(chord => chord.suffix === 'minor');
    const incompleteIndex = bm.positions.findIndex(position => !position.midi.some(note => note % 12 === 2));
    window.localStorage.clear();
    window.localStorage.setItem('cavaquinhoLabSequences', JSON.stringify([{
      id: 'sequence-1', title: 'Teste de Bm', steps: [{ id: 'bm', key: 'B', suffix: 'minor', positionIndex: incompleteIndex }]
    }]));
    window.history.pushState(null, '', '/sequences');
    render(<App />);
    expect(screen.getByLabelText(/Voicing incompleto: omite D/)).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Próxima forma do acorde 1'));
    expect(screen.getByLabelText('Voicing completo: contém todas as notas do acorde.')).toBeInTheDocument();
  });

  test('abre prática imersiva, pausa sem perder o card e restaura o editor', async () => {
    class FakeAudioContext {
      constructor() { this.currentTime = 0; this.destination = {}; }
      resume() { return Promise.resolve(); }
      close() { return Promise.resolve(); }
      createOscillator() { return { frequency: { setValueAtTime() {} }, connect() {}, start() {}, stop() {} }; }
      createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; }
    }
    window.AudioContext = FakeAudioContext;
    renderAt();
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar acorde' }));
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar acorde' }));
    const start = screen.getByRole('button', { name: 'Iniciar prática' });
    fireEvent.click(start);
    const dialog = await screen.findByRole('dialog', { name: 'Prática imersiva de sequência' });
    expect(dialog).toBeInTheDocument();
    expect(document.body).toHaveClass('sequence-practice-active');
    expect(within(dialog).getAllByRole('article')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Pausar prática' }));
    expect(screen.getByRole('button', { name: 'Continuar prática' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Sair' }));
    expect(screen.queryByRole('dialog', { name: 'Prática imersiva de sequência' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Acordes da sequência')).toBeInTheDocument();
    await waitFor(() => expect(start).toHaveFocus());
    delete window.AudioContext;
  });

  test('limita o editor a cinquenta acordes', () => {
    window.localStorage.clear();
    window.localStorage.setItem('cavaquinhoLabSequences', JSON.stringify([{
      id: 'sequence-1',
      title: 'Sequência longa',
      steps: Array.from({ length: 50 }, (_, index) => ({ id: 'step-' + index, key: 'C', suffix: 'major', practiceBeats: 4 }))
    }]));
    window.history.pushState(null, '', '/sequences');
    render(<App />);
    expect(screen.getAllByRole('article')).toHaveLength(50);
    expect(screen.getByRole('button', { name: 'Limite de 50 acordes' })).toBeDisabled();
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
    expect(screen.getByLabelText('Nome da sequência')).toHaveValue('Sequência');
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
    expect(nextRoot.closest('.chord-identity-part')).toHaveClass('chord-identity-root');
    expect(nextSuffix.closest('.chord-identity-part')).toHaveClass('chord-identity-suffix');
    fireEvent.click(nextRoot);
    expect(screen.getByLabelText('Sequência atual')).toHaveTextContent('Db');
    fireEvent.click(nextSuffix);
    expect(screen.getByLabelText('Sequência atual')).not.toHaveTextContent('Db →');
    fireEvent.click(nextShape);
    expect(JSON.parse(window.localStorage.getItem('cavaquinhoLabSequences'))[0].steps[0].positionIndex).not.toBe(null);
    expect(screen.queryByLabelText('Usar forma automática do acorde 1')).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Próxima nota do acorde 1'));
    expect(JSON.parse(window.localStorage.getItem('cavaquinhoLabSequences'))[0].steps[0].positionIndex).toBe(null);
  });

  test('mostra sufixos compactos nos controles do card de sequência', () => {
    renderAt();
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar acorde' }));
    const firstCard = screen.getAllByRole('article')[0];
    const chordIdentity = firstCard.querySelector('.chord-identity-control');
    const suffixInput = within(firstCard).getByLabelText('Sufixo do acorde 1');
    const nextSuffix = screen.getByLabelText('Próximo sufixo do acorde 1');

    expect(firstCard.querySelector('.sequence-card-main')).not.toBe(null);
    expect(chordIdentity.closest('.sequence-card-main')).not.toBe(null);
    expect(within(firstCard).getByLabelText('Nota do acorde 1')).toHaveValue('C');
    expect(suffixInput).toHaveValue('');
    expect(suffixInput).toHaveAttribute('placeholder', 'maj');
    fireEvent.click(nextSuffix);
    fireEvent.click(nextSuffix);
    fireEvent.click(nextSuffix);

    expect(chordIdentity).toHaveAttribute('aria-label', 'Acorde C7: Sétima dominante');
    expect(suffixInput).toHaveValue('7');
    expect(within(firstCard).queryByText('Sétima dominante')).not.toBeInTheDocument();
    expect(firstCard.querySelector('.sequence-shape-card .chord-shape-name-row strong')).toBe(null);
    expect(firstCard.querySelector('.sequence-shape-card .shape-code')).toBe(null);
    expect(firstCard.querySelector('.sequence-shape-card .chord-shape-card-header .shape-index-badge')).toBe(null);
    expect(firstCard.querySelector('.sequence-shape-card .chord-shape-footer .shape-index-badge')).not.toBe(null);
    expect(firstCard.querySelector('.sequence-shape-card').closest('.sequence-card-main')).not.toBe(null);
  });

  test('permite digitar acordes, aliases portugueses e usar o teclado', () => {
    renderAt();
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar acorde' }));
    const rootInput = screen.getByLabelText('Nota do acorde 1');
    const suffixInput = screen.getByLabelText('Sufixo do acorde 1');

    fireEvent.change(rootInput, { target: { value: 'C#m' } });
    fireEvent.keyDown(rootInput, { key: 'Enter' });
    expect(screen.getByLabelText('Sequência atual')).toHaveTextContent('C#m');

    fireEvent.change(suffixInput, { target: { value: 'sétima maior' } });
    fireEvent.blur(suffixInput);
    expect(screen.getByLabelText('Sequência atual')).toHaveTextContent('C#maj7');

    fireEvent.keyDown(rootInput, { key: 'ArrowDown' });
    expect(screen.getByLabelText('Sequência atual')).toHaveTextContent('Dmaj7');
    fireEvent.keyDown(suffixInput, { key: 'ArrowUp' });
    expect(screen.getByLabelText('Sequência atual')).not.toHaveTextContent('Dmaj7');
  });

  test('reutiliza formas existentes para add9 e m6', () => {
    renderAt();
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar acorde' }));
    const rootInput = screen.getByLabelText('Nota do acorde 1');

    fireEvent.change(rootInput, { target: { value: 'Cadd9' } });
    fireEvent.keyDown(rootInput, { key: 'Enter' });
    expect(screen.getByLabelText('Sequência atual')).toHaveTextContent('Cadd9');
    expect(screen.getByLabelText('Forma de Cadd9')).toBeInTheDocument();

    fireEvent.change(rootInput, { target: { value: 'Gm6' } });
    fireEvent.keyDown(rootInput, { key: 'Enter' });
    expect(screen.getByLabelText('Sequência atual')).toHaveTextContent('Gm6');
    expect(screen.getByLabelText('Forma de Gm6')).toBeInTheDocument();
  });

  test('mantém o acorde anterior quando a entrada é inválida e permite cancelar', () => {
    renderAt();
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar acorde' }));
    const rootInput = screen.getByLabelText('Nota do acorde 1');

    fireEvent.change(rootInput, { target: { value: 'H13' } });
    fireEvent.keyDown(rootInput, { key: 'Enter' });
    expect(rootInput).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Acorde não disponível.')).toBeInTheDocument();
    expect(screen.getByLabelText('Sequência atual')).toHaveTextContent('C');

    fireEvent.keyDown(rootInput, { key: 'Escape' });
    expect(rootInput).toHaveValue('C');
    expect(rootInput).toHaveAttribute('aria-invalid', 'false');
  });

  test('mantém escolhas de forma independentes entre cards', () => {
    renderAt();
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar acorde' }));
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar acorde' }));

    fireEvent.click(screen.getByLabelText('Próxima forma do acorde 1'));
    fireEvent.click(screen.getByLabelText('Próxima forma do acorde 2'));
    fireEvent.click(screen.getByLabelText('Próxima forma do acorde 2'));

    const getSavedSteps = () => JSON.parse(window.localStorage.getItem('cavaquinhoLabSequences'))[0].steps;
    const savedPositionIndexes = getSavedSteps().map(step => step.positionIndex);
    expect(savedPositionIndexes.every(Number.isInteger)).toBe(true);
    expect(savedPositionIndexes[0]).not.toBe(savedPositionIndexes[1]);

    const secondCard = within(screen.getByLabelText('Acordes da sequência')).getAllByRole('article')[1];
    const secondShapeBeforeRootChange = secondCard.querySelector('.shape-index-badge').textContent;

    fireEvent.click(screen.getByLabelText('Próxima nota do acorde 1'));

    expect(getSavedSteps()[0].positionIndex).toBe(null);
    expect(getSavedSteps()[1].positionIndex).toBe(savedPositionIndexes[1]);
    expect(secondCard.querySelector('.shape-index-badge')).toHaveTextContent(secondShapeBeforeRootChange);
  });

  test('usa card compartilhado compacto na página Formas', () => {
    renderAt('/shapes');
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

    expect(screen.getByLabelText('Mover acorde 1 para frente')).toBeInTheDocument();
    expect(screen.getByLabelText('Mover acorde 2 para trás')).toBeInTheDocument();
    const cards = within(screen.getByLabelText('Acordes da sequência')).getAllByRole('article');
    const dataTransfer = createDataTransfer();
    fireEvent.dragStart(cards[1], { dataTransfer });
    fireEvent.dragOver(cards[0], { dataTransfer });
    fireEvent.drop(cards[0], { dataTransfer });
    fireEvent.dragEnd(cards[1], { dataTransfer });

    expect(screen.getByLabelText('Sequência atual')).toHaveTextContent('Db → C');
    expect(JSON.parse(window.localStorage.getItem('cavaquinhoLabSequences'))[0].steps.map(step => step.key)).toEqual(['Db', 'C']);
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
    expect(screen.getByText('Entender e praticar esta sequência').closest('details')).not.toHaveAttribute('open');
  });

  test('renderiza a página Braço com afinação e primeiras casas', () => {
    renderAt('/fretboard');
    expect(screen.getByRole('link', { name: 'Braço' })).toHaveClass('active');
    expect(screen.getByRole('heading', { name: 'Braço e notas no cavaquinho' })).toBeInTheDocument();
    expect(screen.getByText('Localize uma nota em todas as suas posições no braço.')).toBeInTheDocument();
    expect(screen.getByLabelText('Afinação do cavaquinho: D G B D')).toHaveTextContent('DGBD');
    expect(screen.queryByText('soltas')).not.toBeInTheDocument();
    expect(document.querySelector('.fretboard-open-notes')).toBe(null);
    expect(document.querySelector('.open-row')).toBe(null);
    expect(screen.getByLabelText('Mapa de notas do braço do cavaquinho em D G B D')).toHaveTextContent('DGBD');
    expect(screen.getByLabelText('Mapa de notas do braço do cavaquinho em D G B D')).toHaveTextContent('Eb');
    expect(document.querySelectorAll('.fretboard-note[tabindex]')).toHaveLength(0);
    fireEvent.change(screen.getByLabelText('Destacar nota'), { target: { value: 'C' } });
    expect(document.querySelectorAll('.fretboard-note.highlighted').length).toBeGreaterThan(0);
  });

  test('abre a escala sem rota automática e deixa os graus selecionáveis', () => {
    renderAt('/practice');
    expect(screen.getByLabelText('Tônica da escala')).toHaveValue('C');
    expect(screen.getByLabelText('Tipo de escala')).toHaveValue('major');
    expect(screen.getByText('C maior · C D E F G A B')).toBeInTheDocument();
    expect(document.querySelectorAll('.fretboard-note.path-note')).toHaveLength(0);
    expect(document.querySelectorAll('.fretboard-note.in-scale').length).toBeGreaterThan(20);
    expect(screen.getByRole('button', { name: 'Praticar escala' })).toBeDisabled();
    expect(screen.getByText('Escolha a nota inicial.')).toBeInTheDocument();
    expect(document.querySelector('.fretboard-open-strings')).not.toBe(null);
    expect([...document.querySelectorAll('.fretboard-matrix .matrix-fret-label')].map(item => item.textContent)).not.toContain('0');
    expect(screen.queryByLabelText('Destacar nota')).not.toBeInTheDocument();
  });

  test('escolhe graus arbitrários como âncoras, edita e salva o caminho', () => {
    renderAt('/practice');
    const start = screen.getByRole('button', { name: /Adicionar A4, corda 2, casa 2/ });
    fireEvent.keyDown(start, { key: 'Enter' });
    const end = screen.getByRole('button', { name: /Adicionar F5, corda 3, casa 6/ });
    fireEvent.keyDown(end, { key: ' ' });
    expect(document.querySelectorAll('.fretboard-note.path-note')).toHaveLength(6);
    expect(document.querySelector('.fretboard-note.path-start')).toHaveAttribute('data-note', 'A');
    expect(document.querySelector('.fretboard-note.path-end')).toHaveAttribute('data-note', 'F');
    fireEvent.click(screen.getByRole('button', { name: 'Editar caminho' }));
    fireEvent.click(screen.getAllByRole('button', { name: /casa/ })[0]);
    fireEvent.click(document.querySelector('.fretboard-note.path-candidate'));
    fireEvent.click(screen.getByRole('button', { name: 'Desfazer' }));
    fireEvent.change(screen.getByLabelText('Nome do caminho'), { target: { value: 'D grave diário' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar caminho' }));
    expect(screen.getByLabelText('Caminho selecionado').value).toMatch(/^custom-/);
    expect(JSON.parse(window.localStorage.getItem('cavaquinhoLabScalePaths')).paths[0].name).toBe('D grave diário');
    fireEvent.change(screen.getByLabelText('Nome do caminho selecionado'), { target: { value: 'D grave 2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar nome' }));
    expect(screen.getByLabelText('Caminho selecionado')).toHaveTextContent('D grave 2');
    fireEvent.click(screen.getByRole('button', { name: 'Excluir caminho' }));
    expect(JSON.parse(window.localStorage.getItem('cavaquinhoLabScalePaths')).paths).toHaveLength(0);
  });

  test('pratica qualquer sequência salva sem selecionar uma escala', () => {
    window.localStorage.clear();
    window.localStorage.setItem('cavaquinhoLabSequences', JSON.stringify([
      { id: 'daily', title: 'Trocas diárias', steps: [
        { id: 'c', key: 'C', suffix: 'major', positionIndex: 0 },
        { id: 'g', key: 'G', suffix: 'major', positionIndex: null }
      ] }
    ]));
    window.localStorage.setItem('cavaquinhoLabActiveSequenceId', 'daily');
    window.history.pushState(null, '', '/practice');
    render(<App />);

    fireEvent.click(screen.getByRole('tab', { name: 'Sequência' }));
    expect(screen.getByLabelText('Sequência para praticar')).toHaveValue('daily');
    expect(screen.getByText('C → G')).toBeInTheDocument();
    expect(screen.getByLabelText('Batidas por acorde')).toHaveValue('4');
    expect(screen.getByRole('spinbutton', { name: 'BPM da prática de sequência' })).toHaveValue('80');
    expect(screen.getByRole('button', { name: 'Praticar sequência' })).toBeEnabled();
    expect(screen.queryByLabelText('Tônica da escala')).not.toBeInTheDocument();
    expect(document.querySelectorAll('.fretboard-note.path-note')).toHaveLength(4);
    expect(document.querySelector('.fretboard-open-strings .fretboard-note.path-note')).not.toBe(null);
    expect(document.querySelector('.practice-page')).not.toHaveTextContent('NaN');
  });

  test('exporta formas de acorde já ordenadas por primeira casa sem mutar a base original', () => {
    const rawPositions = rawCavaquinhoChords.chords.C.find(chord => chord.suffix === 'major').positions;
    const sortedPositions = cavaquinhoChords.chords.C.find(chord => chord.suffix === 'major').positions;

    expect(rawPositions.map(getFirstPlayedFret)).toEqual([0, 5, 5, 8, 10, 2, 8]);
    expect(sortedPositions.map(getFirstPlayedFret)).toEqual([0, 2, 5, 5, 8, 8, 10]);
    expect(rawPositions[1].frets).toEqual([1, 1, 1, 1]);
    expect(sortedPositions[1].frets).toEqual(rawPositions[5].frets);
  });

  test('não usa helper de ordenação em tempo de renderização', () => {
    const sourceFiles = [
      'src/components/SequenceLab.jsx',
      'src/pages/ShapesPage.jsx'
    ].map(file => fs.readFileSync(path.join(process.cwd(), file), 'utf8')).join('\\n');
    expect(sourceFiles).not.toContain('getSortedChordPositions');
    expect(fs.existsSync(path.join(process.cwd(), 'src/chordShapes.js'))).toBe(false);
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
