-- Phase 3: mirror add-on for non-vendor users
alter table public.profiles
  add column if not exists mirror_addon boolean not null default false;

-- Phase 4: merchants / embed
create table if not exists public.merchants (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  slug text unique not null,
  logo_url text,
  primary_color text default '#4c5cff',
  website_url text,
  monthly_allowance integer not null default 500,
  credits_balance integer not null default 500,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.merchant_api_keys (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  key_hash text not null,
  key_prefix text not null,
  label text default 'Default',
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.merchant_usage (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  event text not null check (event in ('snapshot', 'clip', 'realtime', 'embed_open')),
  credits integer not null default 0,
  meta jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists merchant_usage_merchant_id_idx on public.merchant_usage(merchant_id);
create index if not exists merchant_usage_created_at_idx on public.merchant_usage(created_at desc);

alter table public.merchants enable row level security;
alter table public.merchant_api_keys enable row level security;
alter table public.merchant_usage enable row level security;

create policy "Owners manage merchants"
  on public.merchants for all using (auth.uid() = owner_user_id);

create policy "Owners view usage"
  on public.merchant_usage for select using (
    exists (
      select 1 from public.merchants m
      where m.id = merchant_id and m.owner_user_id = auth.uid()
    )
  );

create policy "Owners view api keys"
  on public.merchant_api_keys for select using (
    exists (
      select 1 from public.merchants m
      where m.id = merchant_id and m.owner_user_id = auth.uid()
    )
  );
