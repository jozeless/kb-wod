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
