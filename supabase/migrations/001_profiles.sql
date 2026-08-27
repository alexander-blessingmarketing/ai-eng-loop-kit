-- 001 — Profiles + Auth-Trigger + RLS
-- Baseline-Schema für jedes Projekt aus dem AI Coding Starter Kit.

-- ─── Profiles ──────────────────────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'user' check (role in ('admin', 'user')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create index idx_profiles_email on public.profiles(email);
create index idx_profiles_role on public.profiles(role);

-- ─── Auth-Trigger: anlegen + email-sync ────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── updated_at-Trigger ─────────────────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ─── RLS ────────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;

-- User: eigenen Datensatz lesen + updaten
create policy "profiles_select_own"
  on public.profiles
  for select
  using ((select auth.uid()) = id);

create policy "profiles_update_own"
  on public.profiles
  for update
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Admin: alles
create policy "profiles_admin_all"
  on public.profiles
  for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role = 'admin'
    )
  );
