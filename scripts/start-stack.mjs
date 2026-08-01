/* global console, fetch, process */
import { spawnSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const composeArguments = [
  'compose',
  '--profile', 'dev',
  '--profile', 'backend',
  'up',
  '--build',
  '--detach'
];

const started = spawnSync('docker', composeArguments, { stdio: 'inherit' });
if (started.status !== 0) process.exit(started.status ?? 1);

async function waitForUrl(url, attempts = 30) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // The container may still be moving from "started" to "ready".
    }
    await delay(1_000);
  }
  throw new Error(`O serviço não ficou disponível: ${url}`);
}

const appUrl = 'http://127.0.0.1:5173/cavaquinho-lab/';
const practiceUrl = `${appUrl}practice`;
const apiUrl = 'http://127.0.0.1:8080';
const healthUrl = `${apiUrl}/api/health`;

try {
  await Promise.all([
    waitForUrl(appUrl),
    waitForUrl(healthUrl)
  ]);
} catch (error) {
  console.error(`\nFalha ao iniciar a stack: ${error.message}`);
  console.error('Use "npm run stack:status" e "npm run stack:logs" para diagnosticar.');
  process.exit(1);
}

console.log(`
Cavaquinho Lab está pronto:
  Aplicação: ${appUrl}
  Prática:   ${practiceUrl}
  API:       ${apiUrl}
  Health:    ${healthUrl}

Hot reload:
  Frontend:  JSX e CSS
  API:       TypeScript
  Worker:    pipeline.py, normalize.py e server.py

Comandos:
  npm run stack:status
  npm run stack:logs
  npm run stack:rebuild
  npm run stack:down
`);
