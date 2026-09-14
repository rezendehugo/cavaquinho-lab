import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { normalizeSequences } from '../sequences';
import { loadSequences } from '../storage';
import { createApiClient } from '../services/apiClient';
import { createProductApi } from '../services/productApi';

const toUuid = value => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value) ? value : crypto.randomUUID();
const toApiSequence = sequence => ({ ...sequence, id: toUuid(sequence.id), steps: sequence.steps.map(step => ({ ...step, id: toUuid(step.id) })) });

export function useCloudSequences() {
  const auth = useAuth();
  const api = useMemo(() => createProductApi(createApiClient(auth.getToken)), [auth.getToken]);
  const [remote, setRemote] = useState(null);
  const [entitlements, setEntitlements] = useState(null);
  const [profile, setProfile] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const revisions = useRef(new Map());

  const reload = useCallback(async () => {
    if (!auth.user) return;
    setStatus('loading');
    try {
      const [{ items }, account] = await Promise.all([api.listSequences(), api.me()]);
      items.forEach(item => revisions.current.set(item.id, item.revision));
      setRemote(normalizeSequences(items));
      setEntitlements(account.entitlements);
      setProfile(account.profile);
      setStatus('ready');
    } catch (cause) { setError(cause.code || 'sync_failed'); setStatus('error'); }
  }, [api, auth.user]);

  useEffect(() => { reload(); }, [reload]);

  const migrate = useCallback(async () => {
    const local = loadSequences().map(toApiSequence);
    try { await api.migrateLocal(local); await reload(); return true; }
    catch (cause) { setError(cause.code || 'migration_failed'); return false; }
  }, [api, reload]);

  const save = useCallback(async sequences => {
    try {
      const remoteIds = new Set((remote || []).map(item => item.id));
      for (const sequence of sequences) {
        const revision = revisions.current.get(sequence.id);
        const result = revision
          ? await api.updateSequence({ ...sequence, revision })
          : await api.createSequence(toApiSequence(sequence));
        revisions.current.set(result.id, result.revision);
        remoteIds.delete(sequence.id);
      }
      for (const id of remoteIds) await api.deleteSequence(id);
      const { items } = await api.listSequences();
      items.forEach(item => revisions.current.set(item.id, item.revision));
      setRemote(normalizeSequences(items));
      setError('');
      return true;
    } catch (cause) { setError(cause.code || 'sync_failed'); return false; }
  }, [api, remote]);

  return { sequences: remote, entitlements, profile, status, error, migrate, reload, save };
}
