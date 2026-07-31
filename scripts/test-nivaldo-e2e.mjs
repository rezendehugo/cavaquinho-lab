/* global console, fetch, process */
import { realpathSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const source = process.env.NIVALDO_NO_CHORO_PDF;
if (!source) {
  console.log('Nivaldo browser journey skipped: set NIVALDO_NO_CHORO_PDF.');
  process.exit(0);
}

async function requireHealth(url, service) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
  } catch (error) {
    throw new Error(`${service} is unavailable at ${url}: ${error.message}`, { cause: error });
  }
}

await requireHealth('http://127.0.0.1:8080/api/health', 'Import API');
await requireHealth('http://127.0.0.1:5173/cavaquinho-lab/', 'Vite frontend');
const worker = spawnSync('docker', [
  'compose', 'exec', '-T', 'omr-worker', 'python', '-c',
  "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8090/health', timeout=5).read()",
], { stdio: 'inherit' });
if (worker.status !== 0) throw new Error('OMR worker health check failed.');

const result = spawnSync('npx', [
  'cypress', 'run',
  '--browser', 'chrome',
  '--spec', 'cypress/e2e/score-import-real.cy.js',
  '--config', 'baseUrl=http://127.0.0.1:5173/cavaquinho-lab',
  '--env', `nivaldoPdf=${realpathSync(source)}`,
], { stdio: 'inherit' });
process.exit(result.status ?? 1);
