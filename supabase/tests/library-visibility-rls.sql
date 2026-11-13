-- Isolated test database only. All fixtures roll back.
\set ON_ERROR_STOP on
begin;
insert into auth.users(id) values ('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222');
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
insert into public.kb_weekly_plan(user_id,weekday,workout_id,workout_version) values
 (auth.uid(),'Monday','classic-iron',1),(auth.uid(),'Tuesday','classic-iron',1),(auth.uid(),'Friday','oldschool-eagle',1);
insert into public.kb_training_sessions(user_id,id,workout_id,workout_version,workout_snapshot,results,session_data,started_at,completed_at)
 values(auth.uid(),'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','classic-iron',1,'{}','{"completedRounds":3,"partialReps":20,"roundTimesMs":[70000,80000,75000]}','{}','2026-11-13T10:00Z','2026-11-13T10:20Z');
select * from public.kb_set_workout_visibility('classic-iron',true,0);
do $$ begin
 assert (select hidden from public.kb_workout_visibility where workout_id='classic-iron'),'Hidden flag missing';
 assert (select count(*) from public.kb_weekly_plan where workout_id='classic-iron')=0,'Hidden assignments retained';
 assert (select workout_id from public.kb_weekly_plan where weekday='Friday')='oldschool-eagle','Unrelated assignment changed';
 assert (select results from public.kb_training_sessions)='{"completedRounds":3,"partialReps":20,"roundTimesMs":[70000,80000,75000]}'::jsonb,'History changed';
 begin perform public.kb_set_workout_visibility('classic-iron',false,0);raise exception 'Stale revision accepted';exception when serialization_failure then null;end;
 assert (select hidden from public.kb_workout_visibility where workout_id='classic-iron'),'Conflict changed setting';
 begin update public.kb_weekly_plan set workout_id='classic-iron',workout_version=1 where weekday='Monday';raise exception 'Hidden assignment accepted';exception when check_violation then null;end;
 begin insert into public.kb_workout_visibility(user_id,workout_id,hidden,revision,operation_id) values(auth.uid(),'other',true,1,gen_random_uuid());raise exception 'Direct mutation allowed';exception when insufficient_privilege then null;end;
 assert not has_table_privilege('anon','public.kb_workout_visibility','SELECT,INSERT,UPDATE,DELETE'),'Anonymous preference grant';
 assert not has_function_privilege('anon','public.kb_set_workout_visibility(text,boolean,bigint,boolean,uuid)','EXECUTE'),'Anonymous RPC grant';
end $$;
select * from public.kb_set_workout_visibility('classic-iron',false,1);
do $$ begin assert (select count(*) from public.kb_weekly_plan where workout_id='classic-iron')=0,'Restore recreated assignments';end $$;
update public.kb_weekly_plan set workout_id='classic-iron',workout_version=1 where weekday='Monday';
select * from public.kb_set_workout_visibility('classic-iron',false,2,true);
do $$ begin
 assert not (select hidden from public.kb_workout_visibility where workout_id='classic-iron'),'Visible queued restore became hidden';
 assert (select count(*) from public.kb_weekly_plan where workout_id='classic-iron')=0,'Queued offline hide/restore cleanup was lost';
end $$;
-- A lost response must not clear a newer assignment when the same request retries.
do $$ declare op uuid; begin
 select operation_id into op from public.kb_workout_visibility where workout_id='classic-iron';
 update public.kb_weekly_plan set workout_id='classic-iron',workout_version=1 where weekday='Monday';
 perform public.kb_set_workout_visibility('classic-iron',false,2,true,op);
 assert (select revision from public.kb_workout_visibility where workout_id='classic-iron')=3,'Retry duplicated the mutation';
 assert (select workout_id from public.kb_weekly_plan where weekday='Monday')='classic-iron','Retry erased a later assignment';
end $$;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
do $$ begin assert (select count(*) from public.kb_workout_visibility)=0,'Foreign preferences visible';end $$;
select * from public.kb_set_workout_visibility('classic-iron',true,0);
do $$ begin
 assert (select count(*) from public.kb_workout_visibility)=1,'Own preference not visible';
 begin update public.kb_workout_visibility set user_id='11111111-1111-4111-8111-111111111111';raise exception 'Owner reassignment allowed';exception when insufficient_privilege then null;end;
 begin delete from public.kb_workout_visibility;raise exception 'Preference deletion allowed';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
do $$ begin assert not (select hidden from public.kb_workout_visibility where workout_id='classic-iron'),'Other account changed first account';end $$;
select set_config('request.jwt.claim.sub','',true);
do $$ begin
 begin perform public.kb_set_workout_visibility('classic-iron',true,2);raise exception 'Unauthenticated call allowed';exception when insufficient_privilege then null;end;
end $$;
rollback;
