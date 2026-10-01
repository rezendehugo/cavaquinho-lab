import { useState } from 'react';
import { readStorage, writeStorage } from '../storage';
import { emptyStudy, normalizeStudy, studyStorageKey } from '../domain/sequenceStudy';

export function loadSequenceStudy(id) {
  try { return normalizeStudy(JSON.parse(readStorage(studyStorageKey(id)).value)); }
  catch { return emptyStudy(); }
}

export default function useSequenceStudy(id) {
  const [drafts, setDrafts] = useState({});
  const [statuses, setStatuses] = useState({});
  const setStatus = value => setStatuses(current => ({ ...current, [id]: value }));
  const study = drafts[id] || loadSequenceStudy(id);
  const save = next => {
    setDrafts(current => ({ ...current, [id]: next }));
    const ok = writeStorage(studyStorageKey(id), JSON.stringify(next)).ok;
    setStatus(ok ? 'Salvo neste navegador.' : 'Não foi possível salvar. Exporte o PDF para guardar suas anotações.');
    return ok;
  };
  return { study, status: statuses[id] || '', update: (key, value) => save({ ...study, [key]: value }), record: bpm => {
    const next = { ...study, sessions: [{ ...Object.fromEntries(['intention', 'observation', 'connection', 'nextStep'].map(key => [key, study[key]])), date: new Date().toISOString(), bpm }, ...study.sessions].slice(0, 20) };
    if (save(next)) setStatus('Sessão registrada. Compare suas descobertas na próxima prática.');
  } };
}
