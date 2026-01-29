-- =====================================================
-- MaanEdu - Full Supabase Setup Script
-- Purpose: Run this once on a fresh Supabase project to create all required
--          tables, functions, policies, indexes, views and storage policies.
-- Notes:
-- - Safe to re-run: uses IF NOT EXISTS where possible and CREATE OR REPLACE for functions/views
-- - Requires: Supabase default schemas (public, auth, storage)
-- - Extensions: uuid-ossp, pgcrypto for gen_random_uuid()
-- =====================================================

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- =====================================================
-- Shared utility function: update_updated_at_column
-- =====================================================
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- =====================================================
-- Users (profile) table linked to auth.users
-- =====================================================
create table if not exists public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  email text unique not null,
  name text,
  avatar text,
  phone text,
  date_of_birth date,
  gender text check (gender in ('male','female','other')),
  address text,
  city text,
  state text,
  country text default 'India',
  pincode text,
  education_level text,
  school_college_name text,
  parent_name text,
  parent_phone text,
  parent_email text,
  batch_year integer default 2025,
  enrollment_date timestamptz default now(),
  last_login timestamptz,
  is_active boolean default true,
  is_verified boolean default false,
  profile_completed boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_users_email on public.users(email);
create index if not exists idx_users_batch_year on public.users(batch_year);
create index if not exists idx_users_is_active on public.users(is_active);
create index if not exists idx_users_created_at on public.users(created_at);

alter table public.users enable row level security;

-- RLS policies
drop policy if exists "Users can view own profile" on public.users;
create policy "Users can view own profile" on public.users for select using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.users;
create policy "Users can update own profile" on public.users for update using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.users;
create policy "Users can insert own profile" on public.users for insert with check (auth.uid() = id);

-- Auto-create profile on auth signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, name, avatar)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name',''), coalesce(new.raw_user_meta_data->>'avatar',''))
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Updated-at trigger
drop trigger if exists update_users_updated_at on public.users;
create trigger update_users_updated_at
  before update on public.users
  for each row execute function public.update_updated_at_column();

comment on table public.users is 'Main users table storing profile information';

-- Public profile view (no sensitive fields)
create or replace view public.user_profiles as
select id, name, avatar, batch_year, education_level, school_college_name, created_at
from public.users where is_active = true;
grant select on public.user_profiles to anon, authenticated;

-- Storage: avatars bucket and policies
insert into storage.buckets (id, name, public)
values ('avatars','avatars', true)
on conflict (id) do nothing;

drop policy if exists "Allow authenticated users to upload their own avatar" on storage.objects;
create policy "Allow authenticated users to upload their own avatar" on storage.objects
  for insert with check (bucket_id = 'avatars' and auth.uid() = (storage.foldername(name))[2]::uuid);

drop policy if exists "Allow authenticated users to view avatars" on storage.objects;
create policy "Allow authenticated users to view avatars" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "Allow authenticated users to update their own avatar" on storage.objects;
create policy "Allow authenticated users to update their own avatar" on storage.objects
  for update using (bucket_id = 'avatars' and auth.uid() = (storage.foldername(name))[2]::uuid);

drop policy if exists "Allow authenticated users to delete their own avatar" on storage.objects;
create policy "Allow authenticated users to delete their own avatar" on storage.objects
  for delete using (bucket_id = 'avatars' and auth.uid() = (storage.foldername(name))[2]::uuid);

