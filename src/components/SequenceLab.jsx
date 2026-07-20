import { useEffect, useMemo, useState } from 'react';
import { formatChordName } from '../chordDisplay';
import { cavaquinhoChords, getAvailableSuffixes } from '../domain/chords';
import { analyzeSequence, buildExercises, getColorForChord } from '../harmony';
import { findChord, optimizeSequence } from '../progressionOptimizer';
import { chromaticKeys, createSequence, createSequenceStep, defaultSequences, reorderSequence, suffixCycle } from '../sequences';
import { activeSequenceStorageKey, loadActiveSequenceId, loadSequences, sequencesStorageKey } from '../storage';
import { AddChordSlot, AddSequenceButton } from './SequenceActions';
import SequenceChordStep from './SequenceChordStep';
import { Trash2 } from 'lucide-react';

const colorModes = [
  { id: 'graus', label: 'Graus da escala' },
  { id: 'desligado', label: 'Desligado' },
  { id: 'notas', label: 'Notas cromáticas' },
  { id: 'qualidade', label: 'Qualidade do acorde' },
  { id: 'funcao', label: 'Função harmônica' },
  { id: 'personalizadas', label: 'Cores personalizadas' }
];

const wrapIndex = (index, length) => (index + length) % length;
const getSequenceText = (steps) => steps.length ? steps.map(step => formatChordName(step.key, step.suffix)).join(' → ') : 'Nenhum acorde ainda';

const getNextValue = (values, currentValue, direction) => values[wrapIndex(values.indexOf(currentValue) + direction, values.length)];

const getNextSuffix = (key, currentSuffix, direction) => {
  const available = suffixCycle.filter(suffix => getAvailableSuffixes(key).includes(suffix));
  if (!available.length) return currentSuffix;
  const currentIndex = available.includes(currentSuffix) ? available.indexOf(currentSuffix) : 0;
  return available[wrapIndex(currentIndex + direction, available.length)];
};

const getValidPositionIndex = (step, chord) => Number.isInteger(step.positionIndex) && step.positionIndex >= 0 && step.positionIndex < chord.positions.length ? step.positionIndex : 0;

const resolveSequenceShape = (step) => {
  const chord = findChord(cavaquinhoChords, step.key, step.suffix);
  if (!chord?.positions.length) return null;
  const positionIndex = getValidPositionIndex(step, chord);
  return { ...step, chord, positionIndex, position: chord.positions[positionIndex] };
};

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
      <AddSequenceButton onClick={createNewSequence} />
      <button type="button" className="delete-sequence-button icon-button" onClick={deleteSequence} disabled={sequences.length === 1} aria-label="Excluir sequência atual" title="Excluir sequência atual">
        <Trash2 aria-hidden="true" size={16} strokeWidth={2.1} />
      </button>
    </div>
  );
}

