-- Review and apply manually after 202610220001_kb_cloud.sql. Never run automatically.
begin;
create table public.kb_workout_visibility (
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_id text not null check (workout_id ~ '^[a-z0-9][a-z0-9-]{0,199}$'),
  hidden boolean not null,
  revision bigint not null check (revision > 0),
  operation_id uuid not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, workout_id)
);
alter table public.kb_workout_visibility enable row level security;
revoke all on public.kb_workout_visibility from public, anon, authenticated;
grant select on public.kb_workout_visibility to authenticated;
create policy kb_visibility_select on public.kb_workout_visibility for select to authenticated
  using ((select auth.uid()) = user_id);

-- The same account lock precedes plan row locks, avoiding races/deadlocks between
-- a visibility transaction and an ordinary bulk weekly-plan upsert.
create function public.kb_lock_library_workspace() returns trigger
language plpgsql set search_path = '' as $$
begin
  if auth.uid() is not null then
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(auth.uid()::text, 371));
  end if;
  return null;
end;
$$;
create trigger kb_plan_library_lock before insert or update on public.kb_weekly_plan
  for each statement execute function public.kb_lock_library_workspace();
create function public.kb_reject_hidden_assignment() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.workout_id is not null and exists (
    select 1 from public.kb_workout_visibility v
    where v.user_id = new.user_id and v.workout_id = new.workout_id and v.hidden
  ) then raise exception 'Restore the workout before assigning it.' using errcode = '23514'; end if;
  return new;
end;
$$;
create trigger kb_plan_visible_workout before insert or update on public.kb_weekly_plan
  for each row execute function public.kb_reject_hidden_assignment();

-- Definer is narrowly scoped: no caller-supplied owner, no dynamic SQL, no deletes.
-- Direct writes are revoked; this RPC is the sole authenticated mutation path.
create function public.kb_set_workout_visibility(p_workout_id text, p_hidden boolean, p_expected_revision bigint, p_clear_assignments boolean default false, p_operation_id uuid default pg_catalog.gen_random_uuid())
returns setof public.kb_workout_visibility
language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid := auth.uid();
  current_revision bigint;
  current_operation uuid;
begin
  if owner_id is null then raise exception 'Sign in required.' using errcode = '42501'; end if;
  if p_workout_id is null or p_workout_id !~ '^[a-z0-9][a-z0-9-]{0,199}$' or p_hidden is null or p_expected_revision is null or p_expected_revision < 0 or p_clear_assignments is null or p_operation_id is null then
    raise exception 'Invalid Library preference.' using errcode = '22023';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(owner_id::text, 371));
  select revision,operation_id into current_revision,current_operation from public.kb_workout_visibility
    where user_id = owner_id and workout_id = p_workout_id for update;
  if current_operation = p_operation_id then
    if (select hidden from public.kb_workout_visibility where user_id=owner_id and workout_id=p_workout_id) <> p_hidden then
      raise exception 'Operation ID reused for a different setting.' using errcode='22023';
    end if;
    return query select * from public.kb_workout_visibility where user_id=owner_id and workout_id=p_workout_id;
    return;
  end if;
  if coalesce(current_revision, 0) <> p_expected_revision then
    raise exception 'Library settings changed on another device.' using errcode = '40001';
  end if;
  insert into public.kb_workout_visibility(user_id, workout_id, hidden, revision, operation_id)
    values (owner_id, p_workout_id, p_hidden, p_expected_revision + 1,p_operation_id)
    on conflict (user_id, workout_id) do update
      set hidden = excluded.hidden, revision = excluded.revision, operation_id=excluded.operation_id, updated_at = now();
  if p_hidden or p_clear_assignments then
    update public.kb_weekly_plan set workout_id = null, workout_version = null
      where user_id = owner_id and workout_id = p_workout_id;
  end if;
  return query select * from public.kb_workout_visibility where user_id = owner_id and workout_id = p_workout_id;
end;
$$;
revoke all on function public.kb_lock_library_workspace(), public.kb_reject_hidden_assignment(), public.kb_set_workout_visibility(text, boolean, bigint, boolean, uuid) from public, anon, authenticated;
grant execute on function public.kb_set_workout_visibility(text, boolean, bigint, boolean, uuid) to authenticated;
commit;