-- =====================================================
-- Courses and Classes
-- =====================================================
create table if not exists public.courses (
  id uuid default uuid_generate_v4() primary key,
  title varchar(255) not null,
  description text,
  category varchar(100),
  level varchar(50),
  image_url text,
  price numeric(10,2) default 0.00,
  instructor_id uuid,
  duration_hours integer default 0,
  is_active boolean default true,
  settings jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_courses_category on public.courses(category);
create index if not exists idx_courses_level on public.courses(level);
create index if not exists idx_courses_instructor on public.courses(instructor_id);
create index if not exists idx_courses_settings_gin on public.courses using gin (settings);

alter table public.courses enable row level security;
drop policy if exists "Courses are viewable by everyone" on public.courses;
create policy "Courses are viewable by everyone" on public.courses for select using (true);

drop policy if exists "Courses are insertable by authenticated users" on public.courses;
create policy "Courses are insertable by authenticated users" on public.courses for insert with check (auth.role() = 'authenticated');

drop policy if exists "Courses are updatable by owner" on public.courses;
create policy "Courses are updatable by owner" on public.courses for update using (auth.uid() = instructor_id);

drop policy if exists "Courses are deletable by owner" on public.courses;
create policy "Courses are deletable by owner" on public.courses for delete using (auth.uid() = instructor_id);

drop trigger if exists update_courses_updated_at on public.courses;
create trigger update_courses_updated_at before update on public.courses
  for each row execute function public.update_updated_at_column();

create table if not exists public.classes (
  id uuid default uuid_generate_v4() primary key,
  course_id uuid references public.courses(id) on delete cascade,
  title varchar(255) not null,
  description text,
  video_url text,
  image_url text,
  mux_asset_id text,
  mux_playback_id text,
  duration_minutes integer default 0,
  order_index integer default 0,
  is_free boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_classes_course on public.classes(course_id);
create index if not exists idx_classes_mux_asset_id on public.classes(mux_asset_id);
create index if not exists idx_classes_mux_playback_id on public.classes(mux_playback_id);

alter table public.classes enable row level security;
drop policy if exists "Classes are viewable by everyone" on public.classes;
create policy "Classes are viewable by everyone" on public.classes for select using (true);

drop policy if exists "Classes are insertable by course instructor" on public.classes;
create policy "Classes are insertable by course instructor" on public.classes for insert with check (
  exists (
    select 1 from public.courses
    where courses.id = classes.course_id and courses.instructor_id = auth.uid()
  )
);

drop policy if exists "Classes are updatable by course instructor" on public.classes;
create policy "Classes are updatable by course instructor" on public.classes for update using (
  exists (
    select 1 from public.courses
    where courses.id = classes.course_id and courses.instructor_id = auth.uid()
  )
);

drop policy if exists "Classes are deletable by course instructor" on public.classes;
create policy "Classes are deletable by course instructor" on public.classes for delete using (
  exists (
    select 1 from public.courses
    where courses.id = classes.course_id and courses.instructor_id = auth.uid()
  )
);

drop trigger if exists update_classes_updated_at on public.classes;
create trigger update_classes_updated_at before update on public.classes
  for each row execute function public.update_updated_at_column();

-- =====================================================
-- Enrollments and Progress
-- =====================================================
create table if not exists public.enrollments (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  completed_at timestamptz,
  progress_percentage numeric(5,2) default 0.00,
  unique(user_id, course_id)
);

create index if not exists idx_enrollments_user on public.enrollments(user_id);
create index if not exists idx_enrollments_course on public.enrollments(course_id);

alter table public.enrollments enable row level security;
drop policy if exists enrollments_insert_self on public.enrollments;
create policy enrollments_insert_self on public.enrollments for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists enrollments_select_self on public.enrollments;
create policy enrollments_select_self on public.enrollments for select to authenticated using (auth.uid() = user_id);

drop policy if exists "Users can update their own enrollments" on public.enrollments;
create policy "Users can update their own enrollments" on public.enrollments for update using (auth.uid() = user_id);

create table if not exists public.progress (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade,
  class_id uuid references public.classes(id) on delete cascade,
  watched_duration integer default 0,
  is_completed boolean default false,
  last_watched_at timestamptz default now(),
  unique(user_id, class_id)
);

create index if not exists idx_progress_user on public.progress(user_id);
create index if not exists idx_progress_class on public.progress(class_id);

alter table public.progress enable row level security;
drop policy if exists "Users can view their own progress" on public.progress;
create policy "Users can view their own progress" on public.progress for select using (auth.uid() = user_id);

drop policy if exists "Users can insert their own progress" on public.progress;
create policy "Users can insert their own progress" on public.progress for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update their own progress" on public.progress;
create policy "Users can update their own progress" on public.progress for update using (auth.uid() = user_id);

-- =====================================================
-- Links
-- =====================================================
create table if not exists public.links (
  id uuid default gen_random_uuid() primary key,
  title varchar(255) not null,
  description text,
  url text not null,
  thumbnail_url text,
  category varchar(100),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  is_active boolean default true,
  sort_order integer default 0,
  created_by uuid references auth.users(id),
  metadata jsonb default '{}'::jsonb
);

create index if not exists idx_links_active on public.links(is_active);
create index if not exists idx_links_category on public.links(category);
create index if not exists idx_links_sort_order on public.links(sort_order);
create index if not exists idx_links_created_at on public.links(created_at desc);

alter table public.links enable row level security;
drop policy if exists "Allow authenticated users to read active links" on public.links;
create policy "Allow authenticated users to read active links" on public.links for select using (auth.role() = 'authenticated' and is_active = true);

drop policy if exists "Allow authenticated users to read all links" on public.links;
create policy "Allow authenticated users to read all links" on public.links for select using (auth.role() = 'authenticated');

drop policy if exists "Allow authenticated users to insert links" on public.links;
create policy "Allow authenticated users to insert links" on public.links for insert with check (auth.role() = 'authenticated');

drop policy if exists "Allow users to update their own links" on public.links;
create policy "Allow users to update their own links" on public.links for update using (auth.uid() = created_by);

drop policy if exists "Allow users to delete their own links" on public.links;
create policy "Allow users to delete their own links" on public.links for delete using (auth.uid() = created_by);

drop trigger if exists update_links_updated_at on public.links;
create trigger update_links_updated_at before update on public.links
  for each row execute function public.update_updated_at_column();

-- View: active links
create or replace view public.active_links as
select id, title, description, url, thumbnail_url, category, created_at, updated_at, sort_order, metadata
from public.links where is_active = true order by sort_order asc, created_at desc;
grant select on public.active_links to authenticated;

-- =====================================================
-- Banners
-- =====================================================
create table if not exists public.banners (
  id uuid default uuid_generate_v4() primary key,
  title varchar(255) not null,
  subtitle varchar(255),
  description text,
  image_url text not null,
  background_color varchar(7) default '#6D57FC',
  text_color varchar(7) default '#FFFFFF',
  badge_text varchar(100),
  badge_color varchar(7) default '#FF9800',
  is_active boolean default true,
  display_order integer default 0,
  target_route varchar(255),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.banners enable row level security;
drop policy if exists "Banners are viewable by everyone" on public.banners;
create policy "Banners are viewable by everyone" on public.banners for select using (is_active = true);

drop policy if exists "Banners are insertable by authenticated users" on public.banners;
create policy "Banners are insertable by authenticated users" on public.banners for insert with check (auth.role() = 'authenticated');

drop policy if exists "Banners are updatable by authenticated users" on public.banners;
create policy "Banners are updatable by authenticated users" on public.banners for update using (auth.role() = 'authenticated');

drop policy if exists "Banners are deletable by authenticated users" on public.banners;
create policy "Banners are deletable by authenticated users" on public.banners for delete using (auth.role() = 'authenticated');

create index if not exists idx_banners_active on public.banners(is_active);
create index if not exists idx_banners_display_order on public.banners(display_order);

drop trigger if exists update_banners_updated_at on public.banners;
create trigger update_banners_updated_at before update on public.banners
  for each row execute function public.update_updated_at_column();

-- View: active banners
create or replace view public.active_banners as
select id, title, subtitle, description, image_url, background_color, text_color, badge_text, badge_color, display_order, target_route, created_at, updated_at
from public.banners where is_active = true order by display_order asc, created_at desc;

-- Helper function to get primary banner
create or replace function public.get_primary_banner()
returns table (
  id uuid,
  title varchar(255),
  subtitle varchar(255),
  description text,
  image_url text,
  background_color varchar(7),
  text_color varchar(7),
  badge_text varchar(100),
  badge_color varchar(7),
  target_route varchar(255)
) as $$
begin
  return query
  select b.id, b.title, b.subtitle, b.description, b.image_url, b.background_color, b.text_color, b.badge_text, b.badge_color, b.target_route
  from public.banners b
  where b.is_active = true
  order by b.display_order asc, b.created_at desc
  limit 1;
end;
$$ language plpgsql security definer;

grant execute on function public.get_primary_banner() to anon, authenticated;

-- =====================================================
-- Liveclass
-- =====================================================
create table if not exists public."Liveclass" (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  description text,
  image_url text,
  starts_at timestamptz,
  is_upcoming boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;$$ language plpgsql;

drop trigger if exists set_liveclass_updated_at on public."Liveclass";
create trigger set_liveclass_updated_at before update on public."Liveclass"
for each row execute function public.set_updated_at();

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

alter table public."Liveclass" enable row level security;
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'Liveclass' and policyname = 'Liveclass select'
  ) then
    create policy "Liveclass select" on public."Liveclass" for select using (auth.role() = 'authenticated');
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'Liveclass' and policyname = 'Liveclass insert'
  ) then
    create policy "Liveclass insert" on public."Liveclass" for insert with check (auth.role() = 'authenticated');
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'Liveclass' and policyname = 'Liveclass update'
  ) then
    create policy "Liveclass update" on public."Liveclass" for update using (auth.role() = 'authenticated');
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'Liveclass' and policyname = 'Liveclass delete'
  ) then
    create policy "Liveclass delete" on public."Liveclass" for delete using (auth.role() = 'authenticated');
  end if;
