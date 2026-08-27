-- 002 — Rate-Limit (Postgres Fixed-Window)
-- Wird von src/lib/rate-limit.ts via service-role-RPC aufgerufen,
-- damit der Check auch pre-auth (Login) funktioniert.
-- Hintergrund: docs/architektur/rate-limiting.md

create table public.rate_limits (
  identifier text not null,
  action text not null,
  window_start timestamptz not null default now(),
  attempts int not null default 0,
  primary key (identifier, action)
);

-- ─── Zugriffsschutz ────────────────────────────────────────────────────
-- Ohne RLS ist eine Tabelle im public-Schema über PostgREST mit dem
-- öffentlichen Anon-Key erreichbar. Wer diese hier leeren kann, setzt
-- seinen eigenen Login-Zähler zurück und hebelt die Brute-Force-Sperre aus.
--
-- Es braucht KEINE Policy: der einzige Zugriff läuft über
-- check_and_increment_rate_limit() weiter unten — SECURITY DEFINER und nur
-- für service_role ausführbar, und service_role umgeht RLS ohnehin.
-- Eine Policy würde anon/authenticated nur wieder Zugriff öffnen.
alter table public.rate_limits enable row level security;
revoke all on table public.rate_limits from anon, authenticated;

-- Cleanup alter Einträge (>24h) — pg_cron-Aufruf optional
create or replace function public.cleanup_rate_limits()
returns void
language sql
as $$
  delete from public.rate_limits
  where window_start < now() - interval '24 hours';
$$;

-- ─── RPC: atomar prüfen + inkrementieren ───────────────────────────────
create or replace function public.check_and_increment_rate_limit(
  p_identifier text,
  p_action text,
  p_max_attempts int,
  p_window_seconds int
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window_start timestamptz;
  v_attempts int;
begin
  -- Versuche bestehenden Eintrag zu sperren
  select window_start, attempts
    into v_window_start, v_attempts
  from public.rate_limits
  where identifier = p_identifier and action = p_action
  for update;

  if not found then
    insert into public.rate_limits (identifier, action, attempts)
    values (p_identifier, p_action, 1);
    return true;
  end if;

  -- Window abgelaufen → reset
  if v_window_start < now() - (p_window_seconds || ' seconds')::interval then
    update public.rate_limits
       set window_start = now(),
           attempts = 1
     where identifier = p_identifier and action = p_action;
    return true;
  end if;

  -- Limit erreicht?
  if v_attempts >= p_max_attempts then
    return false;
  end if;

  -- inkrementieren + erlauben
  update public.rate_limits
     set attempts = attempts + 1
   where identifier = p_identifier and action = p_action;
  return true;
end;
$$;

revoke all on function public.check_and_increment_rate_limit(text, text, int, int) from public;
grant execute on function public.check_and_increment_rate_limit(text, text, int, int) to service_role;
