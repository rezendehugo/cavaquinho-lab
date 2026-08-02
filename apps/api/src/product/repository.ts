import type { Profile, SequenceRecord, SubscriptionRecord } from './types.js';

export interface ProductRepository {
  getOrCreateProfile(ownerId: string): Promise<Profile>;
  markLocalMigrationComplete(ownerId: string, timestamp: string): Promise<void>;
  listSequences(ownerId: string): Promise<SequenceRecord[]>;
  getSequence(ownerId: string, id: string): Promise<SequenceRecord | null>;
  createSequence(value: SequenceRecord): Promise<void>;
  updateSequence(value: SequenceRecord, expectedRevision: number): Promise<boolean>;
  deleteSequence(ownerId: string, id: string): Promise<boolean>;
  createPracticeSession(value: { id: string; ownerId: string; sequenceId: string | null; bpm: number; durationSeconds: number; completed: boolean; startedAt: string; endedAt: string | null }): Promise<void>;
  getSubscription(ownerId: string): Promise<SubscriptionRecord | null>;
  saveSubscription(value: SubscriptionRecord): Promise<void>;
  claimStripeEvent(id: string, createdAt: string): Promise<boolean>;
  deleteAccountData(ownerId: string): Promise<void>;
}

export class InMemoryProductRepository implements ProductRepository {
  readonly profiles = new Map<string, Profile>();
  readonly sequences = new Map<string, SequenceRecord>();
  readonly subscriptions = new Map<string, SubscriptionRecord>();
  readonly stripeEvents = new Set<string>();

  async getOrCreateProfile(ownerId: string): Promise<Profile> {
    const now = new Date().toISOString();
    const profile = this.profiles.get(ownerId) ?? { id: ownerId, displayName: null, plan: 'free' as const, onboardingCompleted: false, localMigrationCompletedAt: null, createdAt: now, updatedAt: now };
    this.profiles.set(ownerId, profile);
    return structuredClone(profile);
  }
  async markLocalMigrationComplete(ownerId: string, timestamp: string): Promise<void> {
    const profile = await this.getOrCreateProfile(ownerId);
    this.profiles.set(ownerId, { ...profile, localMigrationCompletedAt: timestamp, updatedAt: timestamp });
  }
  async listSequences(ownerId: string): Promise<SequenceRecord[]> {
    return [...this.sequences.values()].filter(item => item.ownerId === ownerId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map(item => structuredClone(item));
  }
  async getSequence(ownerId: string, id: string): Promise<SequenceRecord | null> {
    const value = this.sequences.get(id);
    return value?.ownerId === ownerId ? structuredClone(value) : null;
  }
  async createSequence(value: SequenceRecord): Promise<void> { this.sequences.set(value.id, structuredClone(value)); }
  async updateSequence(value: SequenceRecord, expectedRevision: number): Promise<boolean> {
    const current = this.sequences.get(value.id);
    if (!current || current.ownerId !== value.ownerId || current.revision !== expectedRevision) return false;
    this.sequences.set(value.id, structuredClone(value));
    return true;
  }
  async deleteSequence(ownerId: string, id: string): Promise<boolean> {
    const current = this.sequences.get(id);
    if (!current || current.ownerId !== ownerId) return false;
    return this.sequences.delete(id);
  }
  async createPracticeSession(): Promise<void> {}
  async getSubscription(ownerId: string): Promise<SubscriptionRecord | null> { return structuredClone(this.subscriptions.get(ownerId) ?? null); }
  async saveSubscription(value: SubscriptionRecord): Promise<void> { this.subscriptions.set(value.ownerId, structuredClone(value)); }
  async claimStripeEvent(id: string): Promise<boolean> {
    if (this.stripeEvents.has(id)) return false;
    this.stripeEvents.add(id);
    return true;
  }
  async deleteAccountData(ownerId: string): Promise<void> {
    this.profiles.delete(ownerId); this.subscriptions.delete(ownerId);
    [...this.sequences.values()].filter(item => item.ownerId === ownerId).forEach(item => this.sequences.delete(item.id));
  }
}
