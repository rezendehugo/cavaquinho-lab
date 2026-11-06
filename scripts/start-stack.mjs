/* global console, process */
import { spawnSync } from 'node:child_process';

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

const appUrl = 'http://127.0.0.1:5173/cavaquinho-lab/';
const practiceUrl = `${appUrl}practice`;
const apiUrl = 'http://127.0.0.1:8080';
const healthUrl = `${apiUrl}/api/health`;

const verified = spawnSync('node', ['scripts/verify-stack.mjs'], { stdio: 'inherit' });
if (verified.status !== 0) {
  console.error('\nFalha ao verificar a stack. Use "npm run stack:status" e "npm run stack:logs" para diagnosticar.');
  process.exit(verified.status ?? 1);
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
