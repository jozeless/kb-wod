#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
container_name="kb-wod-rls-$$"
trap 'docker rm -f "$container_name" >/dev/null 2>&1 || true' EXIT
docker run --detach --rm --name "$container_name" --network none -e POSTGRES_HOST_AUTH_METHOD=trust postgres:17-alpine >/dev/null
for attempt in {1..60}; do
  if docker exec "$container_name" pg_isready -h 127.0.0.1 -U postgres >/dev/null 2>&1; then break; fi
  sleep 0.25
done
docker exec -i "$container_name" psql -U postgres -v ON_ERROR_STOP=1 < supabase/tests/bootstrap.sql
docker exec -i "$container_name" psql -U postgres -v ON_ERROR_STOP=1 < supabase/migrations/202610220001_kb_cloud.sql
docker exec -i "$container_name" psql -U postgres -v ON_ERROR_STOP=1 < supabase/tests/rls.sql
docker exec -i "$container_name" psql -U postgres -v ON_ERROR_STOP=1 < supabase/migrations/202611130001_library_visibility.sql
docker exec -i "$container_name" psql -U postgres -v ON_ERROR_STOP=1 < supabase/tests/library-visibility-rls.sql
docker exec -i "$container_name" psql -U postgres -v ON_ERROR_STOP=1 <<'SQL'
insert into auth.users(id) values ('11111111-1111-4111-8111-111111111111');
insert into public.kb_weekly_plan(user_id,weekday,workout_id,workout_version) values
 ('11111111-1111-4111-8111-111111111111','Monday','classic-iron',1),
 ('11111111-1111-4111-8111-111111111111','Friday','oldschool-eagle',1);
SQL
docker exec -i -e PGAPPNAME=kb-library-race "$container_name" psql -U postgres -v ON_ERROR_STOP=1 <<'SQL' &
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
select * from public.kb_set_workout_visibility('classic-iron',true,0);
select pg_sleep(2);
commit;
SQL
race_pid=$!
race_ready=false
for attempt in {1..30}; do
  if [[ "$(docker exec "$container_name" psql -U postgres -Atqc "select exists(select 1 from pg_locks l join pg_stat_activity a on a.pid=l.pid where a.application_name='kb-library-race' and l.locktype='advisory' and l.granted)")" == "t" ]]; then race_ready=true; break; fi
  sleep 0.05
done
if [[ "$race_ready" != true ]]; then echo 'Concurrent Library test did not acquire its lock' >&2; exit 1; fi
docker exec -i "$container_name" psql -U postgres -v ON_ERROR_STOP=1 < supabase/tests/library-visibility-race.sql
wait "$race_pid"
