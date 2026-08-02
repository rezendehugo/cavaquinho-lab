import postgres, { type Sql, type TransactionSql } from 'postgres';
import type { ProductRepository } from './repository.js';
import type { Profile, SequenceRecord, SequenceStepRecord, SubscriptionRecord } from './types.js';

type Row = Record<string, unknown>;
const iso = (value: unknown): string => value instanceof Date ? value.toISOString() : String(value);

function mapProfile(row: Row): Profile {
  return {
    id: String(row.id), displayName: row.display_name ? String(row.display_name) : null,
    plan: row.plan === 'pro' ? 'pro' : 'free', onboardingCompleted: Boolean(row.onboarding_completed),
    localMigrationCompletedAt: row.local_migration_completed_at ? iso(row.local_migration_completed_at) : null,
    createdAt: iso(row.created_at), updatedAt: iso(row.updated_at)
  };
}

function mapStep(row: Row): SequenceStepRecord {
  return {
    id: String(row.id), key: String(row.chord_root), suffix: String(row.chord_suffix),
    ...(row.bass_note ? { bassNote: String(row.bass_note) } : {}),
    ...(row.display_root ? { displayKey: String(row.display_root) } : {}),
    ...(row.display_bass_note ? { displayBassNote: String(row.display_bass_note) } : {}),
    positionIndex: row.position_index === null ? null : Number(row.position_index), practiceBeats: Number(row.practice_beats)
  };
}

