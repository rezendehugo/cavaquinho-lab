import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import helmet from '@fastify/helmet';
import rawBody from 'fastify-raw-body';
import { trace } from '@opentelemetry/api';
import type { Authenticate } from './auth.js';
import type { PrivateStorage } from './storage.js';
import { createImportSchema, createPracticeSchema, measurePatchSchema, uploadRequestSchema } from './score-imports/contracts.js';
import { ScoreImportError, ScoreImportService } from './score-imports/service.js';
import { DisabledBillingGateway, type BillingGateway } from './product/billing.js';
import { InMemoryProductRepository, type ProductRepository } from './product/repository.js';
import { registerProductRoutes } from './product/routes.js';
import { ProductError, ProductService } from './product/service.js';
import { ZodError } from 'zod';
import * as Sentry from '@sentry/node';

interface AppDependencies {
  authenticate: Authenticate;
  storage: PrivateStorage;
  service: ScoreImportService;
  allowedOrigins: string[];
  allowDirectMusicXml?: boolean;
  omrImportsEnabled?: boolean;
  productRepository?: ProductRepository;
  billing?: BillingGateway;
  deleteIdentity?: (ownerId: string) => Promise<void>;
}

function extensionFor(contentType: string): string {
  return contentType === 'application/pdf' ? 'pdf' : 'musicxml';
}

