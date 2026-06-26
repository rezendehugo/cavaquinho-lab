import { useEffect, useMemo, useState } from 'react';
import ChordBlockExport from '@tombatossals/react-chords/lib/Chord/ChordBlock/index.js';
import cavaquinhoChords from '@tombatossals/chords-db/lib/cavaquinho.json';
import { formatChordName, getPlayedNotesText, qualityLabels } from './chordDisplay';
import { analyzeSequence, buildExercises, getColorForChord } from './harmony';
import { findChord, optimizeSequence } from './progressionOptimizer';
import { chromaticKeys, createSequenceStep, defaultSequence, normalizeSequence, reorderSequence, suffixCycle } from './sequences';

const ChordBlock = ChordBlockExport.default || ChordBlockExport;

const instrument = {
  strings: 4,
  fretsOnChord: 6,
  name: 'Cavaquinho',
  keys: [],
  tunings: { standard: ['D', 'G', 'B', 'D'] }
};

const routes = [
  { path: '/cavaquinho', label: 'Cavaquinho' },
  { path: '/cavaquinho/shapes', label: 'Formas' },
  { path: '/cavaquinho/sequences', label: 'Sequências' },
  { path: '/cavaquinho/fretboard', label: 'Braço' },
  { path: '/cavaquinho/practice', label: 'Prática' }
];

const colorModes = [
  { id: 'graus', label: 'Graus da escala' },
  { id: 'desligado', label: 'Desligado' },
  { id: 'notas', label: 'Notas cromáticas' },
  { id: 'qualidade', label: 'Qualidade do acorde' },
  { id: 'funcao', label: 'Função harmônica' },
  { id: 'personalizadas', label: 'Cores personalizadas' }
];

const storageKey = 'cavaquinhoLabSequence';

const wrapIndex = (index, length) => (index + length) % length;
const getAvailableSuffixes = (key) => suffixCycle.filter(suffix => findChord(cavaquinhoChords, key, suffix)?.positions.length > 0);
const getInitialRoute = () => window.location.hash.replace('#', '') || '/cavaquinho/sequences';

const loadSequence = () => {
  try {
    const saved = window.localStorage.getItem(storageKey);
    return saved ? normalizeSequence(JSON.parse(saved)) : defaultSequence;
  } catch (_error) {
    return defaultSequence;
  }
};

function NavTabs({ route }) {
  return (
    <nav className="tabs" aria-label="Navegação principal">
      {routes.map(item => (
        <a key={item.path} href={'#' + item.path} className={route === item.path ? 'active' : ''}>{item.label}</a>
      ))}
    </nav>
  );
}

function HomePage() {
  return (
    <section className="panel intro-panel">
      <h2>Estudo focado em cavaquinho</h2>
      <p>Explore formas, monte sequências, compare caminhos no braço e use teoria aplicada para transformar acordes em prática musical.</p>
      <div className="intro-grid">
        <article><strong>Formas</strong><span>Veja desenhos reais do banco de acordes.</span></article>
        <article><strong>Sequências</strong><span>Monte caminhos e reduza movimentos entre acordes.</span></article>
        <article><strong>Prática</strong><span>Use perguntas guiadas para estudar com intenção.</span></article>
      </div>
    </section>
  );
}