export class PostgresProductRepository implements ProductRepository {
  constructor(private readonly sql: Sql) {}
  static connect(databaseUrl: string): PostgresProductRepository {
    return new PostgresProductRepository(postgres(databaseUrl, { max: 10, prepare: true }));
  }
  async getOrCreateProfile(ownerId: string): Promise<Profile> {
    const rows = await this.sql`insert into profiles (id) values (${ownerId}) on conflict (id) do update set id=excluded.id returning *`;
    return mapProfile(rows[0]);
  }
  async markLocalMigrationComplete(ownerId: string, timestamp: string): Promise<void> {
    await this.sql`update profiles set local_migration_completed_at=${timestamp}, updated_at=${timestamp} where id=${ownerId}`;
  }
  async listSequences(ownerId: string): Promise<SequenceRecord[]> {
    const sequences = await this.sql`select * from sequences where owner_id=${ownerId} order by updated_at desc`;
    const ids = sequences.map(row => String(row.id));
    const steps = ids.length ? await this.sql`select * from sequence_steps where owner_id=${ownerId} and sequence_id in ${this.sql(ids)} order by sequence_id, position` : [];
    return sequences.map(row => this.mapSequence(row, steps));
  }
  async getSequence(ownerId: string, id: string): Promise<SequenceRecord | null> {
    const rows = await this.sql`select * from sequences where id=${id} and owner_id=${ownerId} limit 1`;
    if (!rows[0]) return null;
    const steps = await this.sql`select * from sequence_steps where sequence_id=${id} and owner_id=${ownerId} order by position`;
    return this.mapSequence(rows[0], steps);
  }
  async createSequence(value: SequenceRecord): Promise<void> {
    await this.sql.begin(async sql => {
      await sql`insert into sequences (id, owner_id, title, practice_bpm, loop_start_index, revision, created_at, updated_at)
        values (${value.id}, ${value.ownerId}, ${value.title}, ${value.practiceBpm}, ${value.loopStartIndex}, ${value.revision}, ${value.createdAt}, ${value.updatedAt})`;
      await this.insertSteps(sql, value);
    });
  }
  async updateSequence(value: SequenceRecord, expectedRevision: number): Promise<boolean> {
    return this.sql.begin(async sql => {
      const rows = await sql`update sequences set title=${value.title}, practice_bpm=${value.practiceBpm}, loop_start_index=${value.loopStartIndex}, revision=${value.revision}, updated_at=${value.updatedAt}
        where id=${value.id} and owner_id=${value.ownerId} and revision=${expectedRevision} returning id`;
      if (!rows[0]) return false;
      await sql`delete from sequence_steps where sequence_id=${value.id} and owner_id=${value.ownerId}`;
      await this.insertSteps(sql, value);
      return true;
    });
  }
  async deleteSequence(ownerId: string, id: string): Promise<boolean> {
    const rows = await this.sql`delete from sequences where id=${id} and owner_id=${ownerId} returning id`;
    return rows.length === 1;
  }
  async createPracticeSession(value: { id: string; ownerId: string; sequenceId: string | null; bpm: number; durationSeconds: number; completed: boolean; startedAt: string; endedAt: string | null }): Promise<void> {
    await this.sql`insert into practice_sessions (id, owner_id, sequence_id, bpm, duration_seconds, completed, started_at, ended_at)
      values (${value.id}, ${value.ownerId}, ${value.sequenceId}, ${value.bpm}, ${value.durationSeconds}, ${value.completed}, ${value.startedAt}, ${value.endedAt})`;
  }
  async getSubscription(ownerId: string): Promise<SubscriptionRecord | null> {
    const rows = await this.sql`select * from subscriptions where owner_id=${ownerId} limit 1`;
    const row = rows[0];
    return row ? { ownerId, stripeCustomerId: row.stripe_customer_id ? String(row.stripe_customer_id) : null, stripeSubscriptionId: row.stripe_subscription_id ? String(row.stripe_subscription_id) : null, status: String(row.status), priceId: row.price_id ? String(row.price_id) : null, currentPeriodEnd: row.current_period_end ? iso(row.current_period_end) : null, lastEventCreatedAt: row.last_event_created_at ? iso(row.last_event_created_at) : null } : null;
  }
  async saveSubscription(value: SubscriptionRecord): Promise<void> {
    await this.sql`insert into subscriptions (owner_id, stripe_customer_id, stripe_subscription_id, status, price_id, current_period_end, last_event_created_at, updated_at)
      values (${value.ownerId}, ${value.stripeCustomerId}, ${value.stripeSubscriptionId}, ${value.status}, ${value.priceId}, ${value.currentPeriodEnd}, ${value.lastEventCreatedAt}, now())
      on conflict (owner_id) do update set stripe_customer_id=excluded.stripe_customer_id, stripe_subscription_id=excluded.stripe_subscription_id, status=excluded.status, price_id=excluded.price_id, current_period_end=excluded.current_period_end, last_event_created_at=excluded.last_event_created_at, updated_at=now()`;
  }
  async claimStripeEvent(id: string, createdAt: string): Promise<boolean> {
    const rows = await this.sql`insert into stripe_events (id, event_created_at) values (${id}, ${createdAt}) on conflict do nothing returning id`;
    return rows.length === 1;
  }
  async deleteAccountData(ownerId: string): Promise<void> {
    await this.sql.begin(async sql => {
      await sql`delete from practice_sessions where owner_id=${ownerId}`;
      await sql`delete from sequences where owner_id=${ownerId}`;
      await sql`delete from subscriptions where owner_id=${ownerId}`;
      await sql`delete from profiles where id=${ownerId}`;
    });
  }
  private mapSequence(row: Row, allSteps: Row[]): SequenceRecord {
    return { id: String(row.id), ownerId: String(row.owner_id), title: String(row.title), practiceBpm: Number(row.practice_bpm), loopStartIndex: Number(row.loop_start_index), revision: Number(row.revision), steps: allSteps.filter(step => String(step.sequence_id) === String(row.id)).map(mapStep), createdAt: iso(row.created_at), updatedAt: iso(row.updated_at) };
  }
  private async insertSteps(sql: Sql | TransactionSql, value: SequenceRecord): Promise<void> {
    if (!value.steps.length) return;
    await sql`insert into sequence_steps ${sql(value.steps.map((step, position) => ({ id: step.id, sequence_id: value.id, owner_id: value.ownerId, position, chord_root: step.key, chord_suffix: step.suffix, bass_note: step.bassNote ?? null, display_root: step.displayKey ?? null, display_bass_note: step.displayBassNote ?? null, position_index: step.positionIndex, practice_beats: step.practiceBeats })))}`;
  }
}
