export const studyFields = [
  { key: 'intention', label: 'O que quero melhorar hoje?', placeholder: 'Ex.: trocar de Dm para A7 sem interromper o pulso.' },
  { key: 'observation', label: 'O que ouvi e percebi ao tocar?', placeholder: 'Qual troca ficou limpa? Onde perdi o pulso ou senti tensão?' },
  { key: 'connection', label: 'Que conexão descobri?', placeholder: 'Uma nota comum, uma função harmônica ou algo que já aprendi em outra música.' },
  { key: 'nextStep', label: 'Qual será meu próximo experimento?', placeholder: 'Ex.: isolar dois acordes, reduzir o andamento e comparar novamente.' }
];
export const emptyStudy = () => ({ intention: '', observation: '', connection: '', nextStep: '', sessions: [] });
export function normalizeStudy(value) {
  const result = emptyStudy();
  for (const { key } of studyFields) result[key] = typeof value?.[key] === 'string' ? value[key].slice(0, 1600) : '';
  result.sessions = Array.isArray(value?.sessions) ? value.sessions.filter(item => item && typeof item.date === 'string').slice(0, 20).map(item => ({
    date: item.date, bpm: Number(item.bpm) || 60,
    ...Object.fromEntries(studyFields.map(({ key }) => [key, typeof item[key] === 'string' ? item[key].slice(0, 1600) : '']))
  })) : [];
  return result;
}
export const studyStorageKey = id => `cavaquinhoLabStudy:${id}`;
