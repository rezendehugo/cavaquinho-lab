/* global console, fetch, process */
import { spawnSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const frontendUrl = (process.env.CAVAQUINHO_FRONTEND_URL ?? 'http://127.0.0.1:5173/cavaquinho-lab/').replace(/\/$/, '/');
const apiUrl = (process.env.CAVAQUINHO_API_URL ?? 'http://127.0.0.1:8080').replace(/\/$/, '');
const origins = (process.env.CAVAQUINHO_FRONTEND_ORIGINS ?? 'http://127.0.0.1:5173,http://127.0.0.1:4180')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

const sampleMusicXml = runId => `<?xml version="1.0" encoding="UTF-8"?><score-partwise version="3.1"><work><work-title>Stack check ${runId}</work-title></work><part-list><score-part id="P1"><part-name>Stack check</part-name></score-part></part-list><part id="P1"><measure number="1"><attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes><harmony><root><root-step>C</root-step></root><kind>major</kind></harmony><note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration></note></measure></part></score-partwise>`;

async function waitForJson(url, label, attempts = 45) {
  let lastError = 'not_ready';
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return response.json();
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await delay(1_000);
  }
  throw new Error(`${label} is unavailable at ${url}: ${lastError}`);
}

async function requireResponse(url, label) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${label} returned HTTP ${response.status}`);
  return response;
}

async function request(path, options = {}) {
  const headers = { authorization: 'Bearer dev:stack-health-check', ...options.headers };
  if (options.body !== undefined && !headers['content-type']) headers['content-type'] = 'application/json';
  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers
  });
  if (!response.ok) throw new Error(`${path} returned HTTP ${response.status}: ${await response.text()}`);
  return response.status === 204 ? null : response.json();
}

function requireContainerHealth(service, command) {
  const result = spawnSync('docker', ['compose', 'exec', '-T', service, ...command], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`${service} health check failed: ${result.stderr || result.stdout}`);
}

async function verifyCors() {
  for (const origin of origins) {
    const response = await fetch(`${apiUrl}/v1/score-imports/musicxml`, {
      method: 'OPTIONS',
      headers: {
        origin,
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'authorization, content-type'
      }
    });
    if (response.status !== 204 || response.headers.get('access-control-allow-origin') !== origin) {
      throw new Error(`API CORS does not allow ${origin}`);
    }
  }
}

async function verifyImportFeature() {
  const created = await request('/v1/score-imports/musicxml', {
    method: 'POST',
    body: JSON.stringify({ fileName: 'stack-health.musicxml', content: sampleMusicXml(Date.now()) })
  });
  const id = created?.item?.id;
  if (!id) throw new Error('Score import did not return an identifier.');
  try {
    const validated = await request(`/v1/score-imports/${id}/validate`, { method: 'POST' });
    if (validated.status !== 'ready') throw new Error(`Score import did not become ready: ${validated.status}`);
    const practice = await request(`/v1/score-imports/${id}/create-practice`, {
      method: 'POST',
      body: JSON.stringify({ targets: ['sequence', 'melody'] })
    });
    if (!practice.sequence?.steps?.length || !practice.melody?.events?.length) {
      throw new Error('Score import did not create sequence and melody practice artifacts.');
    }
  } finally {
    const cleanup = await fetch(`${apiUrl}/v1/score-imports/${id}`, {
      method: 'DELETE', headers: { authorization: 'Bearer dev:stack-health-check' }
    });
    if (!cleanup.ok) console.warn(`Could not remove stack verification import ${id}: HTTP ${cleanup.status}`);
  }
}

await requireResponse(frontendUrl, 'Frontend');
const health = await waitForJson(`${apiUrl}/api/health`, 'API health');
const ready = await waitForJson(`${apiUrl}/api/ready`, 'API readiness');
if (health.status !== 'ok' || ready.status !== 'ready' || !ready.omrEnabled) throw new Error('API did not report a ready OMR-enabled service.');

requireContainerHealth('postgres', ['pg_isready', '-U', 'cavaquinho', '-d', 'cavaquinho_lab']);
requireContainerHealth('omr-worker', ['python', '-c', "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8090/health', timeout=5).read()"]);
await verifyCors();
await verifyImportFeature();

console.log(`Stack verified:\n  Frontend: ${frontendUrl}\n  API:      ${apiUrl}\n  Origins:  ${origins.join(', ')}\n  Features: score import, validation, sequence practice, melody practice`);