function SequenceHeader({ sequence, setTitle, colorMode, setColorMode }) {
  return (
    <header className="lab-header">
      <div>
        <p className="eyebrow">Prática interativa</p>
        <input className="sequence-title-input" aria-label="Nome da sequência" value={sequence.title} onChange={(event) => setTitle(event.target.value)} />
        <div className="sequence-path" aria-label="Sequência atual">{getSequenceText(sequence.steps)}</div>
      </div>
      <div className="lab-controls">
        <label><span>Cor</span><select aria-label="Modo de cor" value={colorMode} onChange={(event) => setColorMode(event.target.value)}>{colorModes.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
      </div>
    </header>
  );
}

function EmptySequence({ addStep }) {
  return (
    <div className="empty-sequence">
      <AddChordSlot onClick={addStep} />
    </div>
  );
}

function LabSummary({ analysis, exercises, sequence, colorMode }) {
  return (
    <div className="study-sections" aria-label="Estudo da sequência">
      <section>
        <h2>Teoria</h2>
        <p>{analysis.summary}</p>
        <p>{analysis.tension}</p>
        <p>As faixas coloridas no topo dos cards são guias de estudo. Elas ajudam a comparar grau, função ou qualidade sem afirmar que uma nota tem uma cor universal.</p>
        {analysis.chords.length ? <p>{analysis.chords.map(chord => chord.name + ': ' + chord.advice).join(' ')}</p> : <p>Adicione acordes para ver análise de função, tensão e notas comuns.</p>}
      </section>
      <section>
        <h2>Harmonia em Cores</h2>
        <p>Escolha um modo de cor para enxergar a sequência por grau, nota, qualidade ou função harmônica.</p>
        <div className="color-timeline" aria-label="Linha de cores da sequência">
          {sequence.steps.length ? sequence.steps.map((step, index) => <span key={step.id} style={{ '--swatch': getColorForChord(step, analysis.chords[index], colorMode, analysis.keyCenter) }}>{formatChordName(step.key, step.suffix)}</span>) : <span style={{ '--swatch': '#d7dde5' }}>Sem acordes</span>}
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
    </div>
  );
}

function SequenceLab() {
  const [sequences, setSequences] = useState(loadSequences);
  const [activeSequenceId, setActiveSequenceId] = useState(() => loadActiveSequenceId(loadSequences()));
  const [colorMode, setColorMode] = useState('graus');

  const activeSequence = sequences.find(sequence => sequence.id === activeSequenceId) || sequences[0] || defaultSequences[0];
  const optimized = useMemo(() => optimizeSequence(activeSequence.steps, cavaquinhoChords), [activeSequence.steps]);
  const sequenceShapes = useMemo(() => activeSequence.steps.map(resolveSequenceShape), [activeSequence.steps]);
  const missingShapes = activeSequence.steps.filter((_step, index) => !sequenceShapes[index]);
  const analysis = useMemo(() => analyzeSequence(activeSequence.steps, optimized.steps), [activeSequence.steps, optimized.steps]);
  const exercises = useMemo(() => buildExercises(activeSequence.steps, analysis, optimized.steps), [activeSequence.steps, analysis, optimized.steps]);

  useEffect(() => {
    window.localStorage.setItem(sequencesStorageKey, JSON.stringify(sequences));
  }, [sequences]);

  useEffect(() => {
    window.localStorage.setItem(activeSequenceStorageKey, activeSequence.id);
  }, [activeSequence.id]);

  const updateActiveSequence = (updater) => {
    setSequences(current => current.map(sequence => sequence.id === activeSequence.id ? updater(sequence) : sequence));
  };

  const setTitle = (title) => updateActiveSequence(sequence => ({ ...sequence, title }));

  const updateStep = (index, patch) => updateActiveSequence(sequence => ({
    ...sequence,
    steps: sequence.steps.map((step, stepIndex) => stepIndex === index ? { ...step, ...patch, positionIndex: null } : step)
  }));

  const moveStep = (fromIndex, toIndex) => updateActiveSequence(sequence => ({ ...sequence, steps: reorderSequence(sequence.steps, fromIndex, toIndex) }));
  const moveStepById = (stepId, toIndex) => {
    const fromIndex = activeSequence.steps.findIndex(step => step.id === stepId);
    if (fromIndex < 0 || fromIndex === toIndex) return;
    moveStep(fromIndex, toIndex);
  };
  const addStep = () => updateActiveSequence(sequence => ({ ...sequence, steps: sequence.steps.concat(createSequenceStep(sequence.steps.length + 1)) }));
  const removeStep = (index) => updateActiveSequence(sequence => ({ ...sequence, steps: sequence.steps.filter((_step, stepIndex) => stepIndex !== index) }));

  const cycleRoot = (index, direction) => {
    const current = activeSequence.steps[index];
    const key = getNextValue(chromaticKeys, current.key, direction);
    const suffixes = getAvailableSuffixes(key);
    updateStep(index, { key, suffix: suffixes.includes(current.suffix) ? current.suffix : (suffixes[0] || 'major') });
  };

  const cycleSuffix = (index, direction) => {
    const current = activeSequence.steps[index];
    updateStep(index, { suffix: getNextSuffix(current.key, current.suffix, direction) });
  };

  const setChordIdentity = (index, key, suffix) => updateStep(index, { key, suffix });
  const setChordSuffix = (index, suffix) => updateStep(index, { suffix });

  const cycleShape = (index, direction) => {
    const step = sequenceShapes[index];
    if (!step) return;
    updateActiveSequence(sequence => ({
      ...sequence,
      steps: sequence.steps.map((item, itemIndex) => itemIndex === index
        ? { ...item, positionIndex: wrapIndex(step.positionIndex + direction, step.chord.positions.length) }
        : item)
    }));
  };

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
    <>
      <section className="sequence-lab">
        <SequenceManager sequences={sequences} activeSequenceId={activeSequence.id} setActiveSequenceId={setActiveSequenceId} createNewSequence={createNewSequence} deleteSequence={deleteSequence} />
        <SequenceHeader sequence={activeSequence} setTitle={setTitle} colorMode={colorMode} setColorMode={setColorMode} />
        {missingShapes.length > 0 ? <p className="missing">Dados ausentes para {missingShapes.map(step => formatChordName(step.key, step.suffix)).join(', ')}.</p> : (
          activeSequence.steps.length === 0 ? <EmptySequence addStep={addStep} /> : (
            <div className="lab-card-row" aria-label="Acordes da sequência">
              {sequenceShapes.map((step, index) => (
                <SequenceChordStep
                  key={activeSequence.steps[index].id}
                  step={activeSequence.steps[index]}
                  index={index}
                  optimizedStep={step}
                  analysisChord={analysis.chords[index]}
                  color={getColorForChord(activeSequence.steps[index], analysis.chords[index], colorMode, analysis.keyCenter)}
                  moveStepById={moveStepById}
                  removeStep={removeStep}
                  cycleRoot={cycleRoot}
                  cycleSuffix={cycleSuffix}
                  cycleShape={cycleShape}
                  availableSuffixes={getAvailableSuffixes}
                  setChordIdentity={setChordIdentity}
                  setChordSuffix={setChordSuffix}
                />
              ))}
              <AddChordSlot onClick={addStep} />
            </div>
          )
        )}
      </section>
      <LabSummary analysis={analysis} exercises={exercises} sequence={activeSequence} colorMode={colorMode} />
    </>
  );
}

export default SequenceLab;
