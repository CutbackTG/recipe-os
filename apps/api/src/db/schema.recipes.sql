-- Recipes core tables

create table if not exists recipe (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  name text not null,
  code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_recipe_tenant on recipe (tenant_id);

create table if not exists recipe_draft (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  recipe_id uuid not null references recipe(id) on delete cascade,
  name text not null,
  status text not null default 'draft', -- draft|published (later)
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_recipe_draft_recipe on recipe_draft (recipe_id);
create index if not exists idx_recipe_draft_tenant on recipe_draft (tenant_id);

create table if not exists recipe_line_item (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  draft_id uuid not null references recipe_draft(id) on delete cascade,
  ingredient_id uuid not null references ingredient(id),
  pct numeric(10,6) not null, -- percent of formula (0-100)
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(draft_id, ingredient_id)
);

create index if not exists idx_line_item_draft on recipe_line_item (draft_id);

-- Minimal ingredient economics + nutrients for rollups (MVP)
alter table ingredient
  add column if not exists cost_per_kg numeric(12,6) default 0;

alter table ingredient
  add column if not exists protein_g_per_100g numeric(12,6) default 0;

alter table ingredient
  add column if not exists sugar_g_per_100g numeric(12,6) default 0;