export async function buildApp(dependencies: AppDependencies): Promise<FastifyInstance> {
  const app = Fastify({ logger: process.env.NODE_ENV !== 'test', bodyLimit: 20 * 1024 * 1024 });
  app.addContentTypeParser([
    'application/pdf',
    'application/vnd.recordare.musicxml+xml',
    'application/vnd.recordare.musicxml',
    'application/zip',
    'application/xml',
    'text/xml'
  ], { parseAs: 'buffer' }, (_request, body, done) => done(null, body));
  await app.register(cors, {
    origin: (origin, callback) => callback(null, !origin || dependencies.allowedOrigins.includes(origin)),
    credentials: false,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['authorization', 'content-type', 'traceparent', 'tracestate', 'baggage']
  });
  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(rawBody, { global: false, encoding: 'utf8', runFirst: true });
  await app.register(rateLimit, { max: 120, timeWindow: '1 minute' });

  app.addHook('onRequest', async request => {
    trace.getActiveSpan()?.setAttribute('http.request_id', request.id);
  });

  app.setErrorHandler((error, request, reply) => {
    const message = error instanceof Error ? error.message : 'invalid_request';
    const knownError = error instanceof ScoreImportError || error instanceof ProductError;
    const statusCode = knownError ? error.statusCode : error instanceof ZodError ? 400 : message === 'unauthorized' ? 401 : message === 'billing_unavailable' ? 503 : 500;
    const code = knownError ? error.code : statusCode === 401 ? 'unauthorized' : statusCode === 503 ? 'billing_unavailable' : statusCode === 400 ? 'invalid_request' : 'internal_error';
    if (statusCode >= 500) Sentry.captureException(error, { tags: { requestId: request.id } });
    request.log.warn({ requestId: request.id, code, statusCode }, 'request_failed');
    reply.status(statusCode).send({ error: code, requestId: request.id });
  });

  async function ownerId(authorization: string | undefined): Promise<string> {
    return (await dependencies.authenticate(authorization)).id;
  }

  app.get('/api/health', async () => ({ status: 'ok' }));
  app.get('/api/ready', async () => ({ status: 'ready', version: process.env.APP_VERSION ?? 'development', omrEnabled: dependencies.omrImportsEnabled !== false }));

  const productRepository = dependencies.productRepository ?? new InMemoryProductRepository();
  await registerProductRoutes(app, {
    authenticate: dependencies.authenticate,
    repository: productRepository,
    service: new ProductService(productRepository),
    billing: dependencies.billing ?? new DisabledBillingGateway(),
    deleteIdentity: dependencies.deleteIdentity
  });

  app.put('/v1/development-uploads/:token', async (request, reply) => {
    if (!dependencies.storage.acceptDevelopmentUpload) throw new ScoreImportError('development_upload_disabled', 404);
    const body = request.body;
    if (!Buffer.isBuffer(body) || body.length === 0 || body.length > 20 * 1024 * 1024) {
      throw new ScoreImportError('invalid_upload', 400);
    }
    await dependencies.storage.acceptDevelopmentUpload((request.params as { token: string }).token, body);
    return reply.status(204).send();
  });

  app.get('/v1/development-downloads/:token', async (request, reply) => {
    if (!dependencies.storage.readDevelopmentUpload) throw new ScoreImportError('development_download_disabled', 404);
    const content = await dependencies.storage.readDevelopmentUpload((request.params as { token: string }).token);
    if (!content) throw new ScoreImportError('stored_file_not_found', 404);
    return reply.type(content.subarray(0, 5).toString() === '%PDF-' ? 'application/pdf' : 'application/xml').send(content);
  });

  app.post('/v1/score-imports/upload-url', async (request, reply) => {
    const owner = await ownerId(request.headers.authorization);
    const input = uploadRequestSchema.parse(request.body);
    const ticket = await dependencies.storage.createUploadTicket(owner, extensionFor(input.contentType));
    return reply.status(201).send(ticket);
  });

  app.post('/v1/score-imports', async (request, reply) => {
    if (dependencies.omrImportsEnabled === false) throw new ScoreImportError('omr_worker_unavailable', 503);
    const owner = await ownerId(request.headers.authorization);
    const input = createImportSchema.parse(request.body);
    if (!input.storageKey.startsWith(`private/${owner}/`)) throw new ScoreImportError('invalid_storage_ownership', 403);
    const item = await dependencies.service.create(owner, input);
    const cacheHit = item.storageKey !== input.storageKey;
    if (cacheHit) await dependencies.storage.deletePrefix(input.storageKey);
    return reply.status(201).send({ ...item, cacheHit });
  });

  app.get('/v1/score-imports', async (request) => {
    const owner = await ownerId(request.headers.authorization);
    const query = request.query as { limit?: string; before?: string };
    const limit = Number(query.limit || 20);
    return {
      items: await dependencies.service.list(owner, Number.isFinite(limit) ? limit : 20, query.before),
      nextCursor: null
    };
  });

  app.post('/v1/score-imports/musicxml', async (request, reply) => {
    if (!dependencies.allowDirectMusicXml) throw new ScoreImportError('direct_import_disabled', 404);
    const owner = await ownerId(request.headers.authorization);
    const body = request.body as { fileName?: unknown; content?: unknown };
    if (typeof body?.fileName !== 'string' || typeof body?.content !== 'string') throw new ScoreImportError('invalid_musicxml_request', 400);
    return reply.status(201).send(await dependencies.service.importMusicXml(owner, body.fileName, body.content));
  });

  app.get('/v1/score-imports/:id', async (request) => {
    const owner = await ownerId(request.headers.authorization);
    return dependencies.service.getOwned(owner, (request.params as { id: string }).id);
  });

  app.get('/v1/score-imports/:id/draft', async (request) => {
    const owner = await ownerId(request.headers.authorization);
    const result = await dependencies.service.getOwned(owner, (request.params as { id: string }).id);
    if (!result.draft) throw new ScoreImportError('draft_not_found', 404);
    return result.draft;
  });

  app.get('/v1/score-imports/:id/source-url', async (request) => {
    const owner = await ownerId(request.headers.authorization);
    const { item } = await dependencies.service.getOwned(owner, (request.params as { id: string }).id);
    return { url: await dependencies.storage.createDownloadUrl(item.storageKey) };
  });

  app.patch('/v1/score-imports/:id/measures/:number', async (request) => {
    const owner = await ownerId(request.headers.authorization);
    const { id, number } = request.params as { id: string; number: string };
    const input = measurePatchSchema.parse(request.body);
    return dependencies.service.updateMeasure(owner, id, Number(number), input.revision, input.events, input.chords);
  });

  app.post('/v1/score-imports/:id/validate', async (request) => {
    const owner = await ownerId(request.headers.authorization);
    return dependencies.service.validate(owner, (request.params as { id: string }).id);
  });

  app.post('/v1/score-imports/:id/create-practice', async (request) => {
    const owner = await ownerId(request.headers.authorization);
    const input = createPracticeSchema.parse(request.body);
    return dependencies.service.createPractice(owner, (request.params as { id: string }).id, input.targets, input.range);
  });

  app.post('/v1/score-imports/:id/retry', async (request) => {
    if (dependencies.omrImportsEnabled === false) throw new ScoreImportError('omr_worker_unavailable', 503);
    const owner = await ownerId(request.headers.authorization);
    return dependencies.service.retry(owner, (request.params as { id: string }).id);
  });

  app.delete('/v1/score-imports/:id', async (request, reply) => {
    const owner = await ownerId(request.headers.authorization);
    const id = (request.params as { id: string }).id;
    const { item } = await dependencies.service.getOwned(owner, id);
    await dependencies.storage.deletePrefix(item.storageKey);
    await dependencies.service.delete(owner, id);
    return reply.status(204).send();
  });

  return app;
}
