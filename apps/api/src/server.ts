import { createDevelopmentAuthenticator, createSupabaseAuthenticator } from './auth.js';
import { buildApp } from './app.js';
import { InMemoryScoreImportRepository } from './score-imports/repository.js';
import { PostgresScoreImportRepository } from './score-imports/postgresRepository.js';
import { ScoreImportService } from './score-imports/service.js';
import { DevelopmentStorage, SupabasePrivateStorage } from './storage.js';

const port = Number(process.env.PORT ?? 8080);
const supabaseUrl = process.env.SUPABASE_URL;
const authenticate = supabaseUrl ? createSupabaseAuthenticator(supabaseUrl) : createDevelopmentAuthenticator();
const repository = process.env.DATABASE_URL
  ? PostgresScoreImportRepository.connect(process.env.DATABASE_URL)
  : new InMemoryScoreImportRepository();
const storage = supabaseUrl && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? new SupabasePrivateStorage(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : new DevelopmentStorage();
const app = await buildApp({
  authenticate,
  storage,
  service: new ScoreImportService(repository),
  allowedOrigins: (process.env.CORS_ALLOWED_ORIGINS ?? 'http://127.0.0.1:5173').split(',')
  ,allowDirectMusicXml: !supabaseUrl
});

await app.listen({ port, host: process.env.HOST ?? '127.0.0.1' });
