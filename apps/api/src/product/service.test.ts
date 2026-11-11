import { describe, expect, test, vi } from 'vitest';
import { InMemoryProductRepository } from './repository.js';
import { FREE_SEQUENCE_LIMIT, FREE_STEP_LIMIT, ProductError, ProductService } from './service.js';

const step = () => ({ id: crypto.randomUUID(), key: 'C', suffix: 'major', positionIndex: null, practiceBeats: 4 });
const sequence = (index: number, steps = [step()]) => ({ id: crypto.randomUUID(), title: `Sequência ${index}`, practiceBpm: 80, loopStartIndex: 0, steps });

describe('product service', () => {
  test('enforces the free sequence and step limits on the server', async () => {
    const service = new ProductService(new InMemoryProductRepository());
    for (let index = 0; index < FREE_SEQUENCE_LIMIT; index += 1) await service.create('alice', sequence(index));
    await expect(service.create('alice', sequence(4))).rejects.toMatchObject({ code: 'free_sequence_limit' });
    await expect(new ProductService(new InMemoryProductRepository()).create('bob', sequence(1, Array.from({ length: FREE_STEP_LIMIT + 1 }, step)))).rejects.toMatchObject({ code: 'sequence_step_limit' });
  });

  test('enforces sequence limits without loading every sequence and its steps', async () => {
    const repository = new InMemoryProductRepository();
    const listSequences = vi.spyOn(repository, 'listSequences');

    await new ProductService(repository).create('alice', sequence(1));

    expect(listSequences).not.toHaveBeenCalled();
  });

  test('loads profile and subscription concurrently when resolving entitlements', async () => {
    const repository = new InMemoryProductRepository();
    let resolveProfile!: (value: Awaited<ReturnType<typeof repository.getOrCreateProfile>>) => void;
    let resolveSubscription!: (value: Awaited<ReturnType<typeof repository.getSubscription>>) => void;
    const profilePromise = new Promise<Awaited<ReturnType<typeof repository.getOrCreateProfile>>>(resolve => { resolveProfile = resolve; });
    const subscriptionPromise = new Promise<Awaited<ReturnType<typeof repository.getSubscription>>>(resolve => { resolveSubscription = resolve; });
    const profileRead = vi.spyOn(repository, 'getOrCreateProfile').mockReturnValue(profilePromise);
    const subscriptionRead = vi.spyOn(repository, 'getSubscription').mockReturnValue(subscriptionPromise);

    const entitlements = new ProductService(repository).entitlements('alice');
    const bothReadsStarted = profileRead.mock.calls.length === 1 && subscriptionRead.mock.calls.length === 1;
    resolveProfile({ id: 'alice', displayName: null, plan: 'free', onboardingCompleted: false, localMigrationCompletedAt: null, createdAt: '', updatedAt: '' });
    resolveSubscription(null);

    expect(bothReadsStarted).toBe(true);
    expect(await entitlements).toMatchObject({ plan: 'free', sequenceLimit: FREE_SEQUENCE_LIMIT });
  });

  test('rejects stale revisions and preserves the latest value', async () => {
    const repository = new InMemoryProductRepository();
    const service = new ProductService(repository);
    const created = await service.create('alice', sequence(1));
    await service.update('alice', created.id, { ...created, title: 'Nova', revision: 1 });
    await expect(service.update('alice', created.id, { ...created, title: 'Antiga', revision: 1 })).rejects.toEqual(new ProductError('revision_conflict', 409));
    expect((await repository.getSequence('alice', created.id))?.title).toBe('Nova');
  });

  test('migrates local sequences once without duplicating stable IDs', async () => {
    const repository = new InMemoryProductRepository();
    const service = new ProductService(repository);
    const value = sequence(1);
    expect(await service.migrate('alice', [value])).toEqual({ imported: 1, alreadyCompleted: false });
    expect(await service.migrate('alice', [value])).toEqual({ imported: 0, alreadyCompleted: true });
    expect(await repository.listSequences('alice')).toHaveLength(1);
  });
});
