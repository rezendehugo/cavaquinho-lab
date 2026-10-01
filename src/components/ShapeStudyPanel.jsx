import ChordDiagram from './ChordDiagram';
import { compareChordShapes, getChordDegreeLegend, getChordFormulaLegend } from '../domain/chordTheory';
import { formatChordName } from '../chordDisplay';

const degreeText = degree => `${degree.degreeLabel} ${degree.note}`;

export default function ShapeStudyPanel({ chordKey, chordSuffix, reference, candidate, referenceIndex, candidateIndex, onCandidateChange, positions }) {
  if (!reference) return null;
  const chordName = formatChordName(chordKey, chordSuffix);
  const formula = getChordFormulaLegend(chordKey, chordSuffix);
  const sounding = getChordDegreeLegend(chordKey, chordSuffix, reference);
  const comparison = candidate ? compareChordShapes({ key: chordKey, suffix: chordSuffix }, reference, candidate) : null;

  return <aside className="shape-study-panel" aria-labelledby="shape-study-title">
    <header>
      <p className="eyebrow">Estude esta forma</p>
      <h3 id="shape-study-title">{chordName} · forma {referenceIndex + 1}</h3>
      <p>Veja os graus que soam e compare uma mudança real no braço.</p>
    </header>
    <div className="shape-study-layout">
      <div className="shape-study-diagram">
        <ChordDiagram position={reference} name={chordName} chordKey={chordKey} chordSuffix={chordSuffix} mode="degrees" />
        <p className="shape-study-caption">Os círculos mostram grau e nota. Cordas abertas e abafadas continuam visíveis.</p>
      </div>
      <div className="shape-study-details">
        <section aria-label="Fórmula do acorde"><h4>Fórmula</h4><p>{formula.map(degreeText).join(' · ')}</p></section>
        <section aria-label="Notas que soam"><h4>Esta digitação</h4><p>{sounding.map(degreeText).join(' · ') || 'Nenhuma nota soando.'}</p></section>
        <label className="shape-study-select"><span>Comparar com</span><select aria-label="Comparar forma" value={candidateIndex} onChange={event => onCandidateChange(Number(event.target.value))}>{positions.map((_position, index) => <option key={index} value={index}>Forma {index + 1}{index === referenceIndex ? ' — referência' : ''}</option>)}</select></label>
      </div>
    </div>
    {comparison ? <section className="shape-comparison" aria-live="polite">
      <h4>O que muda</h4>
      <p><strong>Entram:</strong> {comparison.added.length ? comparison.added.map(degreeText).join(' · ') : 'nenhum grau novo'}.</p>
      <p><strong>Saem:</strong> {comparison.removed.length ? comparison.removed.map(degreeText).join(' · ') : 'nenhum grau removido'}.</p>
      <div className="shape-movement-list" aria-label="Movimento em cada corda">
        {comparison.strings.map(change => <p key={change.stringIndex}><strong>Corda {change.stringIndex + 1}:</strong> {change.description}</p>)}
      </div>
      <p className="shape-comparison-note">A distância mostra a troca geométrica na mesma corda. Barrés e dedos ainda precisam ser conferidos antes de chamar a troca de “um dedo”.</p>
    </section> : null}
  </aside>;
}
