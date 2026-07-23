import { useEffect, useState } from 'react';
import { formatChordName, qualityLabels } from '../chordDisplay';
import ChordShapeCard from '../components/ChordShapeCard';
import { getAvailableSuffixes, cavaquinhoChords } from '../domain/chords';
import { analyzeChordVoicing, getVoicingCompleteness } from '../domain/chordTheory';
import { findChord } from '../progressionOptimizer';
import { chromaticKeys } from '../sequences';

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
      <div className="shape-results-heading" aria-live="polite">
        <h3>{formatChordName(key, chord?.suffix || suffix)} {qualityLabels[chord?.suffix || suffix]?.toLowerCase()} · {chord?.positions.length || 0} formas</h3>
        <span>Compare as posições abaixo</span>
      </div>
      <div className="voicing-status-legend" aria-label="Legenda dos voicings">
        <span><i className="voicing-status-dot voicing-status-dot--complete" />Completo</span>
        <span><i className="voicing-status-dot voicing-status-dot--incomplete" />Omite notas</span>
        <span><i className="voicing-status-dot voicing-status-dot--rootless" />Sem raiz</span>
        <span><i className="voicing-status-dot voicing-status-dot--additional" />Notas adicionais</span>
      </div>
      <div className="shape-grid wide">
        {(chord?.positions || []).map((position, index) => (
          <ChordShapeCard
            key={index}
            chordName={formatChordName(key, chord.suffix)}
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
