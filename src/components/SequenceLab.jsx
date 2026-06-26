import { useEffect, useMemo, useState } from 'react';
import { formatChordName, getPlayedNotesText, qualityLabels } from '../chordDisplay';
import { cavaquinhoChords, getAvailableSuffixes } from '../domain/chords';
import { analyzeSequence, buildExercises, getColorForChord } from '../harmony';
import { optimizeSequence } from '../progressionOptimizer';
import { chromaticKeys, createSequence, createSequenceStep, defaultSequences, reorderSequence } from '../sequences';
import { activeSequenceStorageKey, diagramModeStorageKey, loadActiveSequenceId, loadDiagramMode, loadSequences, sequencesStorageKey } from '../storage';
import ChordDiagram from './ChordDiagram';

const colorModes = [
  { id: 'graus', label: 'Graus da escala' },
  { id: 'desligado', label: 'Desligado' },
  { id: 'notas', label: 'Notas cromáticas' },
  { id: 'qualidade', label: 'Qualidade do acorde' },
  { id: 'funcao', label: 'Função harmônica' },
  { id: 'personalizadas', label: 'Cores personalizadas' }
];

const wrapIndex = (index, length) => (index + length) % length;

const getSequenceText = (steps) => steps.map(step => formatChordName(step.key, step.suffix)).join(' → ');

function SequenceManager({ sequences, activeSequenceId, setActiveSequenceId, createNewSequence, deleteSequence }) {
  return (
    <div className="sequence-manager" aria-label="Minhas sequências">
      <div className="sequence-tabs">
        {sequences.map(sequence => (
          <button key={sequence.id} type="button" className={sequence.id === activeSequenceId ? 'sequence-tab active' : 'sequence-tab'} onClick={() => setActiveSequenceId(sequence.id)}>
            {sequence.title}
          </button>
        ))}
      </div>
      <button type="button" className="new-sequence-button" onClick={createNewSequence}>+ Nova sequência</button>
      <button type="button" className="delete-sequence-button" onClick={deleteSequence} disabled={sequences.length === 1} aria-label="Excluir sequência atual">×</button>
    </div>
  );
}

function DisplayModeToggle({ diagramMode, setDiagramMode }) {
  return (
    <div className="segmented-control" aria-label="Conteúdo das bolinhas">
      <button type="button" className={diagramMode === 'notes' ? 'active' : ''} onClick={() => setDiagramMode('notes')}>Notas</button>
      <button type="button" className={diagramMode === 'fingers' ? 'active' : ''} onClick={() => setDiagramMode('fingers')}>Dedos</button>
    </div>
  );
}

