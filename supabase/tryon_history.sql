-- Try-on history (kept 24h, then auto-deleted)
-- Run once in the Supabase SQL editor.

-- Private storage bucket for result images
insert into storage.buckets (id, name, public)
values ('tryon-history', 'tryon-history', false)
on conflict (id) do nothing;

create table if not exists public.tryon_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null,
  watermarked boolean not null default false,
  credits_used integer not null default 0,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);

create index if not exists tryon_history_user_created_idx
  on public.tryon_history(user_id, created_at desc);
create index if not exists tryon_history_expires_idx
  on public.tryon_history(expires_at);

alter table public.tryon_history enable row level security;

-- Users can only see their own, non-expired items.
-- Rows are inserted/deleted by the server (service role), which bypasses RLS.
drop policy if exists "Users view own live history" on public.tryon_history;
create policy "Users view own live history"
  on public.tryon_history for select
  using (auth.uid() = user_id and expires_at > now());
