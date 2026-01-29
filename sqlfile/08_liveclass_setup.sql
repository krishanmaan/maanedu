-- Create table: Liveclass
create table if not exists public."Liveclass" (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  description text,
  image_url text,
  starts_at timestamptz,
  -- Cannot use now() in generated columns (not immutable). Maintain via trigger:
  is_upcoming boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Trigger to update updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;$$ language plpgsql;

drop trigger if exists set_liveclass_updated_at on public."Liveclass";
create trigger set_liveclass_updated_at
before update on public."Liveclass"
for each row execute function public.set_updated_at();

-- Compute is_upcoming before insert/update
create or replace function public.set_liveclass_is_upcoming()
returns trigger as $$
begin
  new.is_upcoming = (new.starts_at is null or new.starts_at > now());
  return new;
end;$$ language plpgsql;

drop trigger if exists trg_liveclass_is_upcoming on public."Liveclass";
create trigger trg_liveclass_is_upcoming
before insert or update of starts_at on public."Liveclass"
for each row execute function public.set_liveclass_is_upcoming();

-- Enable RLS
alter table public."Liveclass" enable row level security;

-- Example RLS policies (adjust for your auth schema)
-- Allow authenticated users to select their tenant's data. If you use a tenant column, add it here.
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'Liveclass' and policyname = 'Liveclass select'
  ) then
    create policy "Liveclass select" on public."Liveclass"
      for select using (auth.role() = 'authenticated');
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'Liveclass' and policyname = 'Liveclass insert'
  ) then
    create policy "Liveclass insert" on public."Liveclass"
      for insert with check (auth.role() = 'authenticated');
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'Liveclass' and policyname = 'Liveclass update'
  ) then
    create policy "Liveclass update" on public."Liveclass"
      for update using (auth.role() = 'authenticated');
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'Liveclass' and policyname = 'Liveclass delete'
  ) then
    create policy "Liveclass delete" on public."Liveclass"
      for delete using (auth.role() = 'authenticated');
  end if;
end $$;


