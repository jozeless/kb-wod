-- Second concurrent connection in the isolated Docker test database.
\set ON_ERROR_STOP on
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
do $$ begin
 begin
   update public.kb_weekly_plan set workout_id='classic-iron',workout_version=1 where weekday='Monday';
   raise exception 'Concurrent hidden assignment was accepted';
 exception when check_violation then null; end;
 begin
   perform public.kb_set_workout_visibility('classic-iron',false,0);
   raise exception 'Concurrent stale preference was accepted';
 exception when serialization_failure then null; end;
 assert (select hidden from public.kb_workout_visibility where workout_id='classic-iron'),'Concurrent write replaced hide';
 assert (select revision from public.kb_workout_visibility where workout_id='classic-iron')=1,'Concurrent write changed revision';
 assert (select workout_id from public.kb_weekly_plan where weekday='Monday') is null,'Hidden assignment survived';
 assert (select workout_id from public.kb_weekly_plan where weekday='Friday')='oldschool-eagle','Unrelated day changed';
end $$;
commit;
