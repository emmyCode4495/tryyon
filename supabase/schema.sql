-- tryyON database schema
-- Run this in the Supabase SQL editor

-- Profiles (extends auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  credits integer not null default 10 check (credits >= 0),
  plan text not null default 'free' check (plan in ('free', 'shopper', 'vendor', 'brand')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Credit transactions ledger
create table if not exists public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount integer not null, -- positive = top-up, negative = spend
  balance_after integer not null,
  reason text not null, -- 'signup_bonus', 'purchase', 'tryon_snapshot', 'tryon_clip', 'refund', etc.
  reference text, -- Flutterwave tx_ref or internal id
  metadata jsonb default '{}',
  created_at timestamptz not null default now()
);

create index if not exists credit_transactions_user_id_idx on public.credit_transactions(user_id);
create index if not exists credit_transactions_reference_idx on public.credit_transactions(reference);

-- Payment records (Flutterwave)
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  tx_ref text unique not null,
  flw_ref text,
  amount_ngn numeric(12,2) not null,
  credits_purchased integer not null,
  status text not null default 'pending' check (status in ('pending', 'successful', 'failed')),
  raw_response jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payments_user_id_idx on public.payments(user_id);
create index if not exists payments_tx_ref_idx on public.payments(tx_ref);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, credits, plan)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    10, -- free signup bonus
    'free'
  );

  insert into public.credit_transactions (user_id, amount, balance_after, reason)
  values (new.id, 10, 10, 'signup_bonus');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Updated_at helper
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

-- RLS
alter table public.profiles enable row level security;
alter table public.credit_transactions enable row level security;
alter table public.payments enable row level security;

create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Users can view own transactions"
  on public.credit_transactions for select using (auth.uid() = user_id);

create policy "Users can view own payments"
  on public.payments for select using (auth.uid() = user_id);

-- Realtime: enable for profiles so credit balance updates live
alter publication supabase_realtime add table public.profiles;