end $$;

-- =====================================================
-- Purchases
-- =====================================================
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

create index if not exists purchases_user_idx on public.purchases(user_id);
create index if not exists purchases_course_idx on public.purchases(course_id);

alter table public.purchases enable row level security;
drop policy if exists purchases_insert_self on public.purchases;
create policy purchases_insert_self on public.purchases for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists purchases_select_self on public.purchases;
create policy purchases_select_self on public.purchases for select to authenticated using (auth.uid() = user_id);

-- =====================================================
-- Analytics view
-- =====================================================
create or replace view public.course_stats as
select 
  c.id,
  c.title,
  c.category,
  c.level,
  c.price,
  count(distinct e.user_id) as enrolled_students,
  count(cl.id) as total_classes,
  avg(e.progress_percentage) as avg_progress
from public.courses c
left join public.enrollments e on c.id = e.course_id
left join public.classes cl on c.id = cl.course_id
left join public.progress p on cl.id = p.class_id
group by c.id, c.title, c.category, c.level, c.price;

-- =====================================================
-- Grants
-- =====================================================
grant usage on schema public to anon, authenticated;
grant all on all tables in schema public to anon, authenticated;
grant all on all sequences in schema public to anon, authenticated;
grant all on all functions in schema public to anon, authenticated;

-- Done.


