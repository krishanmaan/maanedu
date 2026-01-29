-- Purchases table to store course payments by users
-- Run this in Supabase SQL editor or via CLI

-- Enable UUID if not already
create extension if not exists "uuid-ossp";

-- Table: purchases
create table if not exists public.purchases (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  amount_paise integer not null check (amount_paise >= 0),
  currency text not null default 'INR',
  payment_id text,
  order_id text,
  signature text,
  status text not null default 'success',
  created_at timestamptz not null default now(),
  unique(user_id, course_id, payment_id)
);

-- Indexes
create index if not exists purchases_user_idx on public.purchases(user_id);
create index if not exists purchases_course_idx on public.purchases(course_id);

-- RLS
alter table public.purchases enable row level security;

-- Policy: users can insert their own purchases
drop policy if exists purchases_insert_self on public.purchases;
create policy purchases_insert_self on public.purchases
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Policy: users can view their own purchases
drop policy if exists purchases_select_self on public.purchases;
create policy purchases_select_self on public.purchases
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Optional Admin policy (if you have a 'service_role' or 'admin' via JWT)
-- Adjust to your setup; otherwise manage via SQL editor when needed.
-- create policy purchases_all for all to service_role using (true) with check (true);

-- RLS for enrollments (allow users to insert/select their own)
-- Create enrollments table if it's missing
create table if not exists public.enrollments (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  completed_at timestamptz,
  progress_percentage numeric(5,2) default 0.00,
  unique(user_id, course_id)
);

alter table if exists public.enrollments enable row level security;

drop policy if exists enrollments_insert_self on public.enrollments;
create policy enrollments_insert_self on public.enrollments
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists enrollments_select_self on public.enrollments;
create policy enrollments_select_self on public.enrollments
  for select
  to authenticated
  using (auth.uid() = user_id);


