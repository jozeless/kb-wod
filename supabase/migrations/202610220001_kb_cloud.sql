-- Run only after review in the existing KB WODS project. No production execution by this PR.
begin;
create table public.kb_training_sessions (
  user_id uuid not null references auth.users(id) on delete cascade,
  id uuid not null,
  workout_id text not null,
  workout_version integer not null check (workout_version > 0),
  workout_snapshot jsonb not null check (jsonb_typeof(workout_snapshot) = 'object'),
  results jsonb not null check (jsonb_typeof(results) = 'object'),
  session_data jsonb not null check (jsonb_typeof(session_data) = 'object'),
  started_at timestamptz not null,
  completed_at timestamptz not null check (completed_at >= started_at),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index kb_training_sessions_user_workout on public.kb_training_sessions(user_id, workout_id, started_at desc);
create table public.kb_weekly_plan (
  user_id uuid not null references auth.users(id) on delete cascade,
  weekday text not null check (weekday in ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday')),
  workout_id text,
  workout_version integer,
  updated_at timestamptz not null default now(),
  primary key(user_id, weekday),
  check ((workout_id is null and workout_version is null) or (workout_id is not null and workout_version is not null and workout_version > 0))
);
-- No catalog FK: definitions and historical versions remain in the static catalog/snapshot.
create function public.kb_set_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
revoke all on function public.kb_set_updated_at() from public, anon, authenticated;
create trigger kb_training_updated before update on public.kb_training_sessions for each row execute function public.kb_set_updated_at();
create trigger kb_plan_updated before update on public.kb_weekly_plan for each row execute function public.kb_set_updated_at();
alter table public.kb_training_sessions enable row level security;
alter table public.kb_weekly_plan enable row level security;
revoke all on public.kb_training_sessions, public.kb_weekly_plan from public, anon;
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.kb_training_sessions, public.kb_weekly_plan to authenticated;
create policy kb_sessions_select on public.kb_training_sessions for select to authenticated using ((select auth.uid()) = user_id);
create policy kb_sessions_insert on public.kb_training_sessions for insert to authenticated with check ((select auth.uid()) = user_id);
create policy kb_sessions_update on public.kb_training_sessions for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy kb_sessions_delete on public.kb_training_sessions for delete to authenticated using ((select auth.uid()) = user_id);
create policy kb_plan_select on public.kb_weekly_plan for select to authenticated using ((select auth.uid()) = user_id);
create policy kb_plan_insert on public.kb_weekly_plan for insert to authenticated with check ((select auth.uid()) = user_id);
create policy kb_plan_update on public.kb_weekly_plan for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy kb_plan_delete on public.kb_weekly_plan for delete to authenticated using ((select auth.uid()) = user_id);
commit;
