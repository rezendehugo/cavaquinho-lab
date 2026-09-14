create table if not exists profiles (
  id uuid primary key,
  display_name text,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  onboarding_completed boolean not null default false,
  local_migration_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists sequences (
  id uuid primary key,
  owner_id uuid not null,
  title text not null,
  practice_bpm integer not null check (practice_bpm between 40 and 220),
  loop_start_index integer not null default 0,
  revision integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sequences_owner_updated on sequences (owner_id, updated_at desc);

create table if not exists sequence_steps (
  id uuid primary key,
  sequence_id uuid not null references sequences(id) on delete cascade,
  owner_id uuid not null,
  position integer not null,
  chord_root text not null,
  chord_suffix text not null,
  bass_note text,
  display_root text,
  display_bass_note text,
  position_index integer,
  practice_beats integer not null check (practice_beats between 1 and 16),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (sequence_id, position)
);

create index if not exists sequence_steps_owner_sequence on sequence_steps (owner_id, sequence_id, position);

create table if not exists practice_sessions (
  id uuid primary key,
  owner_id uuid not null,
  sequence_id uuid references sequences(id) on delete set null,
  bpm integer not null check (bpm between 40 and 220),
  duration_seconds integer not null check (duration_seconds >= 0),
  completed boolean not null default false,
  started_at timestamptz not null,
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists practice_sessions_owner_created on practice_sessions (owner_id, created_at desc);

create table if not exists subscriptions (
  owner_id uuid primary key,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  status text not null default 'inactive',
  price_id text,
  current_period_end timestamptz,
  last_event_created_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists stripe_events (
  id text primary key,
  event_created_at timestamptz not null,
  processed_at timestamptz not null default now()
);
