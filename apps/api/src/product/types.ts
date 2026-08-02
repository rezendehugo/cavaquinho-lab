export type Plan = 'free' | 'pro';

export interface Profile {
  id: string;
  displayName: string | null;
  plan: Plan;
  onboardingCompleted: boolean;
  localMigrationCompletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SequenceStepRecord {
  id: string;
  key: string;
  suffix: string;
  bassNote?: string;
  displayKey?: string;
  displayBassNote?: string;
  positionIndex: number | null;
  practiceBeats: number;
}

export interface SequenceRecord {
  id: string;
  ownerId: string;
  title: string;
  practiceBpm: number;
  loopStartIndex: number;
  revision: number;
  steps: SequenceStepRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionRecord {
  ownerId: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  status: string;
  priceId: string | null;
  currentPeriodEnd: string | null;
  lastEventCreatedAt: string | null;
}
