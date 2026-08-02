import './instrumentation.js';
import { createDevelopmentAuthenticator, createSupabaseAuthenticator } from './auth.js';
import { buildApp } from './app.js';
import { InMemoryScoreImportRepository } from './score-imports/repository.js';
import { PostgresScoreImportRepository } from './score-imports/postgresRepository.js';
import { ScoreImportService } from './score-imports/service.js';
import { DevelopmentStorage, SupabasePrivateStorage } from './storage.js';
import { HttpOmrWorker } from './score-imports/omrWorker.js';
import { ScoreImportJobProcessor } from './score-imports/jobProcessor.js';
import { PostgresProductRepository } from './product/postgresRepository.js';
import { InMemoryProductRepository } from './product/repository.js';
import { DisabledBillingGateway, StripeBillingGateway } from './product/billing.js';
import * as Sentry from '@sentry/node';

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
const productRepository = process.env.DATABASE_URL
  ? PostgresProductRepository.connect(process.env.DATABASE_URL)
  : new InMemoryProductRepository();
if (process.env.SENTRY_DSN) Sentry.init({ dsn: process.env.SENTRY_DSN, environment: process.env.APP_ENV ?? 'development', release: process.env.APP_VERSION });
const billing = process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET && process.env.STRIPE_PRICE_MONTHLY && process.env.STRIPE_PRICE_ANNUAL
  ? new StripeBillingGateway(process.env.STRIPE_SECRET_KEY, process.env.STRIPE_WEBHOOK_SECRET, process.env.APP_URL ?? 'http://127.0.0.1:5173', { monthly: process.env.STRIPE_PRICE_MONTHLY, annual: process.env.STRIPE_PRICE_ANNUAL }, productRepository)
  : new DisabledBillingGateway();
const deleteIdentity = supabaseUrl && process.env.SUPABASE_SERVICE_ROLE_KEY ? async (ownerId: string) => {
  const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/admin/users/${ownerId}`, { method: 'DELETE', headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!, authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` } });
  if (!response.ok) throw new Error('identity_deletion_failed');
} : undefined;
const workerUrl = process.env.OMR_WORKER_URL;
const app = await buildApp({
  authenticate,
  storage,
  service,
  allowedOrigins: (process.env.CORS_ALLOWED_ORIGINS ?? 'http://127.0.0.1:5173').split(','),
  allowDirectMusicXml: !supabaseUrl,
  omrImportsEnabled: Boolean(workerUrl),
  productRepository,
  billing,
  deleteIdentity
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
