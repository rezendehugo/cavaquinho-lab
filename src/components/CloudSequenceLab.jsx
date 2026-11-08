import SequenceLab from './SequenceLab';
import { useCloudSequences } from '../hooks/useCloudSequences';

export default function CloudSequenceLab() {
  const cloud = useCloudSequences();
  if (cloud.status === 'loading') return <section className="panel"><p>Carregando suas sequências…</p></section>;
  return <SequenceLab cloud={cloud} />;
}
