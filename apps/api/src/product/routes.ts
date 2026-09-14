import type { FastifyInstance } from 'fastify';
import type { Authenticate } from '../auth.js';
import { checkoutSchema, localMigrationSchema, practiceSessionSchema, sequenceCreateSchema, sequenceUpdateSchema } from './contracts.js';
import type { BillingGateway } from './billing.js';
import type { ProductRepository } from './repository.js';
import { ProductError, ProductService } from './service.js';

interface ProductRoutesDependencies {
  authenticate: Authenticate;
  repository: ProductRepository;
  service: ProductService;
  billing: BillingGateway;
  deleteIdentity?: (ownerId: string) => Promise<void>;
}

export async function registerProductRoutes(app: FastifyInstance, dependencies: ProductRoutesDependencies): Promise<void> {
  const owner = async (authorization: string | undefined) => (await dependencies.authenticate(authorization)).id;

  app.get('/v1/me', async request => {
    const id = await owner(request.headers.authorization);
    return { profile: await dependencies.repository.getOrCreateProfile(id), entitlements: await dependencies.service.entitlements(id) };
  });
  app.delete('/v1/me', async (request, reply) => {
    const id = await owner(request.headers.authorization);
    const body = request.body as { confirmation?: unknown };
    if (body?.confirmation !== 'EXCLUIR') throw new ProductError('account_deletion_confirmation_required', 400);
    await dependencies.repository.deleteAccountData(id);
    await dependencies.deleteIdentity?.(id);
    return reply.status(204).send();
  });
  app.get('/v1/entitlements', async request => dependencies.service.entitlements(await owner(request.headers.authorization)));
  app.get('/v1/sequences', async request => ({ items: await dependencies.repository.listSequences(await owner(request.headers.authorization)) }));
  app.get('/v1/sequences/:id', async request => {
    const value = await dependencies.repository.getSequence(await owner(request.headers.authorization), (request.params as { id: string }).id);
    if (!value) throw new ProductError('sequence_not_found', 404);
    return value;
  });
  app.post('/v1/sequences', { config: { rateLimit: { max: 30, timeWindow: '1 minute' } } }, async (request, reply) => reply.status(201).send(await dependencies.service.create(await owner(request.headers.authorization), sequenceCreateSchema.parse(request.body))));
  app.patch('/v1/sequences/:id', { config: { rateLimit: { max: 60, timeWindow: '1 minute' } } }, async request => dependencies.service.update(await owner(request.headers.authorization), (request.params as { id: string }).id, sequenceUpdateSchema.parse(request.body)));
  app.put('/v1/sequences/:id/steps', async request => dependencies.service.update(await owner(request.headers.authorization), (request.params as { id: string }).id, sequenceUpdateSchema.parse(request.body)));
  app.delete('/v1/sequences/:id', async (request, reply) => {
    if (!await dependencies.repository.deleteSequence(await owner(request.headers.authorization), (request.params as { id: string }).id)) throw new ProductError('sequence_not_found', 404);
    return reply.status(204).send();
  });
  app.post('/v1/sequences/migrate-local', async request => dependencies.service.migrate(await owner(request.headers.authorization), localMigrationSchema.parse(request.body).sequences));
  app.post('/v1/practice-sessions', async (request, reply) => {
    const ownerId = await owner(request.headers.authorization);
    const access = await dependencies.service.entitlements(ownerId);
    if (!access.practiceHistory) throw new ProductError('pro_required', 403);
    await dependencies.repository.createPracticeSession({ ...practiceSessionSchema.parse(request.body), ownerId });
    return reply.status(201).send({ ok: true });
  });
  app.post('/v1/billing/checkout', { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } }, async request => {
    const ownerId = await owner(request.headers.authorization);
    const input = checkoutSchema.parse(request.body);
    return { url: await dependencies.billing.createCheckout(ownerId, undefined, input.price) };
  });
  app.post('/v1/billing/portal', async request => ({ url: await dependencies.billing.createPortal(await owner(request.headers.authorization)) }));
  app.post('/v1/webhooks/stripe', { config: { rawBody: true } }, async (request, reply) => {
    const signature = request.headers['stripe-signature'];
    if (typeof signature !== 'string' || request.rawBody === undefined) throw new ProductError('invalid_stripe_signature', 400);
    await dependencies.billing.processWebhook(Buffer.isBuffer(request.rawBody) ? request.rawBody.toString('utf8') : request.rawBody, signature);
    return reply.status(204).send();
  });
}
