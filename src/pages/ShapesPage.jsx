import { useEffect, useState } from 'react';
import { formatChordName, getPlayedNotesText, qualityLabels } from '../chordDisplay';
import ChordDiagram from '../components/ChordDiagram';
import { getAvailableSuffixes, cavaquinhoChords } from '../domain/chords';
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
      <div className="shape-grid wide">
        {(chord?.positions || []).map((position, index) => (
          <article key={index} className="shape-card">
            <header><strong>{formatChordName(key, chord.suffix)}</strong><span>Forma {index + 1} de {chord.positions.length}</span></header>
            <ChordDiagram position={position} name={formatChordName(key, chord.suffix)} mode="notes" />
            <footer>Notas: {getPlayedNotesText(position)}</footer>
          </article>
        ))}
      </div>
    </section>
  );
}

export default ShapesPage;