function SequenceHeader({ sequence, setTitle, diagramMode, setDiagramMode, colorMode, setColorMode }) {
  return (
    <header className="lab-header">
      <div>
        <p className="eyebrow">Prática interativa</p>
        <input className="sequence-title-input" aria-label="Nome da sequência" value={sequence.title} onChange={(event) => setTitle(event.target.value)} />
        <div className="sequence-path" aria-label="Sequência atual">{getSequenceText(sequence.steps)}</div>
      </div>
      <div className="lab-controls">
        <DisplayModeToggle diagramMode={diagramMode} setDiagramMode={setDiagramMode} />
        <label><span>Cor</span><select aria-label="Modo de cor" value={colorMode} onChange={(event) => setColorMode(event.target.value)}>{colorModes.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
      </div>
    </header>
  );
}

function SequenceCard({ step, index, total, optimizedStep, analysisChord, color, diagramMode, updateStep, moveStep, removeStep, cycleShape, releaseShape }) {
  const suffixes = getAvailableSuffixes(step.key);
  const isManual = Number.isInteger(step.positionIndex);
  const chordName = formatChordName(step.key, step.suffix);

  return (
    <article className="lab-card" style={{ '--swatch': color }}>
      <header className="lab-card-header">
        <div>
          <span className="scale-degree">{analysisChord?.numeral || 'grau aberto'}</span>
          <h3>{chordName}</h3>
        </div>
        <div className="card-actions">
          <button type="button" aria-label={'Mover acorde ' + (index + 1) + ' para cima'} disabled={index === 0} onClick={() => moveStep(index, index - 1)}>↑</button>
          <button type="button" aria-label={'Mover acorde ' + (index + 1) + ' para baixo'} disabled={index === total - 1} onClick={() => moveStep(index, index + 1)}>↓</button>
          <button type="button" aria-label={'Remover acorde ' + (index + 1)} disabled={total === 1} onClick={() => removeStep(index)}>×</button>
        </div>
      </header>

      <div className="quality-row">
        <span className="voice-badge">Voz completa</span>
        <span className="function-badge">{analysisChord?.functionName || 'em estudo'}</span>
      </div>

      <div className="lab-card-controls">
        <label><span>Raiz</span><select aria-label={'Raiz do acorde ' + (index + 1)} value={step.key} onChange={(event) => updateStep(index, { key: event.target.value, suffix: getAvailableSuffixes(event.target.value)[0] || 'major' })}>{chromaticKeys.map(key => <option key={key} value={key}>{key}</option>)}</select></label>
        <label><span>Qualidade</span><select aria-label={'Qualidade do acorde ' + (index + 1)} value={step.suffix} onChange={(event) => updateStep(index, { suffix: event.target.value })}>{suffixes.map(suffix => <option key={suffix} value={suffix}>{qualityLabels[suffix] || suffix}</option>)}</select></label>
      </div>

      {optimizedStep ? (
        <div className="diagram-stage">
          <button type="button" className="shape-hover-control previous" aria-label={'Forma anterior do acorde ' + (index + 1)} onClick={() => cycleShape(index, -1)}>‹</button>
          <ChordDiagram position={optimizedStep.position} name={chordName} mode={diagramMode} />
          <button type="button" className="shape-hover-control next" aria-label={'Próxima forma do acorde ' + (index + 1)} onClick={() => cycleShape(index, 1)}>›</button>
        </div>
      ) : null}

      <footer className="lab-card-footer">
        <span>Forma {optimizedStep ? optimizedStep.positionIndex + 1 : '-'} de {optimizedStep ? optimizedStep.chord.positions.length : '-'}</span>
        <span>Notas: {optimizedStep ? getPlayedNotesText(optimizedStep.position) : '-'}</span>
        {isManual ? <button type="button" className="inline-auto" onClick={() => releaseShape(index)}>Automático</button> : null}
      </footer>
    </article>
  );
}

function LabSummary({ analysis, exercises, sequence, colorMode }) {
  return (
    <aside className="lab-summary">
      <section>
        <h2>Teoria</h2>
        <p>{analysis.summary}</p>
        <p>{analysis.tension}</p>
      </section>
      <section>
        <h2>Harmonia em Cores</h2>
        <p>As cores são presets de estudo. Elas ajudam a enxergar função, grau e qualidade sem afirmar que uma nota tem cor universal.</p>
        <div className="color-timeline" aria-label="Linha de cores da sequência">
          {sequence.steps.map((step, index) => <span key={step.id} style={{ '--swatch': getColorForChord(step, analysis.chords[index], colorMode, analysis.keyCenter) }}>{formatChordName(step.key, step.suffix)}</span>)}
        </div>
      </section>
      <section>
        <h2>Exercícios</h2>
        <div className="exercise-list">
          {exercises.slice(0, 4).map(exercise => (
            <details key={exercise.title}>
              <summary>{exercise.prompt}</summary>
              <p>{exercise.answer}</p>
            </details>
          ))}
        </div>
      </section>
    </aside>
  );
}

function SequenceLab() {
  const [sequences, setSequences] = useState(loadSequences);
  const [activeSequenceId, setActiveSequenceId] = useState(() => loadActiveSequenceId(loadSequences()));
  const [diagramMode, setDiagramMode] = useState(loadDiagramMode);
  const [colorMode, setColorMode] = useState('graus');

  const activeSequence = sequences.find(sequence => sequence.id === activeSequenceId) || sequences[0] || defaultSequences[0];
  const optimized = useMemo(() => optimizeSequence(activeSequence.steps, cavaquinhoChords), [activeSequence.steps]);
  const analysis = useMemo(() => analyzeSequence(activeSequence.steps, optimized.steps), [activeSequence.steps, optimized.steps]);
  const exercises = useMemo(() => buildExercises(activeSequence.steps, analysis, optimized.steps), [activeSequence.steps, analysis, optimized.steps]);

  useEffect(() => {
    window.localStorage.setItem(sequencesStorageKey, JSON.stringify(sequences));
  }, [sequences]);

  useEffect(() => {
    window.localStorage.setItem(activeSequenceStorageKey, activeSequence.id);
  }, [activeSequence.id]);

  useEffect(() => {
    window.localStorage.setItem(diagramModeStorageKey, diagramMode);
  }, [diagramMode]);

  const updateActiveSequence = (updater) => {
    setSequences(current => current.map(sequence => sequence.id === activeSequence.id ? updater(sequence) : sequence));
  };

  const setTitle = (title) => updateActiveSequence(sequence => ({ ...sequence, title }));

  const updateStep = (index, patch) => updateActiveSequence(sequence => ({
    ...sequence,
    steps: sequence.steps.map((step, stepIndex) => stepIndex === index ? { ...step, ...patch, positionIndex: null } : step)
  }));

  const moveStep = (fromIndex, toIndex) => updateActiveSequence(sequence => ({ ...sequence, steps: reorderSequence(sequence.steps, fromIndex, toIndex) }));
  const addStep = () => updateActiveSequence(sequence => ({ ...sequence, steps: sequence.steps.concat(createSequenceStep(sequence.steps.length + 1)) }));
  const removeStep = (index) => updateActiveSequence(sequence => ({ ...sequence, steps: sequence.steps.length === 1 ? sequence.steps : sequence.steps.filter((_step, stepIndex) => stepIndex !== index) }));

  const cycleShape = (index, direction) => {
    const step = optimized.steps[index];
    if (!step) return;
    updateActiveSequence(sequence => ({
      ...sequence,
      steps: sequence.steps.map((item, itemIndex) => itemIndex === index
        ? { ...item, positionIndex: wrapIndex(step.positionIndex + direction, step.chord.positions.length) }
        : item)
    }));
  };

  const releaseShape = (index) => updateActiveSequence(sequence => ({
    ...sequence,
    steps: sequence.steps.map((item, itemIndex) => itemIndex === index ? { ...item, positionIndex: null } : item)
  }));

  const createNewSequence = () => {
    const sequence = createSequence(Date.now());
    setSequences(current => current.concat(sequence));
    setActiveSequenceId(sequence.id);
  };

  const deleteSequence = () => {
    if (sequences.length === 1) return;
    const next = sequences.filter(sequence => sequence.id !== activeSequence.id);
    setSequences(next);
    setActiveSequenceId(next[0].id);
  };

  return (
    <section className="sequence-lab">
      <SequenceManager sequences={sequences} activeSequenceId={activeSequence.id} setActiveSequenceId={setActiveSequenceId} createNewSequence={createNewSequence} deleteSequence={deleteSequence} />
      <SequenceHeader sequence={activeSequence} setTitle={setTitle} diagramMode={diagramMode} setDiagramMode={setDiagramMode} colorMode={colorMode} setColorMode={setColorMode} />
      {optimized.missing.length > 0 ? <p className="missing">Dados ausentes para {optimized.missing.map(step => formatChordName(step.key, step.suffix)).join(', ')}.</p> : (
        <div className="lab-grid">
          <div className="lab-card-row" aria-label="Acordes da sequência">
            {optimized.steps.map((step, index) => (
              <SequenceCard
                key={activeSequence.steps[index].id}
                step={activeSequence.steps[index]}
                index={index}
                total={activeSequence.steps.length}
                optimizedStep={step}
                analysisChord={analysis.chords[index]}
                color={getColorForChord(activeSequence.steps[index], analysis.chords[index], colorMode, analysis.keyCenter)}
                diagramMode={diagramMode}
                updateStep={updateStep}
                moveStep={moveStep}
                removeStep={removeStep}
                cycleShape={cycleShape}
                releaseShape={releaseShape}
              />
            ))}
            <button type="button" className="add-lab-card" onClick={addStep}>+<span>Adicionar acorde</span></button>
          </div>
          <LabSummary analysis={analysis} exercises={exercises} sequence={activeSequence} colorMode={colorMode} />
        </div>
      )}
    </section>
  );
}

export default SequenceLab;
