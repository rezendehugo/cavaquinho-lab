import { fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';
import rawCavaquinhoChords from '@tombatossals/chords-db/lib/cavaquinho.json';
import App from './App.jsx';
import { getRoutes, uiAuditScenarios } from './config';
import { getCavaquinhoChords } from './domain/chords';
import { analyzeChordVoicing } from './domain/chordTheory';
import { getChordShapeCandidates, getShapeCandidateRankingScore, groupChordShapeCandidates, hasPlayableFretSpan } from './progressionOptimizer';

const cavaquinhoChords = getCavaquinhoChords();

const renderAt = (route = '/sequences') => {
  window.localStorage.clear();
  window.history.pushState(null, '', route);
  return render(<App />);
};

const selectPracticeTab = async name => {
  fireEvent.click(await screen.findByRole('tab', { name }));
  await waitFor(() => expect(document.querySelector('.panel-loading')).not.toBeInTheDocument());
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
  test('abre Escala por padrão sem montar os painéis de acordes e prática inativos', async () => {
    renderAt('/practice');
    expect(await screen.findByRole('tab', { name: 'Escala' })).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByLabelText('Tônica da escala')).toHaveValue('C');
    expect(screen.getByLabelText('Tipo de escala')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Treino de ouvido' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /sequência/i })).not.toBeInTheDocument();
  });

  test('abre a apresentação pública como experiência principal', async () => {
    renderAt('/');
    await waitFor(() => expect(window.location.pathname).toBe('/'));
    expect(await screen.findByRole('heading', { name: /formas que estavam no PDF/i })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'C maior no cavaquinho' })).toBeInTheDocument();
  });

  test('mostra Formas, Sequências, Braço e Prática na navegação', () => {
    renderAt();
    expect(getRoutes().filter(route => route.primary !== false).map(route => route.label)).toEqual(['Formas', 'Sequências', 'Braço', 'Prática']);
    expect(screen.getByRole('link', { name: 'Formas' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sequências' })).toHaveClass('active');
    expect(screen.getByRole('link', { name: 'Braço' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Prática' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Cavaquinho' })).not.toBeInTheDocument();
  });

  test('oferece trilha auditiva em etapas e guarda o progresso localmente', async () => {
    renderAt('/practice');
    await selectPracticeTab('Ouvido');
    expect(screen.getByRole('heading', { name: 'Treino de ouvido' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Sinta o modo' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ouvir trecho' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Maior' }));
    expect(screen.getByRole('heading', { name: /escuta|ouvir essa relação/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Próximo desafio' })).toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem('cavaquinhoLabEarTraining:v1')).mode.attempts).toBe(1);
    fireEvent.click(screen.getByRole('button', { name: 'Próximo desafio' }));
    expect(screen.getByRole('heading', { name: 'Sinta o modo' })).toBeInTheDocument();
  });

  test('mantém toda rota em pelo menos um cenário de auditoria visual', () => {
    const auditedPaths = new Set(uiAuditScenarios.map(scenario => scenario.path));
    expect(getRoutes().every(route => auditedPaths.has(route.path))).toBe(true);
  });

  test('redireciona a rota antiga de prática para a nova página', async () => {
    renderAt('/cavaquinho/practice');
    await waitFor(() => expect(window.location.pathname).toBe('/practice'));
    expect(screen.getByRole('link', { name: 'Prática' })).toHaveClass('active');
  });

  test('abre o workspace privado de importação sem acessar banco diretamente', async () => {
    renderAt('/imports');
    expect(await screen.findByRole('heading', { name: 'Partitura para prática' })).toBeInTheDocument();
    expect(screen.getByLabelText('Escolher PDF, MusicXML ou MXL')).toHaveAttribute('accept', expect.stringContaining('.pdf'));
    expect(screen.getByText(/arquivo privado/i)).toBeInTheDocument();
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
    expect(screen.queryByText('Escute antes de conferir')).not.toBeInTheDocument();
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
    expect(screen.getByRole('button', { name: 'Iniciar metrônomo' })).toBeInTheDocument();
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
    expect(screen.queryByRole('button', { name: 'Iniciar prática' })).not.toBeInTheDocument();
    expect(screen.queryByText('Escute antes de conferir')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Sequência atual')).toHaveTextContent('Nenhum acorde ainda');
    expect(screen.queryByRole('heading', { name: 'Nenhum acorde ainda' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar acorde' }));
    expect(screen.getByLabelText('Sequência atual')).toHaveTextContent('C');
    expect(screen.getAllByRole('article')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Iniciar prática' })).toBeEnabled();
    expect(screen.getByText('Escute antes de conferir')).toBeInTheDocument();
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

  test('indica dim7 incompleto e atualiza o ponto ao trocar a forma', () => {
    const diminished = cavaquinhoChords.chords.C.find(chord => chord.suffix === 'dim7');
    const incompleteIndex = diminished.positions.findIndex(position =>
      analyzeChordVoicing({ key: 'C', suffix: 'dim7' }, position).missingNotes.length === 1
    );
    window.localStorage.clear();
    window.localStorage.setItem('cavaquinhoLabSequences', JSON.stringify([{
      id: 'sequence-1', title: 'Teste de Cdim7', steps: [{ id: 'dim', key: 'C', suffix: 'dim7', positionIndex: incompleteIndex }]
    }]));
    window.history.pushState(null, '', '/sequences');
    render(<App />);
    expect(screen.getByLabelText(/Voicing incompleto: omite/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Escolher forma' }));
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Cdim7' })).getByRole('button', { name: /Usar forma 1 de/ }));
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

  test('pratica sem olhar, oferece pistas em etapas e revela sequência e reflexão ao final', async () => {
    window.localStorage.clear();
    window.localStorage.setItem('cavaquinhoLabSequences', JSON.stringify([{
      id: 'sequence-1', title: 'Minha sequência', steps: [
        { id: 'one', key: 'C', suffix: 'major' },
        { id: 'two', key: 'D', suffix: 'minor' }
      ]
    }]));
    window.history.pushState(null, '', '/practice');
    render(<App />);
    await selectPracticeTab('Sequência');

    fireEvent.click(screen.getByRole('button', { name: 'Praticar sem olhar' }));
    const dialog = screen.getByRole('dialog', { name: 'Prática sem olhar: Minha sequência' });
    expect(dialog).toHaveTextContent('Toque o que você lembra');
    expect(dialog).not.toHaveTextContent('Dm');
    expect(dialog).not.toHaveTextContent('C maior');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Pedir pista de qualidade' }));
    expect(dialog).toHaveTextContent('Pista 1: qualidade maior.');
    expect(dialog).not.toHaveTextContent('C maior');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Pedir pista da nota' }));
    expect(dialog).toHaveTextContent('Pista 2: a nota fundamental é C.');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Marcar acorde tocado' }));
    expect(dialog).toHaveTextContent('Acorde 2 de 2');
    expect(dialog).not.toHaveTextContent('Dm');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Terminar e conferir sequência' }));
    expect(dialog).toHaveTextContent('Agora confira');
    expect(within(dialog).getByLabelText('Sequência revelada')).toHaveTextContent('C');
    expect(within(dialog).getByLabelText('Sequência revelada')).toHaveTextContent('Dm');

    fireEvent.change(within(dialog).getByLabelText('O que você lembrou, ouviu ou sentiu ao tocar?'), { target: { value: 'Lembrei a troca pelo som.' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Registrar esta sessão' }));
    expect(JSON.parse(window.localStorage.getItem('cavaquinhoLabStudy:sequence-1'))).toMatchObject({
      observation: 'Lembrei a troca pelo som.', sessions: [expect.objectContaining({ observation: 'Lembrei a troca pelo som.' })]
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Sair' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Praticar sem olhar' })).toHaveFocus());
  });

  test('permite conferir a resposta atual ou a sequência inteira antes de terminar', async () => {
    window.localStorage.clear();
    window.localStorage.setItem('cavaquinhoLabSequences', JSON.stringify([{
      id: 'sequence-1', title: 'Sequência curta', steps: [{ id: 'one', key: 'Db', displayKey: 'C#', suffix: 'major' }, { id: 'two', key: 'G', suffix: '7' }]
    }]));
    window.history.pushState(null, '', '/practice');
    render(<App />);
    await selectPracticeTab('Sequência');
    fireEvent.click(screen.getByRole('button', { name: 'Praticar sem olhar' }));
    let dialog = screen.getByRole('dialog', { name: 'Prática sem olhar: Sequência curta' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Conferir este acorde' }));
    expect(dialog).toHaveTextContent('Resposta: C#.');
    expect(dialog).not.toHaveTextContent('G7');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Conferir sequência agora' }));
    dialog = screen.getByRole('dialog', { name: 'Prática sem olhar: Sequência curta' });
    expect(within(dialog).getByLabelText('Sequência revelada')).toHaveTextContent('C#');
    expect(within(dialog).getByLabelText('Sequência revelada')).toHaveTextContent('G7');
  });

  test('bloqueia a prática sem olhar para uma sequência vazia', async () => {
    renderAt('/practice');
    await selectPracticeTab('Sequência');
    expect(screen.getByRole('button', { name: 'Praticar sem olhar' })).toBeDisabled();
  });

  test('conclui e revela uma tentativa de um acorde', async () => {
    window.localStorage.clear();
    window.localStorage.setItem('cavaquinhoLabSequences', JSON.stringify([{
      id: 'sequence-1', title: 'Um acorde', steps: [{ id: 'one', key: 'G', suffix: '7' }]
    }]));
    window.history.pushState(null, '', '/practice');
    render(<App />);
    await selectPracticeTab('Sequência');
    fireEvent.click(screen.getByRole('button', { name: 'Praticar sem olhar' }));
    const dialog = screen.getByRole('dialog', { name: 'Prática sem olhar: Um acorde' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Terminar e conferir sequência' }));
    expect(within(dialog).getByLabelText('Sequência revelada')).toHaveTextContent('G7');
    expect(within(dialog).getByRole('button', { name: 'Registrar esta sessão' })).toBeDisabled();
  });

  test('mantém o editor utilizável com cinquenta acordes e permite continuar até quinhentos', () => {
    window.localStorage.clear();
    window.localStorage.setItem('cavaquinhoLabSequences', JSON.stringify([{
      id: 'sequence-1',
      title: 'Sequência longa',
      steps: Array.from({ length: 50 }, (_, index) => ({ id: 'step-' + index, key: 'C', suffix: 'major', practiceBeats: 4 }))
    }]));
    window.history.pushState(null, '', '/sequences');
    render(<App />);
    expect(screen.getAllByRole('article')).toHaveLength(50);
    expect(screen.getByRole('button', { name: 'Adicionar acorde' })).toBeEnabled();
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
    expect(screen.getByLabelText('Sequência atual')).toHaveTextContent('C#7M');

    fireEvent.keyDown(rootInput, { key: 'ArrowDown' });
    expect(screen.getByLabelText('Sequência atual')).toHaveTextContent('D7M');
    fireEvent.keyDown(suffixInput, { key: 'ArrowUp' });
    expect(screen.getByLabelText('Sequência atual')).not.toHaveTextContent('D7M');
  });

  test('reutiliza formas existentes para add9, m6 e 6/9', () => {
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

    fireEvent.change(rootInput, { target: { value: 'G6/9' } });
    fireEvent.keyDown(rootInput, { key: 'Enter' });
    expect(screen.getByLabelText('Sequência atual')).toHaveTextContent('G6/9');
    expect(screen.getByLabelText('Forma de G6/9')).toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem('cavaquinhoLabSequences'))[0].steps[0].suffix).toBe('69');

    fireEvent.change(rootInput, { target: { value: 'G7M(9)' } });
    fireEvent.keyDown(rootInput, { key: 'Enter' });
    expect(screen.getByLabelText('Sequência atual')).toHaveTextContent('G7M(9)');
    expect(screen.getByLabelText('Forma de G7M(9)')).toBeInTheDocument();
    expect(screen.getByLabelText(/Voicing sem raiz/)).toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem('cavaquinhoLabSequences'))[0].steps[0].suffix).toBe('maj9');

    fireEvent.change(rootInput, { target: { value: 'Gm(7M)' } });
    fireEvent.keyDown(rootInput, { key: 'Enter' });
    expect(screen.getByLabelText('Sequência atual')).toHaveTextContent('Gm(7M)');
    expect(screen.getByLabelText('Forma de Gm(7M)')).toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem('cavaquinhoLabSequences'))[0].steps[0].suffix).toBe('mmaj7');
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
    expect(savedPositionIndexes).toHaveLength(2);

    const secondCard = within(screen.getByLabelText('Acordes da sequência')).getAllByRole('article')[1];
    const secondShapeBeforeRootChange = secondCard.querySelector('.shape-index-badge').textContent;

    fireEvent.click(screen.getByLabelText('Próxima nota do acorde 1'));

    expect(getSavedSteps()[0].positionIndex).toBe(null);
    expect(getSavedSteps()[1].positionIndex).toBe(savedPositionIndexes[1]);
    expect(secondCard.querySelector('.shape-index-badge')).toHaveTextContent(secondShapeBeforeRootChange);
  });

  test('escolhe uma forma pela galeria e permite voltar ao automático', () => {
    renderAt();
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar acorde' }));
    fireEvent.click(screen.getByRole('button', { name: 'Escolher forma' }));
    const dialog = screen.getByRole('dialog', { name: 'C' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Usar forma 3 de 7' }));
    expect(JSON.parse(window.localStorage.getItem('cavaquinhoLabSequences'))[0].steps[0].positionIndex).toBe(2);
    expect(screen.getByText('Forma 3 fixada')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Escolher forma' }));
    fireEvent.click(within(screen.getByRole('dialog', { name: 'C' })).getByRole('button', { name: /Automática/ }));
    expect(JSON.parse(window.localStorage.getItem('cavaquinhoLabSequences'))[0].steps[0].positionIndex).toBe(null);
    expect(screen.getByText('Forma automática')).toBeInTheDocument();
  });

  test('usa card compartilhado compacto na página Formas', async () => {
    renderAt('/shapes');
    await screen.findByText('1/7');
    expect(screen.getByRole('link', { name: 'Formas' })).toHaveClass('active');
    expect(document.querySelectorAll('.chord-shape-card').length).toBeGreaterThan(0);
    expect(screen.getByText('1/7')).toBeInTheDocument();
    expect(screen.queryByText(/Forma 1 de 7/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Notas:/)).not.toBeInTheDocument();
    expect(document.querySelector('.chord-diagram figcaption')).toBe(null);
    expect(document.querySelector('.diagram-tuning')).toBe(null);
  });

  test('apresenta voicings de nona sem raiz com orientação acessível', async () => {
    renderAt('/shapes');
    await screen.findByLabelText('Escolher qualidade');
    fireEvent.change(screen.getByLabelText('Escolher qualidade'), { target: { value: 'maj9' } });
    expect(screen.getByText(/C7M\(9\).*10 formas/)).toBeInTheDocument();
    expect(document.querySelectorAll('.shape-grid .voicing-status-dot--rootless')).toHaveLength(10);
    expect(document.querySelectorAll('.chord-legend-strip .chord-legend-status')).toHaveLength(1);
    expect(document.querySelectorAll('.chord-degree-legend')).toHaveLength(0);
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
    expect(screen.getByLabelText('Estudo da sequência')).toHaveTextContent('Campo harmônico:');
    expect(screen.getByLabelText('Estudo da sequência')).toHaveTextContent('Função provável:');
    expect(screen.getByLabelText('Estudo da sequência')).toHaveTextContent('Substituições pela função:');
    expect(screen.getByLabelText('Estudo da sequência')).toHaveTextContent('Movimento da forma:');
    expect(screen.getByText('Aprofundar a leitura harmônica').closest('details')).not.toHaveAttribute('open');
  });

  test('renderiza a página Braço com afinação e primeiras casas', async () => {
    renderAt('/fretboard');
    await screen.findByRole('heading', { name: 'Braço e notas no cavaquinho' });
    expect(screen.getByRole('link', { name: 'Braço' })).toHaveClass('active');
    expect(screen.getByRole('heading', { name: 'Braço e notas no cavaquinho' })).toBeInTheDocument();
    expect(screen.getByLabelText('Afinação do cavaquinho: D G B D')).toHaveTextContent('DGBD');
    expect(screen.queryByText('soltas')).not.toBeInTheDocument();
    expect(document.querySelector('.fretboard-open-notes')).toBe(null);
    expect(document.querySelector('.open-row')).toBe(null);
    expect(screen.getByLabelText('Mapa de notas do braço do cavaquinho em D G B D')).toHaveTextContent('DGBD');
    expect(screen.getByLabelText('Mapa de notas do braço do cavaquinho em D G B D')).toHaveTextContent('Eb');
    expect(document.querySelectorAll('.fretboard-note[tabindex]')).toHaveLength(0);
    expect(screen.getByRole('button', { name: 'Notas' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Escalas' })).toHaveAttribute('aria-pressed', 'false');
    fireEvent.change(screen.getByLabelText('Destacar nota'), { target: { value: 'C' } });
    expect(document.querySelectorAll('.fretboard-note.highlighted').length).toBeGreaterThan(0);
  });

  test('destaca escalas na página Braço sem ativar prática', async () => {
    renderAt('/fretboard');
    await screen.findByRole('heading', { name: 'Braço e notas no cavaquinho' });
    fireEvent.click(screen.getByRole('button', { name: 'Escalas' }));
    expect(screen.getByLabelText('Tônica da escala no braço')).toHaveValue('C');
    expect(screen.getByLabelText('Tipo de escala no braço')).toHaveValue('major');
    expect(screen.getByText('C maior · C D E F G A B')).toBeInTheDocument();
    expect(document.querySelectorAll('.fretboard-note.in-scale').length).toBeGreaterThan(20);
    expect(document.querySelectorAll('.fretboard-note.scale-root').length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: 'Praticar escala' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Tônica da escala no braço'), { target: { value: 'D' } });
    fireEvent.change(screen.getByLabelText('Tipo de escala no braço'), { target: { value: 'minorPentatonic' } });
    expect(screen.getByText('D pentatônica menor · D F G A C')).toBeInTheDocument();
  });

  test('abre a escala sem rota automática e deixa os graus selecionáveis', () => {
    renderAt('/practice');
    expect(screen.getByLabelText('Tônica da escala')).toHaveValue('C');
    expect(screen.getByLabelText('Tipo de escala')).toHaveValue('major');
    expect(screen.getByText('C maior · C D E F G A B')).toBeInTheDocument();
    expect(document.querySelectorAll('.fretboard-note.path-note')).toHaveLength(0);
    expect(document.querySelectorAll('.fretboard-note.in-scale').length).toBeGreaterThan(20);
    expect(screen.queryByRole('button', { name: 'Praticar escala' })).not.toBeInTheDocument();
    expect(screen.getByText('Escolha o início e o fim no braço para liberar as opções de prática.')).toBeInTheDocument();
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

  test('cria, salva e reabre um solo livre sem tonalidade', async () => {
    renderAt('/practice');
    await selectPracticeTab('Solo livre');
    fireEvent.click(screen.getByRole('button', { name: /Adicionar D4, corda 1, casa 0/ }));
    fireEvent.click(screen.getByRole('button', { name: /Adicionar C5, corda 3, casa 1/ }));
    fireEvent.click(screen.getByRole('button', { name: /Adicionar D4, corda 1, casa 0/ }));
    expect(screen.getByLabelText('Notas do solo')).toHaveTextContent('1. D4');
    expect(screen.getByLabelText('Notas do solo')).toHaveTextContent('2. C5');
    expect(screen.getByLabelText('Notas do solo')).toHaveTextContent('3. D4');
    fireEvent.change(screen.getByLabelText('Nome do solo'), { target: { value: 'Frase cromática' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar solo' }));
    expect(JSON.parse(window.localStorage.getItem('cavaquinhoLabFreeSolos')).solos[0].name).toBe('Frase cromática');
    expect(screen.getByLabelText('Solo selecionado')).toHaveTextContent('Frase cromática');
    expect(screen.getByRole('button', { name: 'Praticar solo' })).toBeEnabled();
    expect(screen.queryByLabelText('Tônica da escala')).not.toBeInTheDocument();
  });

  test('abre o solo livre em modo focado sem divulgar o limite interno', async () => {
    class FakeAudioContext {
      constructor() { this.currentTime = 0; this.destination = {}; }
      resume() { return Promise.resolve(); }
      close() { return Promise.resolve(); }
      createOscillator() { return { frequency: { setValueAtTime() {} }, connect() {}, start() {}, stop() {} }; }
      createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; }
    }
    window.AudioContext = FakeAudioContext;
    renderAt('/practice');
    await selectPracticeTab('Solo livre');
    fireEvent.click(screen.getByRole('button', { name: /Adicionar D4, corda 1, casa 0/ }));
    expect(screen.queryByText(/de 1000 notas/)).not.toBeInTheDocument();
    expect(screen.queryByText(/de 64 notas/)).not.toBeInTheDocument();
    expect(document.querySelector('.solo-timeline-panel')).toContainElement(screen.getByLabelText('Notas do solo'));
    expect(document.querySelector('.solo-control-rail')).toContainElement(screen.getByRole('button', { name: 'Praticar solo' }));
    expect(document.querySelector('.solo-fretboard-pane')).toContainElement(screen.getByLabelText('Criação e prática de solo livre'));
    expect(document.querySelectorAll('.free-solo-panel .path-progress')).toHaveLength(1);
    expect(document.querySelector('.free-solo-panel .scale-practice-status')).not.toBeInTheDocument();
    const start = screen.getByRole('button', { name: 'Praticar solo' });
    fireEvent.click(start);
    const dialog = await screen.findByRole('dialog', { name: 'Prática focada: Meu solo' });
    expect(within(dialog).getByLabelText('Prática focada do solo livre')).toBeInTheDocument();
    expect(document.querySelector('[inert]')).toBeInTheDocument();
    expect(document.body).toHaveClass('focused-practice-active');
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(start).toHaveFocus());
    expect(screen.queryByRole('dialog', { name: 'Prática focada: Meu solo' })).not.toBeInTheDocument();
    delete window.AudioContext;
  });

  test('preserva o editor quando o áudio da prática focada não está disponível', async () => {
    delete window.AudioContext;
    renderAt('/practice');
    await selectPracticeTab('Solo livre');
    fireEvent.click(screen.getByRole('button', { name: /Adicionar D4, corda 1, casa 0/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Praticar solo' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Prática focada: Meu solo' })).not.toBeInTheDocument());
    expect(screen.getByLabelText('Notas do solo')).toHaveTextContent('1. D4');
  });

  test('pratica qualquer sequência salva sem selecionar uma escala', async () => {
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

    await selectPracticeTab('Sequência');
    expect(screen.getByLabelText('Sequência para praticar')).toHaveValue('daily');
    const navigator = screen.getByRole('list', { name: 'Acordes da sequência' });
    expect(within(navigator).getAllByRole('button')).toHaveLength(2);
    expect(within(navigator).getByRole('button', { name: 'C, 1 ocorrência' })).toBeInTheDocument();
    expect(within(navigator).getByRole('button', { name: 'G, 1 ocorrência' })).toBeInTheDocument();
    expect(within(navigator).queryByText('1')).not.toBeInTheDocument();
    const chordOne = within(navigator).getByRole('button', { name: 'C, 1 ocorrência' });
    fireEvent.keyDown(chordOne, { key: 'ArrowRight' });
    expect(within(navigator).getByRole('button', { name: 'G, 1 ocorrência' })).toHaveAttribute('aria-current', 'step');
    fireEvent.keyDown(within(navigator).getByRole('button', { name: 'G, 1 ocorrência' }), { key: 'ArrowLeft' });
    expect(within(navigator).getByRole('button', { name: 'C, 1 ocorrência' })).toHaveAttribute('aria-current', 'step');
    expect(within(navigator).queryByText('1/7')).not.toBeInTheDocument();
    expect(document.querySelector('.sequence-note-pills')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Forma anterior' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Próxima forma' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Editar forma' })).toBeInTheDocument();
    const practiceTools = screen.getByText('Praticar ou exportar');
    expect(practiceTools.parentElement).not.toHaveAttribute('open');
    fireEvent.click(practiceTools);
    expect(screen.getByLabelText('Batidas por acorde')).toHaveValue('4');
    expect(screen.getByRole('spinbutton', { name: 'BPM da prática de sequência' })).toHaveValue('80');
    expect(screen.getByRole('button', { name: 'Praticar sequência' })).toBeEnabled();
    expect(screen.queryByLabelText('Tônica da escala')).not.toBeInTheDocument();
    expect(document.querySelectorAll('.fretboard-note.path-note')).toHaveLength(4);
    expect(document.querySelector('.fretboard-open-strings .fretboard-note.path-note')).not.toBe(null);
    expect(document.querySelector('.practice-page')).not.toHaveTextContent('NaN');
  });

  test('mostra a fórmula inteira, preserva o grip confortável e permite escolher dedilhado alternativo', async () => {
    window.localStorage.clear();
    window.localStorage.setItem('cavaquinhoLabSequences', JSON.stringify([{
      id: 'impossible-csharp-dim', title: 'C#dim', steps: [{
        id: 'csharp-dim', key: 'Db', displayKey: 'C#', suffix: 'dim',
        customPosition: { frets: [2, 6, 2, 5] }
      }]
    }]));
    window.localStorage.setItem('cavaquinhoLabActiveSequenceId', 'impossible-csharp-dim');
    window.history.pushState(null, '', '/practice');
    render(<App />);
    await selectPracticeTab('Sequência');

    expect([...document.querySelectorAll('.sequence-note-pills b')].map(note => note.textContent)).toEqual(['C#', 'E', 'G']);
    fireEvent.click(screen.getByRole('button', { name: 'Usar dedilhado 1, 4, 1, 3' }));
    await waitFor(() => {
      const saved = JSON.parse(window.localStorage.getItem('cavaquinhoLabSequences'))[0].steps[0];
      expect(saved.customPosition?.frets || []).toEqual([2, 6, 2, 5]);
      expect(saved.customPosition?.fingers).toEqual([1, 4, 1, 3]);
    });
    expect(window.localStorage.getItem('cavaquinhoLabImpossibleChordShapes:v1')).toBeNull();
  });

  test('salva feedback pessoal e oculta uma forma apenas para o acorde atual', async () => {
    window.localStorage.clear();
    window.localStorage.setItem('cavaquinhoLabSequences', JSON.stringify([{
      id: 'shape-feedback', title: 'C maior', steps: [{ id: 'c', key: 'C', suffix: 'major', positionIndex: 0 }]
    }]));
    window.localStorage.setItem('cavaquinhoLabActiveSequenceId', 'shape-feedback');
    window.history.pushState(null, '', '/practice');
    render(<App />);
    await selectPracticeTab('Sequência');

    const controls = screen.getByLabelText('Formas compatíveis');
    const counter = controls.querySelector('[aria-live="polite"]');
    const currentCandidate = document.querySelector('.sequence-note-pills');
    expect(currentCandidate).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ocultar forma para este acorde' }));
    const savedFeedback = JSON.parse(window.localStorage.getItem('cavaquinhoLabShapeFeedback:v1'));
    expect(Object.values(savedFeedback).some(feedback => Object.values(feedback).includes('hidden'))).toBe(true);
    expect(counter).toBeInTheDocument();
  });

  test('preserva F#13 da partitura, mostra a fórmula e salva uma forma adaptada a partir de uma posição natural', async () => {
    window.localStorage.clear();
    window.localStorage.setItem('cavaquinhoLabSequences', JSON.stringify([{
      id: 'wave-import', title: 'Wave · Antonio Carlos Jobim', steps: [{
        id: 'wave-f-sharp-13', key: 'Gb', displayKey: 'F#', suffix: '13', shapeSuffix: '7', sourceSymbol: 'F#13', measure: 10, positionIndex: null
      }]
    }]));
    window.localStorage.setItem('cavaquinhoLabActiveSequenceId', 'wave-import');
    window.history.pushState(null, '', '/practice');
    render(<App />);

    await selectPracticeTab('Sequência');
    expect(screen.getByRole('heading', { name: 'F#13' })).toBeInTheDocument();
    expect([...document.querySelectorAll('.sequence-note-pills b')].map(note => note.textContent)).toEqual(['F#', 'A#', 'C#', 'E', 'G#', 'D#']);
    expect(document.querySelectorAll('.sequence-note-pills .is-essential')).toHaveLength(3);
    expect([...document.querySelectorAll('.chord-degree-mode .fretboard-note.path-note small')].map(note => note.textContent)).toEqual(expect.arrayContaining(['3', '13']));
    expect(document.querySelector('.sequence-tone-coverage')).toBeNull();
    expect(document.querySelector('.sequence-map-legend')).toBeNull();
    const chordNotes = new Set(['F#', 'G#', 'A#', 'C#', 'D#', 'E']);
    const chordMarkers = [...document.querySelectorAll('.chord-degree-mode .fretboard-note.chord-tone-candidate')];
    expect(chordMarkers.length).toBeGreaterThan(0);
    expect(chordMarkers.every(marker => chordNotes.has(marker.dataset.note))).toBe(true);
    expect(chordMarkers.some(marker => marker.dataset.note === 'Gb' || marker.dataset.note === 'Bb' || marker.dataset.note === 'Db' || marker.dataset.note === 'Eb' || marker.dataset.note === 'Ab')).toBe(false);
    expect(chordMarkers.every(marker => ['1', '3', '5', '♭7', '9', '13'].includes(marker.dataset.degree))).toBe(true);
    const formulaNotes = new Set([...document.querySelectorAll('.sequence-note-pills > span')].map(pill => `${pill.querySelector('small').textContent}:${pill.querySelector('b').textContent}`));
    const selectedMarkers = [...document.querySelectorAll('.chord-degree-mode .fretboard-note.path-note')];
    expect(selectedMarkers.length).toBeGreaterThan(0);
    expect(selectedMarkers.every(marker => formulaNotes.has(`${marker.dataset.degree}:${marker.dataset.note}`))).toBe(true);
    ['A#', 'D#', 'E'].forEach(note => expect(document.querySelector(`.chord-degree-mode .fretboard-note.chord-tone-essential[data-note="${note}"]`)).not.toBeNull());

    const shapeCounter = screen.getByLabelText('Formas compatíveis').querySelector('[aria-live="polite"]');
    const initialShape = shapeCounter.textContent;
    fireEvent.click(screen.getByRole('button', { name: 'Próxima forma' }));
    const keyboardShape = shapeCounter.textContent;
    fireEvent.keyDown(screen.getByRole('button', { name: 'Próxima forma' }), { key: 'ArrowRight' });
    expect(shapeCounter.textContent).not.toBe(keyboardShape);
    fireEvent.keyDown(screen.getByRole('button', { name: 'Forma anterior' }), { key: 'ArrowLeft' });
    expect(shapeCounter.textContent).toBe(keyboardShape);
    let saved = JSON.parse(window.localStorage.getItem('cavaquinhoLabSequences'))[0].steps[0];
    expect(shapeCounter.textContent).not.toBe(initialShape);
    expect(saved.positionIndex).toBeNull();
    expect(saved.customPosition.frets).toHaveLength(4);
    expect(saved.sourceSymbol).toBe('F#13');
    expect(saved.suffix).toBe('13');
    const chosenShapeSuffix = saved.shapeSuffix;

    fireEvent.click(screen.getByRole('button', { name: 'Editar forma' }));
    const noteButton = document.querySelector('.chord-degree-mode .fretboard-note.path-note');
    fireEvent.click(noteButton);
    fireEvent.click(screen.getByRole('button', { name: 'Salvar forma' }));

    saved = JSON.parse(window.localStorage.getItem('cavaquinhoLabSequences'))[0].steps[0];
    expect(saved.customPosition.frets).toHaveLength(4);
    expect(saved.customPosition.frets.every(fret => fret >= -1 && fret <= 12)).toBe(true);
    expect(saved.sourceSymbol).toBe('F#13');
    expect(saved.suffix).toBe('13');
    expect(saved.shapeSuffix).toBe(chosenShapeSuffix);
    expect(screen.getByText('Forma salva nesta sequência.')).toBeInTheDocument();
  });

  test('compartilha a forma escolhida entre acordes repetidos sem alterar a sequência nem as durações', async () => {
    window.localStorage.clear();
    window.localStorage.setItem('cavaquinhoLabSequences', JSON.stringify([{
      id: 'repeated-shape', title: 'Repetições', steps: [
        { id: 'g7-first', key: 'G', suffix: '7', practiceBeats: 2 },
        { id: 'dm', key: 'D', suffix: 'minor', practiceBeats: 3 },
        { id: 'g7-repeat', key: 'G', suffix: '7', practiceBeats: 5 }
      ]
    }]));
    window.localStorage.setItem('cavaquinhoLabActiveSequenceId', 'repeated-shape');
    window.history.pushState(null, '', '/practice');
    render(<App />);
    await selectPracticeTab('Sequência');

    const navigator = screen.getByRole('list', { name: 'Acordes da sequência' });
    expect(within(navigator).getAllByRole('button')).toHaveLength(2);
    expect(within(navigator).getByRole('button', { name: 'G7, 2 ocorrências' })).toBeInTheDocument();
    expect(within(navigator).getByRole('button', { name: 'Dm, 1 ocorrência' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Próxima forma' }));

    const savedSteps = () => JSON.parse(window.localStorage.getItem('cavaquinhoLabSequences'))[0].steps;
    const [first, middle, repeat] = savedSteps();
    expect(first.positionIndex).toBe(repeat.positionIndex);
    expect(first.customPosition).toEqual(repeat.customPosition);
    expect([first.practiceBeats, middle.practiceBeats, repeat.practiceBeats]).toEqual([2, 3, 5]);
    expect([first.key, middle.key, repeat.key]).toEqual(['G', 'D', 'G']);

    fireEvent.click(within(navigator).getByRole('button', { name: 'G7, 2 ocorrências' }));
    const selectedNotes = [...document.querySelectorAll('.fretboard-stage .path-note')]
      .map(note => note.getAttribute('data-position')).sort();
    expect(selectedNotes.length).toBeGreaterThan(0);
    fireEvent.click(within(navigator).getByRole('button', { name: 'G7, 2 ocorrências' }));
    expect([...document.querySelectorAll('.fretboard-stage .path-note')]
      .map(note => note.getAttribute('data-position')).sort()).toEqual(selectedNotes);
  });

  test('prioriza o mesmo desenho de Dm7 depois da forma escolhida de Em7', async () => {
    window.localStorage.clear();
    window.localStorage.setItem('cavaquinhoLabSequences', JSON.stringify([{
      id: 'chromatic-grip-transition', title: 'Em7 para Dm7', steps: [
        { id: 'em7', key: 'E', suffix: 'm7', customPosition: { frets: [5, 4, 3, 2], fingers: [4, 3, 2, 1] }, positionIndex: null },
        { id: 'dm7', key: 'D', suffix: 'm7', customPosition: { frets: [3, 2, 1, 0], fingers: [4, 3, 2, 0] }, positionIndex: null },
        { id: 'dmaj7', key: 'D', suffix: 'maj7', positionIndex: null }
      ]
    }]));
    window.localStorage.setItem('cavaquinhoLabActiveSequenceId', 'chromatic-grip-transition');
    window.history.pushState(null, '', '/practice');
    render(<App />);

    await selectPracticeTab('Sequência');
    const navigator = screen.getByRole('list', { name: 'Acordes da sequência' });
    fireEvent.click(within(navigator).getByRole('button', { name: 'Dm7, 1 ocorrência' }));

    const counter = screen.getByLabelText('Formas compatíveis').querySelector('[aria-live="polite"]');
    expect(counter).toHaveTextContent(/^1\//);
    expect([...document.querySelectorAll('.chord-degree-mode .fretboard-note.path-note')]
      .map(note => note.dataset.position.split(':')[1]).sort()).toEqual(['0', '1', '2', '3']);
  });

  test('marca como tocadas apenas as notas presentes na forma de Dmaj7', async () => {
    window.localStorage.clear();
    window.localStorage.setItem('cavaquinhoLabSequences', JSON.stringify([{
      id: 'dmaj7-note-match', title: 'Dmaj7', steps: [{
        id: 'dmaj7-shape', key: 'D', suffix: 'maj7',
        customPosition: { frets: [0, 2, 3, 4], fingers: [0, 1, 2, 3] }, positionIndex: null
      }]
    }]));
    window.localStorage.setItem('cavaquinhoLabActiveSequenceId', 'dmaj7-note-match');
    window.history.pushState(null, '', '/practice');
    render(<App />);

    await selectPracticeTab('Sequência');
    const playedPills = [...document.querySelectorAll('.sequence-note-pills > span[data-played="true"]')];
    const playedPillNotes = new Set(playedPills.map(pill => pill.querySelector('b').textContent));
    const fretboardNotes = new Set([...document.querySelectorAll('.chord-degree-mode .fretboard-note.path-note')].map(note => note.dataset.note));
    expect(playedPillNotes).toEqual(new Set(['D', 'F#', 'A']));
    expect(fretboardNotes).toEqual(playedPillNotes);

    const cSharpPill = [...document.querySelectorAll('.sequence-note-pills > span')]
      .find(pill => pill.querySelector('b').textContent === 'C#');
    expect(cSharpPill).toHaveClass('is-essential');
    expect(cSharpPill).not.toHaveClass('is-played');
    expect(document.querySelector('.chord-degree-mode .fretboard-note.path-note[data-note="C#"]')).toBeNull();
    expect(document.querySelector('.chord-degree-mode .fretboard-note.chord-tone-essential[data-note="C#"]')).not.toBeNull();
  });

  test('mostra somente formas B9 tocáveis ao percorrer as sugestões', async () => {
    window.localStorage.clear();
    window.localStorage.setItem('cavaquinhoLabSequences', JSON.stringify([{
      id: 'b9-playable-shapes', title: 'B9', steps: [{ id: 'b9', key: 'B', suffix: '9', positionIndex: null }]
    }]));
    window.localStorage.setItem('cavaquinhoLabActiveSequenceId', 'b9-playable-shapes');
    window.history.pushState(null, '', '/practice');
    render(<App />);

    await selectPracticeTab('Sequência');
    const counter = screen.getByLabelText('Formas compatíveis').querySelector('[aria-live="polite"]');
    const suggestionCount = Number(counter.textContent.split('/')[1]);
    const expectedCandidates = getChordShapeCandidates({ key: 'B', suffix: '9' }, cavaquinhoChords);
    expect(suggestionCount).toBeLessThanOrEqual(15);
    expect(suggestionCount).toBeGreaterThan(0);
    expect(groupChordShapeCandidates(expectedCandidates).length).toBeGreaterThan(suggestionCount);
    expect(expectedCandidates.every(candidate => hasPlayableFretSpan(candidate.position))).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Próxima forma' }));
    const playedFrets = [...document.querySelectorAll('.fretboard-note.path-note')]
      .map(note => Number(note.dataset.position.split(':')[1]))
      .filter(fret => fret > 0);
    const fretSpan = playedFrets.length < 2 ? 0 : Math.max(...playedFrets) - Math.min(...playedFrets);
    expect(fretSpan).toBeLessThanOrEqual(4);
  });

  test('mostra a nota da corda solta de E7 sem oferecer a versão abafada como variação', async () => {
    window.localStorage.clear();
    window.localStorage.setItem('cavaquinhoLabSequences', JSON.stringify([{
      id: 'e7-variant-group', title: 'E7', steps: [{
        id: 'e7', key: 'E', suffix: '7', positionIndex: null,
        customPosition: { frets: [2, 1, 3, -1], fingers: [2, 1, 3, 0] }
      }]
    }]));
    window.localStorage.setItem('cavaquinhoLabActiveSequenceId', 'e7-variant-group');
    window.history.pushState(null, '', '/practice');
    render(<App />);
    await selectPracticeTab('Sequência');

    expect(screen.queryByText(/Variações deste desenho/)).not.toBeInTheDocument();
    expect(document.querySelector('.fretboard-open-strings [data-position="3:0"]')).toHaveTextContent('D');
    expect(document.querySelector('.fretboard-open-strings .open-string-muted')).toBeNull();
  });

  test('exibe a forma C7 móvel em Bb7 e salva as casas escolhidas na sequência', async () => {
    window.localStorage.clear();
    window.localStorage.setItem('cavaquinhoLabSequences', JSON.stringify([{
      id: 'bb7-movable-shape', title: 'Bb7', steps: [{ id: 'bb7', key: 'Bb', suffix: '7', positionIndex: null }]
    }]));
    window.localStorage.setItem('cavaquinhoLabActiveSequenceId', 'bb7-movable-shape');
    window.history.pushState(null, '', '/practice');
    render(<App />);

    await selectPracticeTab('Sequência');
    const expectedFrets = '8,7,6,6';
    const expectedCandidates = getChordShapeCandidates({ key: 'Bb', suffix: '7' }, cavaquinhoChords);
    expect(expectedCandidates.some(candidate => candidate.fretKey === expectedFrets)).toBe(true);
    const rankedCandidates = [...expectedCandidates].sort((left, right) =>
      getShapeCandidateRankingScore(left) - getShapeCandidateRankingScore(right)
      || right.playedCount - left.playedCount
      || left.fretKey.localeCompare(right.fretKey));
    const expectedGroupIndex = groupChordShapeCandidates(rankedCandidates)
      .findIndex(group => group.variants.some(candidate => candidate.fretKey === expectedFrets));
    expect(expectedGroupIndex).toBeGreaterThanOrEqual(0);
    const controls = screen.getByLabelText('Formas compatíveis');
    const next = within(controls).getByRole('button', { name: 'Próxima forma' });
    const counter = controls.querySelector('[aria-live="polite"]');
    const currentIndex = Number(counter.textContent.split('/')[0]) - 1;
    const groupCount = Number(counter.textContent.split('/')[1]);
    for (let step = 0; step < (expectedGroupIndex - currentIndex + groupCount) % groupCount; step += 1) fireEvent.click(next);
    const currentFrets = [...document.querySelectorAll('.chord-degree-mode .fretboard-note.path-note')]
      .map(note => Number(note.dataset.position.split(':')[1])).join(',');
    if (currentFrets !== expectedFrets) {
      const variantsSummary = within(controls).queryByText(/Variações deste desenho/);
      if (variantsSummary) fireEvent.click(variantsSummary);
      fireEvent.click(within(controls).getByRole('button', { name: `Usar variação nas casas ${expectedFrets.replaceAll(',', ', ')}` }));
    } else {
      fireEvent.click(next);
      fireEvent.click(within(controls).getByRole('button', { name: 'Forma anterior' }));
    }
    const selected = [...document.querySelectorAll('.chord-degree-mode .fretboard-note.path-note')]
      .map(note => note.dataset.position).sort().join(',');
    expect(selected).toBe(['0:8', '1:7', '2:6', '3:6'].sort().join(','));
    const selectedMarkers = [...document.querySelectorAll('.chord-degree-mode .fretboard-note.path-note')];
    expect(selectedMarkers).toHaveLength(4);
    expect(selectedMarkers.every(note => note.classList.contains('highlighted'))).toBe(true);
    const saved = JSON.parse(window.localStorage.getItem('cavaquinhoLabSequences'))[0].steps[0];
    if (saved.customPosition) expect(saved.customPosition.frets).toEqual([8, 7, 6, 6]);
    else expect(Number.isInteger(saved.positionIndex)).toBe(true);
    const positionCounter = controls.querySelector('[aria-live="polite"]');
    const [indexText, totalText] = positionCounter.textContent.split('/');
    const nextIndex = Number(indexText) % Number(totalText) + 1;
    fireEvent.click(positionCounter);
    expect(controls).toHaveFocus();
    fireEvent.keyDown(controls, { key: 'ArrowRight' });
    expect(positionCounter).toHaveTextContent(`${nextIndex}/${totalText}`);
  });

  test('mantém as quatro notas tocadas destacadas ao reabrir uma forma escolhida de Gm6', async () => {
    const candidates = getChordShapeCandidates({ key: 'G', suffix: 'm6' }, cavaquinhoChords);
    const selected = candidates.find(candidate => candidate.playedCount === 4);
    window.localStorage.clear();
    window.localStorage.setItem('cavaquinhoLabSequences', JSON.stringify([{
      id: 'gm6-shape-highlight', title: 'Gm6', steps: [{
        id: 'gm6', key: 'G', suffix: 'm6', shapeSuffix: selected.shapeSuffix, positionIndex: null,
        customPosition: { frets: getAbsoluteFrets(selected.position), fingers: [...selected.position.fingers] }
      }]
    }]));
    window.localStorage.setItem('cavaquinhoLabActiveSequenceId', 'gm6-shape-highlight');
    window.history.pushState(null, '', '/practice');
    render(<App />);

    await selectPracticeTab('Sequência');
    const played = [...document.querySelectorAll('.chord-degree-mode .fretboard-note.path-note')];
    expect(played).toHaveLength(4);
    expect(played.every(note => note.classList.contains('highlighted'))).toBe(true);
    expect(played.map(note => Number(note.dataset.position.split(':')[1])).join(','))
      .toBe(getAbsoluteFrets(selected.position).join(','));
  });

  test('ativa a troca de forma pelo espaço do acorde e edita o braço pelo teclado', async () => {
    window.localStorage.clear();
    window.localStorage.setItem('cavaquinhoLabSequences', JSON.stringify([{
      id: 'keyboard-shape', title: 'B7b9 no teclado', steps: [{
        id: 'b7b9', key: 'B', suffix: '7b9', positionIndex: null,
        customPosition: { frets: [1, 2, 1, 4], fingers: [1, 2, 3, 4] }
      }]
    }]));
    window.localStorage.setItem('cavaquinhoLabActiveSequenceId', 'keyboard-shape');
    window.history.pushState(null, '', '/practice');
    render(<App />);

    await selectPracticeTab('Sequência');
    const workspace = document.querySelector('.sequence-chord-workspace');
    const counter = screen.getByLabelText('Formas compatíveis').querySelector('[aria-live="polite"]');
    const originalCounter = counter.textContent;
    fireEvent.click(screen.getByRole('heading', { name: 'B7b9' }));
    expect(workspace).toHaveFocus();
    fireEvent.keyDown(workspace, { key: 'ArrowRight' });
    expect(counter.textContent).not.toBe(originalCounter);

    const afterHeading = counter.textContent;
    fireEvent.click(document.querySelector('.sequence-note-pills > span'));
    expect(workspace).toHaveFocus();
    fireEvent.keyDown(workspace, { key: 'ArrowLeft' });
    expect(counter.textContent).not.toBe(afterHeading);

    const nextShape = screen.getByRole('button', { name: 'Próxima forma' });
    nextShape.focus();
    const beforeArrowControl = counter.textContent;
    fireEvent.keyDown(nextShape, { key: 'ArrowRight' });
    expect(counter.textContent).not.toBe(beforeArrowControl);

    fireEvent.click(screen.getByRole('button', { name: 'Editar forma' }));
    await waitFor(() => expect(document.activeElement).toHaveClass('fretboard-note'));
    const focusedBeforeMove = document.activeElement;
    const [stringIndex, fret] = focusedBeforeMove.getAttribute('data-position').split(':').map(Number);
    const availableFrets = [...document.querySelectorAll('button.fretboard-note')]
      .map(button => button.getAttribute('data-position').split(':').map(Number))
      .filter(([candidateString]) => candidateString === stringIndex)
      .map(([, candidateFret]) => candidateFret);
    const direction = availableFrets.some(candidateFret => candidateFret > fret) ? 'ArrowRight' : 'ArrowLeft';
    fireEvent.keyDown(focusedBeforeMove, { key: direction });
    expect(document.activeElement).toHaveClass('fretboard-note');
    expect(document.activeElement).not.toBe(focusedBeforeMove);
    const focusedPosition = document.activeElement.getAttribute('data-position');
    fireEvent.keyDown(document.activeElement, { key: 'Enter' });
    await waitFor(() => expect(document.querySelector('.fretboard-note.path-note[data-position="' + focusedPosition + '"]')).not.toBeNull());
  });

  test('ordena a fórmula de D9, identifica A como nota escolhida e salva a forma preferida', async () => {
    window.localStorage.clear();
    window.localStorage.setItem('cavaquinhoLabSequences', JSON.stringify([{
      id: 'd9-test', title: 'D9', steps: [{ id: 'd9', key: 'D', suffix: '9', positionIndex: 0 }]
    }]));
    window.localStorage.setItem('cavaquinhoLabActiveSequenceId', 'd9-test');
    window.history.pushState(null, '', '/practice');
    render(<App />);

    await selectPracticeTab('Sequência');
    expect([...document.querySelectorAll('.sequence-note-pills small')].map(note => note.textContent))
      .toEqual(['1', '3', '5', '♭7', '9']);
    expect(document.querySelector('.sequence-chord-workspace')).not.toHaveTextContent('notas ·');
    const selectedA = document.querySelector('.chord-degree-mode .fretboard-note.path-note[data-note="A"]');
    expect(selectedA).not.toBeNull();
    expect(selectedA).toHaveAttribute('aria-label', expect.stringContaining('Na forma'));
    expect(selectedA.querySelector('small')).toHaveTextContent('5');

    fireEvent.click(screen.getByRole('button', { name: 'Próxima forma' }));
    expect(window.localStorage.getItem('cavaquinhoLabRecentChordShapes:v1')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Marcar forma como preferida' }));
    expect(screen.getByRole('button', { name: 'Remover forma dos preferidos' })).toHaveAttribute('aria-pressed', 'true');
    expect(window.localStorage.getItem('cavaquinhoLabPreferredChordShapes:v1')).toContain('D:9');
    expect(screen.queryByText('Formas salvas')).not.toBeInTheDocument();
    expect(screen.queryByText('Preferidas')).not.toBeInTheDocument();
    expect(screen.queryByText('Recentes')).not.toBeInTheDocument();
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
