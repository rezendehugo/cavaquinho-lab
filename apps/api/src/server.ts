import { createDevelopmentAuthenticator, createSupabaseAuthenticator } from './auth.js';
import { buildApp } from './app.js';
import { InMemoryScoreImportRepository } from './score-imports/repository.js';
import { PostgresScoreImportRepository } from './score-imports/postgresRepository.js';
import { ScoreImportService } from './score-imports/service.js';
import { DevelopmentStorage, SupabasePrivateStorage } from './storage.js';
import { HttpOmrWorker } from './score-imports/omrWorker.js';
import { ScoreImportJobProcessor } from './score-imports/jobProcessor.js';

const port = Number(process.env.PORT ?? 8080);
const supabaseUrl = process.env.SUPABASE_URL;
const authenticate = supabaseUrl ? createSupabaseAuthenticator(supabaseUrl) : createDevelopmentAuthenticator();
const repository = process.env.DATABASE_URL
  ? PostgresScoreImportRepository.connect(process.env.DATABASE_URL)
  : new InMemoryScoreImportRepository();
const storage = supabaseUrl && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? new SupabasePrivateStorage(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : new DevelopmentStorage(process.env.DEVELOPMENT_STORAGE_DIR);
const service = new ScoreImportService(repository);
const workerUrl = process.env.OMR_WORKER_URL;
const app = await buildApp({
  authenticate,
  storage,
  service,
  allowedOrigins: (process.env.CORS_ALLOWED_ORIGINS ?? 'http://127.0.0.1:5173').split(','),
  allowDirectMusicXml: !supabaseUrl,
  omrImportsEnabled: Boolean(workerUrl)
});

if (workerUrl) {
  const publicApiUrl = process.env.PUBLIC_API_URL ?? `http://127.0.0.1:${port}`;
  const processor = new ScoreImportJobProcessor(
    repository,
    storage,
    new HttpOmrWorker(workerUrl),
    service,
    publicApiUrl
  );
  processor.start();
  app.addHook('onClose', async () => processor.stop());
}

await app.listen({ port, host: process.env.HOST ?? '127.0.0.1' });

const displayedHost = (process.env.HOST ?? '127.0.0.1') === '0.0.0.0'
  ? '127.0.0.1'
  : process.env.HOST ?? '127.0.0.1';
process.stdout.write([
  '',
  'Cavaquinho Lab API pronta:',
  `  API:    http://${displayedHost}:${port}`,
  `  Health: http://${displayedHost}:${port}/api/health`,
  workerUrl ? `  OMR:    ${workerUrl} (rede interna)` : '  OMR:    desabilitado',
  ''
].join('\n'));
