import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import type { Authenticate } from './auth.js';
import type { PrivateStorage } from './storage.js';
import { createImportSchema, createPracticeSchema, measurePatchSchema, uploadRequestSchema } from './score-imports/contracts.js';
import { ScoreImportError, ScoreImportService } from './score-imports/service.js';

interface AppDependencies {
  authenticate: Authenticate;
  storage: PrivateStorage;
  service: ScoreImportService;
  allowedOrigins: string[];
  allowDirectMusicXml?: boolean;
}

function extensionFor(contentType: string): string {
  return contentType === 'application/pdf' ? 'pdf' : 'musicxml';
}

export async function buildApp(dependencies: AppDependencies): Promise<FastifyInstance> {
  const app = Fastify({ logger: false, bodyLimit: 20 * 1024 * 1024 });
  await app.register(cors, {
    origin: (origin, callback) => callback(null, !origin || dependencies.allowedOrigins.includes(origin)),
    credentials: false
  });
  await app.register(rateLimit, { max: 120, timeWindow: '1 minute' });

  app.setErrorHandler((error, _request, reply) => {
    const message = error instanceof Error ? error.message : 'invalid_request';
    const statusCode = error instanceof ScoreImportError ? error.statusCode : message === 'unauthorized' ? 401 : 400;
    reply.status(statusCode).send({ error: error instanceof ScoreImportError ? error.code : statusCode === 401 ? 'unauthorized' : 'invalid_request' });
  });

  async function ownerId(authorization: string | undefined): Promise<string> {
    return (await dependencies.authenticate(authorization)).id;
  }

  app.get('/api/health', async () => ({ status: 'ok' }));

  app.post('/v1/score-imports/upload-url', async (request, reply) => {
    const owner = await ownerId(request.headers.authorization);
    const input = uploadRequestSchema.parse(request.body);
    const ticket = await dependencies.storage.createUploadTicket(owner, extensionFor(input.contentType));
    return reply.status(201).send(ticket);
  });

  app.post('/v1/score-imports', async (request, reply) => {
    const owner = await ownerId(request.headers.authorization);
    const input = createImportSchema.parse(request.body);
    if (!input.storageKey.startsWith(`private/${owner}/`)) throw new ScoreImportError('invalid_storage_ownership', 403);
    return reply.status(201).send(await dependencies.service.create(owner, input));
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
    return dependencies.service.createPractice(owner, (request.params as { id: string }).id, input.targets);
  });

  app.post('/v1/score-imports/:id/retry', async (request) => {
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
