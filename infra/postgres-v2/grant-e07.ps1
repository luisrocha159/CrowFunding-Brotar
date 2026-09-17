$ErrorActionPreference = 'Stop'
$compose = Join-Path $PSScriptRoot 'compose.yaml'
$envFile = Join-Path $PSScriptRoot '.env'
$container = (& docker compose --env-file $envFile -f $compose ps -q postgres).Trim()
if ($LASTEXITCODE -ne 0 -or $container -notmatch '^[a-f0-9]{12,64}$') { throw 'V2 no está iniciada.' }
$project = & docker inspect --format '{{index .Config.Labels "com.docker.compose.project"}}' $container
if ($LASTEXITCODE -ne 0 -or $project.Trim() -ne 'brotar-provisional-v2') { throw 'Destino inesperado.' }
Get-Content -LiteralPath (Join-Path $PSScriptRoot 'grant-e07.sql') -Raw | & docker exec -i $container psql -X -v ON_ERROR_STOP=1 -U postgres -d brotar_db
if ($LASTEXITCODE -ne 0) { throw 'No se completaron los permisos E07.' }
Write-Output 'Permisos E07 aplicados solo a Brotar V2. Sin activaciones ni asignación de roles de negocio.'
