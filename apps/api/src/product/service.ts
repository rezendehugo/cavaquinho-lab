import type { ProductRepository } from './repository.js';
import type { SequenceRecord } from './types.js';

export const FREE_SEQUENCE_LIMIT = 3;
export const FREE_STEP_LIMIT = 20;
export const PRO_STEP_LIMIT = 500;

export class ProductError extends Error {
  constructor(readonly code: string, readonly statusCode: number) { super(code); }
}

export class ProductService {
  constructor(private readonly repository: ProductRepository) {}

  async entitlements(ownerId: string) {
    const profile = await this.repository.getOrCreateProfile(ownerId);
    const subscription = await this.repository.getSubscription(ownerId);
    const pro = profile.plan === 'pro' || ['active', 'trialing'].includes(subscription?.status ?? '');
    return { plan: pro ? 'pro' : 'free', sequenceLimit: pro ? null : FREE_SEQUENCE_LIMIT, stepLimit: pro ? PRO_STEP_LIMIT : FREE_STEP_LIMIT, advancedPractice: pro, exports: pro, practiceHistory: pro };
  }

  async create(ownerId: string, input: Omit<SequenceRecord, 'ownerId' | 'revision' | 'createdAt' | 'updatedAt'>): Promise<SequenceRecord> {
    const existing = await this.repository.listSequences(ownerId);
    const access = await this.entitlements(ownerId);
    if (access.sequenceLimit !== null && existing.length >= access.sequenceLimit) throw new ProductError('free_sequence_limit', 403);
    this.assertStepLimit(input.steps.length, access.stepLimit);
    const now = new Date().toISOString();
    const value = { ...input, ownerId, revision: 1, createdAt: now, updatedAt: now };
    await this.repository.createSequence(value);
    return value;
  }

  async update(ownerId: string, id: string, input: Omit<SequenceRecord, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>): Promise<SequenceRecord> {
    const current = await this.repository.getSequence(ownerId, id);
    if (!current) throw new ProductError('sequence_not_found', 404);
    const access = await this.entitlements(ownerId);
    this.assertStepLimit(input.steps.length, access.stepLimit);
    const value = { ...current, ...input, revision: input.revision + 1, updatedAt: new Date().toISOString() };
    if (!await this.repository.updateSequence(value, input.revision)) throw new ProductError('revision_conflict', 409);
    return value;
  }

  async migrate(ownerId: string, values: Array<Omit<SequenceRecord, 'ownerId' | 'revision' | 'createdAt' | 'updatedAt'>>) {
    const profile = await this.repository.getOrCreateProfile(ownerId);
    if (profile.localMigrationCompletedAt) return { imported: 0, alreadyCompleted: true };
    const existingIds = new Set((await this.repository.listSequences(ownerId)).map(item => item.id));
    let imported = 0;
    for (const value of values) {
      if (existingIds.has(value.id)) continue;
      if (value.steps.length > PRO_STEP_LIMIT) throw new ProductError('sequence_step_limit', 403);
      const now = new Date().toISOString();
      await this.repository.createSequence({ ...value, ownerId, revision: 1, createdAt: now, updatedAt: now });
      imported += 1;
    }
    await this.repository.markLocalMigrationComplete(ownerId, new Date().toISOString());
    return { imported, alreadyCompleted: false };
  }

  private assertStepLimit(count: number, limit: number): void {
    if (count > limit) throw new ProductError('sequence_step_limit', 403);
  }
}
