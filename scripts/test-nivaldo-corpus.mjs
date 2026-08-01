/* global console, process */
import { mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const source = process.env.NIVALDO_NO_CHORO_PDF;
if (!source) {
  console.log('Nivaldo corpus skipped: set NIVALDO_NO_CHORO_PDF to the private PDF path.');
  process.exit(0);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: 'inherit', ...options });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} exited with status ${result.status ?? 1}`);
}

const repository = process.cwd();
const pdfPath = realpathSync(source);
const fixturePath = resolve(repository, 'apps/api/src/score-imports/fixtures');
const artifacts = mkdtempSync(join(tmpdir(), 'cavaquinho-nivaldo-'));
try {
  run('docker', [
    'compose', 'run', '--build', '--rm', '-T',
    '--entrypoint', 'python',
    '--volume', `${pdfPath}:/private/Nivaldo_no_choro.pdf:ro`,
    '--volume', `${fixturePath}:/fixtures:ro`,
    '--volume', `${artifacts}:/artifacts`,
    '--env', 'NIVALDO_NO_CHORO_PDF=/private/Nivaldo_no_choro.pdf',
    '--env', 'NIVALDO_VERIFY_SHA256=1',
    '--env', 'CORPUS_FIXTURES_DIR=/fixtures',
    '--env', 'NIVALDO_CORPUS_ARTIFACT_DIR=/artifacts',
    '--env', 'PYTHONPATH=/app',
    'omr-worker',
    '-m', 'unittest', 'test_corpus.NivaldoNoChoroCorpusTests',
  ]);

  run('npx', [
    'vitest', 'run',
    'apps/api/src/score-imports/nivaldoCorpus.integration.test.ts',
    '--environment', 'node',
  ], {
    cwd: repository,
    env: {
      ...process.env,
      NIVALDO_MUSICXML: join(artifacts, 'nivaldo.normalized.musicxml'),
      NIVALDO_OMR_REPORT: join(artifacts, 'nivaldo.report.json'),
    },
  });
  rmSync(artifacts, { recursive: true, force: true });
} catch (error) {
  console.error(`Nivaldo diagnostics preserved at ${artifacts}`);
  throw error;
}
