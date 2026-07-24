import { useEffect, useState } from 'react';
import { formatChordName, formatQualityOption, qualityLabels } from '../chordDisplay';
import ChordLegendStrip from '../components/ChordLegendStrip';
import ChordShapeCard from '../components/ChordShapeCard';
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
  const suffixes = getAvailableSuffixes(key);
  const chord = findChord(cavaquinhoChords, key, suffix) || findChord(cavaquinhoChords, key, suffixes[0]);
  const visibleStatuses = getVisibleStatuses(chord, key);

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
        <label><span>Qualidade</span><select aria-label="Escolher qualidade" value={suffix} onChange={(event) => setSuffix(event.target.value)}>{suffixes.map(item => <option key={item} value={item} aria-label={qualityLabels[item] || item}>{formatQualityOption(item)}</option>)}</select></label>
      </div>
      <div className="shape-results-heading" aria-live="polite">
        <h3>{formatChordName(key, chord?.suffix || suffix)} · {chord?.positions.length || 0} formas</h3>
      </div>
      <ChordLegendStrip chordKey={key} chordSuffix={chord?.suffix || suffix} statuses={visibleStatuses} />
      <div className="shape-grid wide">
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
          />
        ))}
      </div>
    </section>
  );
}

export default ShapesPage;