function ShapesPage() {
  const [key, setKey] = useState('C');
  const [suffix, setSuffix] = useState('major');
  const suffixes = getAvailableSuffixes(key);
  const chord = findChord(cavaquinhoChords, key, suffix) || findChord(cavaquinhoChords, key, suffixes[0]);

  useEffect(() => {
    if (!suffixes.includes(suffix)) setSuffix(suffixes[0] || 'major');
  }, [key, suffix, suffixes]);

  return (
    <section className="panel">
      <div className="section-title">
        <div>
          <h2>Formas de acorde</h2>
          <p>Escolha um acorde e compare todas as posições disponíveis para cavaquinho.</p>
        </div>
      </div>
      <div className="compact-controls">
        <label><span>Raiz</span><select aria-label="Escolher raiz" value={key} onChange={(event) => setKey(event.target.value)}>{chromaticKeys.map(item => <option key={item} value={item}>{item}</option>)}</select></label>
        <label><span>Qualidade</span><select aria-label="Escolher qualidade" value={suffix} onChange={(event) => setSuffix(event.target.value)}>{suffixes.map(item => <option key={item} value={item}>{qualityLabels[item] || item}</option>)}</select></label>
      </div>
      <div className="shape-grid wide">
        {(chord?.positions || []).map((position, index) => (
          <article key={index} className="shape-card">
            <header><strong>{formatChordName(key, chord.suffix)}</strong><span>Posição {index + 1} de {chord.positions.length}</span></header>
            <ChordBlock instrument={instrument} position={position} name={formatChordName(key, chord.suffix)} />
            <footer>Notas: {getPlayedNotesText(position)}</footer>
          </article>
        ))}
      </div>
    </section>
  );
}

