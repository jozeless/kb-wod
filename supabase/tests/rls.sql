-- Run in an isolated test database AFTER the migration. All fixtures roll back.
\set ON_ERROR_STOP on
begin;
insert into auth.users(id) values ('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222');
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
insert into public.kb_weekly_plan(user_id,weekday,workout_id,workout_version) values (auth.uid(),'Monday','focus-002-lower-abs',1);
insert into public.kb_training_sessions(user_id,id,workout_id,workout_version,workout_snapshot,results,session_data,started_at,completed_at)
values(auth.uid(),'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','focus-002-lower-abs',1,'{}','{}','{}','2026-01-01T00:00Z','2026-01-01T00:20Z');
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
do $$
declare n integer;
begin
  assert (select count(*) from public.kb_weekly_plan)=0, 'Other user can read a plan';
  assert (select count(*) from public.kb_training_sessions)=0, 'Other user can read sessions';
  update public.kb_weekly_plan set workout_id='intrusion'; get diagnostics n=row_count; assert n=0,'Other user updated a plan';
  delete from public.kb_weekly_plan; get diagnostics n=row_count; assert n=0,'Other user deleted a plan';
  update public.kb_training_sessions set results='{"intrusion":true}'; get diagnostics n=row_count; assert n=0,'Other user updated sessions';
  delete from public.kb_training_sessions; get diagnostics n=row_count; assert n=0,'Other user deleted sessions';
  begin
    insert into public.kb_weekly_plan(user_id,weekday) values('11111111-1111-4111-8111-111111111111','Tuesday');
    raise exception 'Cross-account plan insert allowed';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.kb_training_sessions(user_id,id,workout_id,workout_version,workout_snapshot,results,session_data,started_at,completed_at)
    values('11111111-1111-4111-8111-111111111111','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','x',1,'{}','{}','{}',now(),now());
    raise exception 'Cross-account session insert allowed';
  exception when insufficient_privilege then null; end;
end $$;
insert into public.kb_weekly_plan(user_id,weekday) values(auth.uid(),'Tuesday');
do $$ begin
  begin update public.kb_weekly_plan set user_id='11111111-1111-4111-8111-111111111111';raise exception 'Owner reassignment allowed';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
do $$ begin
  assert (select count(*) from public.kb_weekly_plan)=1,'Own plan unavailable';
  assert (select count(*) from public.kb_training_sessions)=1,'Own sessions unavailable';
  assert not has_table_privilege('anon','public.kb_training_sessions','SELECT,INSERT,UPDATE,DELETE'),'Anonymous session grant';
  assert not has_table_privilege('anon','public.kb_weekly_plan','SELECT,INSERT,UPDATE,DELETE'),'Anonymous plan grant';
end $$;
update public.kb_weekly_plan set workout_id=null,workout_version=null;
update public.kb_training_sessions set results='{"own":true}';
do $$ begin
 begin update public.kb_training_sessions set user_id='22222222-2222-4222-8222-222222222222';raise exception 'Session owner reassignment allowed';exception when insufficient_privilege then null;end;
end $$;
-- Repeated idempotent upload stays one record.
insert into public.kb_training_sessions select * from public.kb_training_sessions
on conflict(user_id,id) do update set results=excluded.results;
do $$ begin assert (select count(*) from public.kb_training_sessions)=1,'Duplicate session';end $$;
delete from public.kb_training_sessions;
delete from public.kb_weekly_plan;
rollback;
