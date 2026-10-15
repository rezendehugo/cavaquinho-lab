import { useEffect, useRef, useState } from 'react';
import { formatChordName, formatQualityOption, formatRootOption, qualityLabels } from '../chordDisplay';
import ChordLegendStrip from '../components/ChordLegendStrip';
import ChordShapeCard from '../components/ChordShapeCard';
import ShapeStudyPanel from '../components/ShapeStudyPanel';
import { getAvailableSuffixes, cavaquinhoChords } from '../domain/chords';
import { analyzeChordVoicing, getVoicingCompleteness } from '../domain/chordTheory';
import { findChord } from '../progressionOptimizer';
import { chromaticKeys } from '../sequences';

function getVisibleStatuses(chord, key) {
  if (!chord) return [];
  const statuses = chord.positions
    .map((position) =>
      getVoicingCompleteness(analyzeChordVoicing({ key, suffix: chord.suffix }, position))
    )
    .filter(Boolean);
  return [...new Map(statuses.map((status) => [status.id, status])).values()];
}

function ShapesPage() {
  const [key, setKey] = useState('C');
  const [suffix, setSuffix] = useState('major');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [comparisonIndex, setComparisonIndex] = useState(0);
  const shapeGridRef = useRef(null);
  const suffixes = getAvailableSuffixes(key);
  const chord = findChord(cavaquinhoChords, key, suffix) || findChord(cavaquinhoChords, key, suffixes[0]);
  const visibleStatuses = getVisibleStatuses(chord, key);

  useEffect(() => {
    if (!suffixes.includes(suffix)) setSuffix(suffixes[0] || 'major');
  }, [key, suffix, suffixes]);

  useEffect(() => {
    setSelectedIndex(0);
    setComparisonIndex(0);
  }, [key, suffix]);

  const selectShape = index => {
    const nextIndex = (index + (chord?.positions.length || 1)) % (chord?.positions.length || 1);
    setSelectedIndex(nextIndex);
    setComparisonIndex(nextIndex);
    requestAnimationFrame(() => shapeGridRef.current?.querySelector(`[data-shape-index="${nextIndex}"]`)?.focus());
  };

  const moveShapeFocus = event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key) || !chord?.positions.length) return;
    event.preventDefault();
    const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? chord.positions.length - 1 : selectedIndex + (event.key === 'ArrowRight' ? 1 : -1);
    selectShape(nextIndex);
  };

  return (
    <section className="panel">
      <div className="section-title">
        <div>
          <h2>Formas de acorde</h2>
          <p>Escolha um acorde e compare todas as posições disponíveis para cavaquinho.</p>
        </div>
      </div>
      <div className="compact-controls">
        <label><span>Raiz</span><select aria-label="Escolher raiz" value={key} onChange={(event) => setKey(event.target.value)}>{chromaticKeys.map(item => <option key={item} value={item}>{formatRootOption(item)}</option>)}</select></label>
        <label><span>Qualidade</span><select aria-label="Escolher qualidade" value={suffix} onChange={(event) => setSuffix(event.target.value)}>{suffixes.map(item => <option key={item} value={item} aria-label={qualityLabels[item] || item}>{formatQualityOption(item)}</option>)}</select></label>
      </div>
      <div className="shape-results-heading" aria-live="polite">
        <h3>{formatRootOption(key)}{formatQualityOption(chord?.suffix || suffix)} · {chord?.positions.length || 0} formas</h3>
        <p className="shape-study-context">Em estudo: forma {selectedIndex + 1}. Compare as demais apenas quando quiser outra região do braço ou uma troca mais confortável.</p>
      </div>
      <ChordLegendStrip chordKey={key} chordSuffix={chord?.suffix || suffix} statuses={visibleStatuses} />
      <div ref={shapeGridRef} className="shape-grid wide" role="group" aria-label="Formas disponíveis" onKeyDown={moveShapeFocus}>
        {(chord?.positions || []).map((position, index) => (
          <ChordShapeCard
            key={index}
            chordName={formatChordName(key, chord.suffix)}
            chordKey={key}
            chordSuffix={chord.suffix}
            position={position}
            shapeIndex={index}
            shapeTotal={chord.positions.length}
            voicingStatus={getVoicingCompleteness(analyzeChordVoicing({ key, suffix: chord.suffix }, position))}
            className={selectedIndex === index ? 'is-selected' : ''}
            actions={<button type="button" data-shape-index={index} tabIndex={selectedIndex === index ? 0 : -1} className="shape-study-button" aria-pressed={selectedIndex === index} onClick={() => { setSelectedIndex(index); setComparisonIndex(index); }}>Estudar</button>}
          />
        ))}
      </div>
      <ShapeStudyPanel
        chordKey={key}
        chordSuffix={chord?.suffix || suffix}
        reference={chord?.positions?.[selectedIndex]}
        candidate={chord?.positions?.[comparisonIndex]}
        referenceIndex={selectedIndex}
        candidateIndex={comparisonIndex}
        onCandidateChange={setComparisonIndex}
        positions={chord?.positions || []}
      />
    </section>
  );
}

export default ShapesPage;
