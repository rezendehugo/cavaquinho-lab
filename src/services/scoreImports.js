const apiBase = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8080').replace(/\/$/, '');

function getAuthorization() {
  if (import.meta.env.DEV) return 'Bearer dev:local-user';
  const token = sessionStorage.getItem('cavaquinhoLabAccessToken');
  return token ? `Bearer ${token}` : '';
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: { 'content-type': 'application/json', authorization: getAuthorization(), ...options.headers }
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || 'Não foi possível concluir a importação.');
  }
  return response.status === 204 ? null : response.json();
}

export async function importMusicXml(file, content = null) {
  return apiRequest('/v1/score-imports/musicxml', { method: 'POST', body: JSON.stringify({ fileName: file.name, content: content ?? await file.text() }) });
}
export const validateScoreImport = id => apiRequest(`/v1/score-imports/${id}/validate`, { method: 'POST' });
export const createScorePractice = id => apiRequest(`/v1/score-imports/${id}/create-practice`, { method: 'POST', body: JSON.stringify({ targets: ['sequence', 'melody'] }) });
