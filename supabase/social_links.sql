-- Social account linking for bots (Telegram, WhatsApp, X, etc.)
-- Run this in the Supabase SQL editor after the main schema.

create table if not exists public.social_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  platform text not null check (platform in ('telegram', 'whatsapp', 'x', 'discord')),
  platform_user_id text not null,          -- e.g. Telegram numeric user id as string
  platform_username text,                  -- @username if available
  display_name text,
  linked_at timestamptz not null default now(),
  last_used_at timestamptz,
  metadata jsonb default '{}'::jsonb,

  unique (platform, platform_user_id)
);

create index if not exists social_links_user_id_idx on public.social_links(user_id);
create index if not exists social_links_platform_uid_idx on public.social_links(platform, platform_user_id);

-- One-time link codes (user generates on website, pastes into bot, or clicks deep link)
create table if not exists public.social_link_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  code text not null unique,               -- short code e.g. "TRY-8F3K2A"
  platform text,                           -- optional: restrict to one platform
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists social_link_codes_code_idx on public.social_link_codes(code);

-- RLS
alter table public.social_links enable row level security;
alter table public.social_link_codes enable row level security;

create policy "Users can view own social links"
  on public.social_links for select using (auth.uid() = user_id);

create policy "Users can delete own social links"
  on public.social_links for delete using (auth.uid() = user_id);

create policy "Users can view own link codes"
  on public.social_link_codes for select using (auth.uid() = user_id);

-- Service role (bots) will use createServiceClient and bypass RLS
