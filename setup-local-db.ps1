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

$ContainerName = "swubase-postgres"
$Image = "postgres:16-alpine"
$DatabaseName = "swubase_postgres_local"
$DatabasePort = 5442
$DumpFile = Join-Path $PSScriptRoot "pg-dump.dmp"

if (-Not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "Docker is required but was not found in PATH."
}

if (-Not (Test-Path $DumpFile -PathType Leaf)) {
    throw "File '$DumpFile' was not found."
}

Write-Host "=== Pulling $Image image ==="
docker pull $Image

Write-Host "=== Starting container '$ContainerName' ==="
# Remove existing container if needed
if (docker ps -a --format "{{.Names}}" | Select-String -Pattern "^$ContainerName$") {
    Write-Host "Container '$ContainerName' already exists. Removing..."
    docker rm -f $ContainerName
}

docker run -d --name $ContainerName `
  -e POSTGRES_PASSWORD=password `
  -p "${DatabasePort}:5432" `
  $Image

Write-Host "=== Waiting for PostgreSQL to become ready ==="
$Ready = $false
for ($Attempt = 1; $Attempt -le 30; $Attempt++) {
    docker exec $ContainerName pg_isready -U postgres *> $null
    if ($LASTEXITCODE -eq 0) {
        $Ready = $true
        break
    }
    Start-Sleep -Seconds 1
}

if (-Not $Ready) {
    docker logs $ContainerName
    throw "PostgreSQL did not become ready within 30 seconds."
}

Write-Host "=== Copying dump file into container ==="
docker cp $DumpFile "${ContainerName}:/tmp/pg-dump.dmp"

Write-Host "=== Creating clean local database '$DatabaseName' ==="
docker exec $ContainerName dropdb -U postgres $DatabaseName --if-exists
docker exec $ContainerName createdb -U postgres $DatabaseName

Write-Host "=== Restoring data from dump ==="
docker exec $ContainerName pg_restore `
  -U postgres `
  -d $DatabaseName `
  --clean --if-exists `
  --no-owner --no-privileges `
  --verbose `
  /tmp/pg-dump.dmp

Write-Host "=== Done! ==="
Write-Host ""
Write-Host "You can now connect using:"
Write-Host "  DATABASE_URL=postgresql://postgres:password@localhost:$DatabasePort/$DatabaseName"
Write-Host ""
Write-Host "Use this to verify:"
Write-Host "  docker exec -it $ContainerName psql -U postgres -d $DatabaseName -c '\dt'"
