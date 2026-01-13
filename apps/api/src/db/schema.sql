create extension if not exists pgcrypto;

create table if not exists ingredient (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  name text not null,
  internal_code text,
  synonyms text[] default '{}',
  tags text[] default '{}',
  updated_at timestamptz not null default now()
);

create index if not exists idx_ingredient_tenant on ingredient (tenant_id);
create index if not exists idx_ingredient_name_trgm on ingredient using gin (name gin_trgm_ops);

create table if not exists outbox_event (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  event_type text not null,
  aggregate_type text not null,
  aggregate_id uuid not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists idx_outbox_unprocessed on outbox_event (processed_at) where processed_at is null;
create index if not exists idx_outbox_tenant on outbox_event (tenant_id);
