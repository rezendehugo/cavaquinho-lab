import { describe, expect, test, vi } from 'vitest';
import { buildApp } from '../app.js';
import { createDevelopmentAuthenticator } from '../auth.js';
import { ScoreImportService } from '../score-imports/service.js';
import { InMemoryScoreImportRepository } from '../score-imports/repository.js';
import { DevelopmentStorage } from '../storage.js';
import { InMemoryProductRepository } from './repository.js';

const auth = { authorization: 'Bearer dev:alice' };
const payload = () => ({ id: crypto.randomUUID(), title: 'Trecho', practiceBpm: 80, loopStartIndex: 0, steps: [{ id: crypto.randomUUID(), key: 'C', suffix: 'major', positionIndex: null, practiceBeats: 4 }] });

async function fixture() {
  const repository = new InMemoryProductRepository();
  const billing = { createCheckout: vi.fn(async () => 'https://checkout.example'), createPortal: vi.fn(async () => 'https://portal.example'), processWebhook: vi.fn(async () => {}) };
  const app = await buildApp({ authenticate: createDevelopmentAuthenticator(), storage: new DevelopmentStorage(), service: new ScoreImportService(new InMemoryScoreImportRepository()), allowedOrigins: ['http://127.0.0.1:5173'], productRepository: repository, billing });
  return { app, repository, billing };
}

describe('product API', () => {
  test('isolates sequences by owner and returns request IDs for failures', async () => {
    const { app } = await fixture();
    const created = await app.inject({ method: 'POST', url: '/v1/sequences', headers: auth, payload: payload() });
    expect(created.statusCode).toBe(201);
    const hidden = await app.inject({ method: 'GET', url: `/v1/sequences/${created.json().id}`, headers: { authorization: 'Bearer dev:bob' } });
    expect(hidden.statusCode).toBe(404);
    expect(hidden.json()).toMatchObject({ error: 'sequence_not_found', requestId: expect.any(String) });
    await app.close();
  });

  test('uses optimistic revisions and exposes server-owned entitlements', async () => {
    const { app } = await fixture();
    const created = (await app.inject({ method: 'POST', url: '/v1/sequences', headers: auth, payload: payload() })).json();
    const update = { title: 'Atualizada', practiceBpm: 90, loopStartIndex: 0, steps: created.steps, revision: 1 };
    expect((await app.inject({ method: 'PATCH', url: `/v1/sequences/${created.id}`, headers: auth, payload: update })).statusCode).toBe(200);
    expect((await app.inject({ method: 'PATCH', url: `/v1/sequences/${created.id}`, headers: auth, payload: update })).statusCode).toBe(409);
    expect((await app.inject({ method: 'GET', url: '/v1/entitlements', headers: auth })).json()).toMatchObject({ plan: 'free', sequenceLimit: 3, stepLimit: 20 });
    await app.close();
  });

  test('creates checkout through the billing boundary', async () => {
    const { app, billing } = await fixture();
    const response = await app.inject({ method: 'POST', url: '/v1/billing/checkout', headers: auth, payload: { price: 'monthly' } });
    expect(response.json()).toEqual({ url: 'https://checkout.example' });
    expect(billing.createCheckout).toHaveBeenCalledWith(expect.any(String), undefined, 'monthly');
    await app.close();
  });
});
