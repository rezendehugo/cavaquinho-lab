const apiBase = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8080').replace(/\/$/, '');

function getAuthorization() {
  if (import.meta.env.DEV) return 'Bearer dev:local-user';
  const token = sessionStorage.getItem('cavaquinhoLabAccessToken');
  return token ? `Bearer ${token}` : '';
}

async function apiRequest(path, options = {}) {
  let response;
  const headers = { authorization: getAuthorization(), ...options.headers };
  if (options.body !== undefined && !headers['content-type']) headers['content-type'] = 'application/json';
  try {
    response = await fetch(`${apiBase}${path}`, {
      ...options,
      headers
    });
  } catch {
    throw new Error('api_unavailable');
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || 'Não foi possível concluir a importação.');
  }
  return response.status === 204 ? null : response.json();
}

async function sha256(file) {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, '0')).join('');
}

const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

function resolveApiUrl(path) {
  return /^https?:\/\//.test(path) ? path : `${apiBase}${path.startsWith('/') ? path : `/${path}`}`;
}

async function apiIsReachable() {
  try {
    const response = await fetch(`${apiBase}/api/health`, { cache: 'no-store' });
    return response.ok;
  } catch {
    return false;
  }
}

export async function importMusicXml(file, content = null) {
  return apiRequest('/v1/score-imports/musicxml', { method: 'POST', body: JSON.stringify({ fileName: file.name, content: content ?? await file.text() }) });
}

export async function uploadScore(file) {
  const checksum = await sha256(file);
  const contentType = file.type || (file.name.toLowerCase().endsWith('.pdf')
    ? 'application/pdf'
    : file.name.toLowerCase().endsWith('.mxl') ? 'application/vnd.recordare.musicxml' : 'application/xml');
  const ticket = await apiRequest('/v1/score-imports/upload-url', {
    method: 'POST',
    body: JSON.stringify({ fileName: file.name, contentType, size: file.size, sha256: checksum })
  });
  let upload;
  try {
    upload = await fetch(resolveApiUrl(ticket.uploadUrl), {
      method: 'PUT',
      headers: { 'content-type': contentType },
      body: file
    });
  } catch {
    throw new Error(await apiIsReachable() ? 'upload_transport_blocked' : 'api_unavailable');
  }
  if (!upload.ok) {
    const payload = await upload.json().catch(() => ({}));
    throw new Error(payload.error || `upload_http_${upload.status}`);
  }
  return apiRequest('/v1/score-imports', {
    method: 'POST',
    body: JSON.stringify({
      sourceType: file.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'musicxml',
      originalName: file.name,
      storageKey: ticket.storageKey,
      sha256: checksum
    })
  });
}

export async function waitForScoreImport(id, { timeoutMs = 150_000, onProgress } = {}) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const result = await apiRequest(`/v1/score-imports/${id}`);
    onProgress?.(result.item.status);
    if (['draft', 'needs_correction', 'ready'].includes(result.item.status) && result.draft) return result;
    if (result.item.status === 'failed') throw new Error(result.item.lastErrorCode || 'A conversão da partitura falhou.');
    await delay(1_000);
  }
  throw new Error('A conversão excedeu o tempo esperado. Você pode tentar novamente.');
}

export const getScoreImport = id => apiRequest(`/v1/score-imports/${id}`);
export const listScoreImports = ({ limit = 20, before = '' } = {}) => apiRequest(
  `/v1/score-imports?limit=${limit}${before ? `&before=${encodeURIComponent(before)}` : ''}`
);
export async function getScoreSourceUrl(id) {
  const result = await apiRequest(`/v1/score-imports/${id}/source-url`);
  return resolveApiUrl(result.url);
}

export const updateScoreMeasure = (id, number, payload) => apiRequest(`/v1/score-imports/${id}/measures/${number}`, {
  method: 'PATCH',
  body: JSON.stringify(payload)
});
export const validateScoreImport = id => apiRequest(`/v1/score-imports/${id}/validate`, { method: 'POST' });
export const retryScoreImport = id => apiRequest(`/v1/score-imports/${id}/retry`, { method: 'POST' });
export const deleteScoreImport = id => apiRequest(`/v1/score-imports/${id}`, { method: 'DELETE' });
export const createScorePractice = (id, options = {}) => apiRequest(`/v1/score-imports/${id}/create-practice`, {
  method: 'POST',
  body: JSON.stringify({ targets: options.targets ?? ['sequence', 'melody'], range: options.range })
});
