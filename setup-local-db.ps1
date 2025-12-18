# =====================================================================
# SWU Base – Local Postgres Setup Script
# =====================================================================
# This script:
#   1. Pulls postgres:16-alpine
#   2. Starts a new container (swubase-postgres)
#   3. Copies pg-dump.dmp into it
#   4. Recreates local DB (swubase_postgres_local)
#   5. Restores data from dump
# =====================================================================

$ErrorActionPreference = "Stop"

Write-Host "=== Pulling postgres:16-alpine image ==="
docker pull postgres:16-alpine

Write-Host "=== Starting container 'swubase-postgres' ==="
# Remove existing container if needed
if (docker ps -a --format "{{.Names}}" | Select-String -Pattern "^swubase-postgres$") {
    Write-Host "Container 'swubase-postgres' already exists. Removing..."
    docker rm -f swubase-postgres
}

docker run -d --name swubase-postgres `
  -e POSTGRES_PASSWORD=password `
  -p 5442:5432 `
  postgres:16-alpine

Start-Sleep -Seconds 3

Write-Host "=== Copying dump file into container ==="
if (-Not (Test-Path "./pg-dump.dmp")) {
    Write-Error "File 'pg-dump.dmp' not found in current directory!"
    exit 1
}
docker cp .\pg-dump.dmp swubase-postgres:/tmp/pg-dump.dmp

Write-Host "=== Creating clean local database 'swubase_postgres_local' ==="
docker exec swubase-postgres dropdb -U postgres swubase_postgres_local --if-exists
docker exec swubase-postgres createdb -U postgres swubase_postgres_local

Write-Host "=== Restoring data from dump ==="
docker exec swubase-postgres pg_restore `
  -U postgres `
  -d swubase_postgres_local `
  --clean --if-exists `
  --no-owner --no-privileges `
  --verbose `
  /tmp/pg-dump.dmp

Write-Host "=== Done! ==="
Write-Host ""
Write-Host "You can now connect using:"
Write-Host "  DATABASE_URL=postgresql://postgres:password@localhost:5442/swubase_postgres_local"
Write-Host ""
Write-Host "Use this to verify:"
Write-Host "  docker exec -it swubase-postgres psql -U postgres -d swubase_postgres_local -c '\dt'"
