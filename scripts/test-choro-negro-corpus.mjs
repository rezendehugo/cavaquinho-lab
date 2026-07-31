/* global console, process */
import { realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const source = process.env.CHORO_NEGRO_PDF;
if (!source) {
  console.log('Choro Negro corpus skipped: set CHORO_NEGRO_PDF to the private PDF path.');
  process.exit(0);
}

const result = spawnSync('docker', [
  'compose', 'run', '--build', '--rm', '-T',
  '--entrypoint', 'python',
  '--volume', `${realpathSync(source)}:/private/Choro_Negro.pdf:ro`,
  '--volume', `${resolve('apps/api/src/score-imports/fixtures')}:/fixtures:ro`,
  '--env', 'CHORO_NEGRO_PDF=/private/Choro_Negro.pdf',
  '--env', 'CHORO_NEGRO_VERIFY_SHA256=1',
  '--env', 'CORPUS_FIXTURES_DIR=/fixtures',
  '--env', 'PYTHONPATH=/app',
  'omr-worker',
  '-m', 'unittest', 'test_corpus.ChoroNegroCorpusTests',
], { stdio: 'inherit' });

if (result.error) throw result.error;
if (result.status !== 0) throw new Error(`Choro Negro corpus exited with status ${result.status ?? 1}`);