function SequenceBuilder({ sequence, setSequence, optimized }) {
  const updateStep = (index, patch) => {
    setSequence(current => current.map((step, stepIndex) => stepIndex === index ? { ...step, ...patch, positionIndex: null } : step));
  };

  const cycleShape = (index, direction) => {
    const step = optimized.steps[index];
    if (!step) return;
    setSequence(current => current.map((item, itemIndex) => itemIndex === index
      ? { ...item, positionIndex: wrapIndex(step.positionIndex + direction, step.chord.positions.length) }
      : item));
  };

  const releaseShape = (index) => {
    setSequence(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, positionIndex: null } : item));
  };

  const moveStep = (fromIndex, toIndex) => setSequence(current => reorderSequence(current, fromIndex, toIndex));
  const addStep = () => setSequence(current => current.concat(createSequenceStep(current.length + 1)));
  const removeStep = (index) => setSequence(current => current.length === 1 ? current : current.filter((_step, stepIndex) => stepIndex !== index));

  return (
    <section className="panel sequence-builder-panel">
      <div className="section-title compact-title">
        <div>
          <h2>Construtor de Sequência</h2>
          <p>Monte a ordem dos acordes e ajuste cada forma sem transformar o estudo em formulário.</p>
        </div>
        <button type="button" className="ghost-action" onClick={() => setSequence(defaultSequence)}>Limpar</button>
      </div>
      <div className="pill-row" aria-label="Sequência atual">
        {sequence.map((step, index) => (
          <span key={step.id} className="chord-pill">{formatChordName(step.key, step.suffix)}{index < sequence.length - 1 ? <b>→</b> : null}</span>
        ))}
      </div>
      <div className="sequence-card-list" aria-label="Acordes da sequência">
        {sequence.map((step, index) => {
          const suffixes = getAvailableSuffixes(step.key);
          const optimizedStep = optimized.steps[index];
          const isManual = Number.isInteger(step.positionIndex);
          return (
            <article key={step.id} className="sequence-card">
              <header className="sequence-card-header">
                <button type="button" className="drag-handle" aria-label={'Acorde ' + (index + 1) + ' na sequência'}>⋮⋮</button>
                <div>
                  <strong>{formatChordName(step.key, step.suffix)}</strong>
                  <span>{isManual ? 'Manual' : 'Automático'}{optimizedStep ? ' · Forma ' + (optimizedStep.positionIndex + 1) + '/' + optimizedStep.chord.positions.length : ''}</span>
                </div>
                <div className="card-icon-actions">
                  <button type="button" aria-label={'Mover acorde ' + (index + 1) + ' para cima'} disabled={index === 0} onClick={() => moveStep(index, index - 1)}>↑</button>
                  <button type="button" aria-label={'Mover acorde ' + (index + 1) + ' para baixo'} disabled={index === sequence.length - 1} onClick={() => moveStep(index, index + 1)}>↓</button>
                  <button type="button" aria-label={'Remover acorde ' + (index + 1)} disabled={sequence.length === 1} onClick={() => removeStep(index)}>×</button>
                </div>
              </header>
              <div className="sequence-card-controls">
                <label><span>Raiz</span><select aria-label={'Raiz do acorde ' + (index + 1)} value={step.key} onChange={(event) => updateStep(index, { key: event.target.value, suffix: getAvailableSuffixes(event.target.value)[0] || 'major' })}>{chromaticKeys.map(key => <option key={key} value={key}>{key}</option>)}</select></label>
                <label><span>Qualidade</span><select aria-label={'Qualidade do acorde ' + (index + 1)} value={step.suffix} onChange={(event) => updateStep(index, { suffix: event.target.value })}>{suffixes.map(suffix => <option key={suffix} value={suffix}>{qualityLabels[suffix] || suffix}</option>)}</select></label>
              </div>
              {optimizedStep ? (
                <div className="sequence-card-meta">
                  <span>Notas: {getPlayedNotesText(optimizedStep.position)}</span>
                  <span>{index === optimized.steps.length - 1 ? 'Último acorde' : 'Movimento: ' + optimized.transitions[index].toFixed(1)}</span>
                </div>
              ) : null}
            </article>
          );
        })}
        <button type="button" className="add-sequence-card" onClick={addStep}>+<span>Adicionar acorde</span></button>
      </div>
      <ShapeOptimizer sequence={sequence} optimized={optimized} cycleShape={cycleShape} releaseShape={releaseShape} />
    </section>
  );
}
function ShapeOptimizer({ sequence, optimized, cycleShape, releaseShape }) {
  if (optimized.missing.length > 0) {
    return <p className="missing">Dados ausentes para {optimized.missing.map(step => formatChordName(step.key, step.suffix)).join(', ')}.</p>;
  }
  return (
    <section className="optimizer-block" aria-label="Otimizador de Formas">
      <div className="score-card">
        <h2>Otimizador de Formas</h2>
        <p>Movimento total: <strong>{optimized.totalScore.toFixed(1)}</strong></p>
      </div>
      <div className="shape-grid">
        {optimized.steps.map((step, index) => {
          const isManual = Number.isInteger(sequence[index].positionIndex);
          return (
            <article key={sequence[index].id} className="shape-card">
              <header>
                <strong>{formatChordName(step.key, step.suffix)}</strong>
                <span>{isManual ? 'Manual' : 'Automático'} · Posição {step.positionIndex + 1} de {step.chord.positions.length}</span>
              </header>
              <ChordBlock instrument={instrument} position={step.position} name={formatChordName(step.key, step.suffix)} />
              <p>Notas: {getPlayedNotesText(step.position)}</p>
              <p>{index === optimized.steps.length - 1 ? 'Último acorde' : 'Movimento para o próximo: ' + optimized.transitions[index].toFixed(1)}</p>
              <div className="shape-actions">
                <button type="button" aria-label={'Forma anterior do acorde ' + (index + 1)} onClick={() => cycleShape(index, -1)}>‹</button>
                <button type="button" className="secondary" onClick={() => releaseShape(index)} disabled={!isManual}>Automático</button>
                <button type="button" aria-label={'Próxima forma do acorde ' + (index + 1)} onClick={() => cycleShape(index, 1)}>›</button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function TheoryPanel({ sequence, analysis }) {
  return (
    <section className="panel">
      <h2>Painel de Teoria</h2>
      <p>{analysis.summary}</p>
      <p>{analysis.tension}</p>
      <div className="study-grid">
        {analysis.chords.map(chord => (
          <article key={chord.id}>
            <h3>{chord.name}</h3>
            <p>{chord.numeral} · {chord.functionName}</p>
            <p>{chord.advice}</p>
          </article>
        ))}
      </div>
      {sequence.map(step => formatChordName(step.key, step.suffix)).join(' → ') === 'Ebmaj7 → D7 → Gm' ? <p>Em G menor: bVImaj7 → V7 → i. D7 cria tensão dominante e resolve em Gm. Ebmaj7 adiciona cor antes da resolução dominante.</p> : null}
    </section>
  );
}

function ExercisesPanel({ exercises }) {
  return (
    <section className="panel">
      <h2>Painel de Exercícios</h2>
      <div className="study-grid">
        {exercises.map(exercise => (
          <article key={exercise.title}>
            <h3>{exercise.title}</h3>
            <p>{exercise.prompt}</p>
            <details><summary>Ver resposta</summary><p>{exercise.answer}</p></details>
          </article>
        ))}
      </div>
    </section>
  );
}

function ColorHarmonyPanel({ sequence, analysis }) {
  const [mode, setMode] = useState('graus');
  return (
    <section className="panel">
      <div className="section-title">
        <div>
          <h2>Painel de Harmonia em Cores</h2>
          <p>As cores são presets de estudo e podem mudar conforme o contexto; uma nota não tem uma cor universal.</p>
        </div>
        <label><span>Modo de cor</span><select aria-label="Modo de cor" value={mode} onChange={(event) => setMode(event.target.value)}>{colorModes.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
      </div>
      <div className="color-timeline" aria-label="Linha de cores da sequência">
        {sequence.map((step, index) => {
          const color = getColorForChord(step, analysis.chords[index], mode, analysis.keyCenter);
          return <span key={step.id} style={{ '--swatch': color }}>{formatChordName(step.key, step.suffix)}</span>;
        })}
      </div>
      <div className="study-grid">
        {sequence.map((step, index) => {
          const color = getColorForChord(step, analysis.chords[index], mode, analysis.keyCenter);
          return (
            <article key={step.id} className="color-card" style={{ '--swatch': color }}>
              <h3>{formatChordName(step.key, step.suffix)}</h3>
              <p>Raiz: {step.key}</p>
              <p>Qualidade: {qualityLabels[step.suffix] || step.suffix}</p>
              <p>Função: {analysis.chords[index]?.functionName || 'em estudo'}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function SequencesPage() {
  const [sequence, setSequence] = useState(loadSequence);
  const optimized = useMemo(() => optimizeSequence(sequence, cavaquinhoChords), [sequence]);
  const analysis = useMemo(() => analyzeSequence(sequence, optimized.steps), [sequence, optimized.steps]);
  const exercises = useMemo(() => buildExercises(sequence, analysis, optimized.steps), [sequence, analysis, optimized.steps]);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(sequence));
  }, [sequence]);

  return (
    <>
      <SequenceBuilder sequence={sequence} setSequence={setSequence} optimized={optimized} />
      <TheoryPanel sequence={sequence} analysis={analysis} />
      <ExercisesPanel exercises={exercises} />
      <ColorHarmonyPanel sequence={sequence} analysis={analysis} />
    </>
  );
}

function FretboardPage() {
  return <section className="panel"><h2>Braço</h2><p>Mapa de estudo para localizar notas e regiões do cavaquinho. Use as formas e sequências para observar onde sua mão permanece mais confortável.</p></section>;
}

function PracticePage() {
  return <section className="panel"><h2>Prática</h2><p>Escolha uma sequência, toque devagar, identifique notas comuns e aumente o andamento apenas quando a troca estiver limpa.</p></section>;
}

function App() {
  const [route, setRoute] = useState(getInitialRoute);
  useEffect(() => {
    const handleHash = () => setRoute(getInitialRoute());
    window.addEventListener('hashchange', handleHash);
    if (!window.location.hash) window.location.hash = '#/cavaquinho/sequences';
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const page = route === '/cavaquinho/shapes' ? <ShapesPage />
    : route === '/cavaquinho/sequences' ? <SequencesPage />
      : route === '/cavaquinho/fretboard' ? <FretboardPage />
        : route === '/cavaquinho/practice' ? <PracticePage />
          : <HomePage />;

  return (
    <main className="app-shell">
      <header className="hero">
        <p className="eyebrow">Cavaquinho Lab</p>
        <h1>Estudo prático de acordes, formas e sequências.</h1>
        <p>Um laboratório para estudar cavaquinho com diagramas reais, análise harmônica, cores de apoio e exercícios guiados.</p>
        <NavTabs route={route} />
      </header>
      {page}
    </main>
  );
}

export default App;