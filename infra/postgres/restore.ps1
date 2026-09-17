param(
    [Parameter(Mandatory = $true)]
    [string]$BackupPath
)

$ErrorActionPreference = 'Stop'
$composePath = Join-Path $PSScriptRoot 'compose.yaml'
$envPath = Join-Path $PSScriptRoot '.env'
$backupFile = Get-Item -LiteralPath $BackupPath
if ($backupFile.PSIsContainer) { throw 'Debes indicar un archivo SQL plain.' }
if (-not (Test-Path -LiteralPath $envPath)) { throw 'Primero configura infra/postgres/.env.' }
$header = Get-Content -LiteralPath $backupFile.FullName -TotalCount 12
if (-not ($header -match '^-- PostgreSQL database dump$')) {
    throw 'El archivo no parece un backup SQL plain de PostgreSQL. No se ejecutó la restauración.'
}

# Solo se admite el contenedor de este proyecto Compose, nunca un servidor externo.
$containerId = ([string](& docker compose --env-file $envPath -f $composePath ps -q postgres)).Trim()
if ($LASTEXITCODE -ne 0 -or $containerId -notmatch '^[a-f0-9]{12,64}$') {
    throw 'No se encontró el contenedor de PostgreSQL de Brotar. Inícialo primero.'
}
$projectLabel = & docker inspect --format '{{index .Config.Labels "com.docker.compose.project"}}' $containerId
if ($LASTEXITCODE -ne 0 -or $projectLabel -ne 'brotar-local') {
    throw 'El contenedor no pertenece al proyecto brotar-local.'
}

$emptyCheck = @'
SELECT
 (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname NOT IN ('pg_catalog','information_schema') AND n.nspname NOT LIKE 'pg_toast%')
 + (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname NOT IN ('pg_catalog','information_schema'))
 + (SELECT count(*) FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
    WHERE n.nspname NOT IN ('pg_catalog','information_schema'));
'@
$objectCount = & docker exec $containerId psql -X -U postgres -d brotar_db -At -v ON_ERROR_STOP=1 -c $emptyCheck
if ($LASTEXITCODE -ne 0 -or "$objectCount".Trim() -ne '0') {
    throw 'La base no está vacía o no se pudo comprobar. Se canceló sin borrar ni reemplazar datos.'
}

$privateDirectory = Join-Path $PSScriptRoot 'private'
[System.IO.Directory]::CreateDirectory($privateDirectory) | Out-Null
$logPath = Join-Path $privateDirectory ('restore-' + [guid]::NewGuid().ToString('N') + '.log')
$preparedPath = Join-Path $privateDirectory ('restore-' + [guid]::NewGuid().ToString('N') + '.sql')
$sql = [System.IO.File]::ReadAllText($backupFile.FullName)
$schemaPattern = '(?m)^CREATE SCHEMA public;\r?$'
if ([regex]::Matches($sql, $schemaPattern).Count -ne 1) {
    throw 'El esquema del backup cambió. Se requiere revisión antes de restaurar.'
}
# El backup provisional usa citext y un índice pg_trgm, pero omite las extensiones.
# Se prepara una copia privada; el original se conserva byte por byte.
$schemaSetup = 'CREATE SCHEMA public;'
if ($sql.Contains('public.citext') -and $sql -notmatch '(?im)^CREATE EXTENSION[^;]*\bcitext\b') {
    $schemaSetup += "`nCREATE EXTENSION citext WITH SCHEMA public;"
}
if ($sql.Contains('public.gin_trgm_ops') -and $sql -notmatch '(?im)^CREATE EXTENSION[^;]*\bpg_trgm\b') {
    $schemaSetup += "`nCREATE EXTENSION pg_trgm WITH SCHEMA public;"
}
$sql = [regex]::Replace($sql, $schemaPattern, $schemaSetup)
[System.IO.File]::WriteAllText($preparedPath, $sql, [System.Text.UTF8Encoding]::new($false))
$remoteFile = '/tmp/brotar-restore.sql'
& docker cp $preparedPath "${containerId}:$remoteFile"
if ($LASTEXITCODE -ne 0) { throw 'No se pudo copiar el backup al contenedor.' }
try {
    # El dump recibido crea public. Quitamos únicamente el esquema VACÍO y sin CASCADE.
    # DROP y restauración forman una sola transacción; ON_ERROR_STOP revierte ante error.
    & docker exec $containerId psql -X -U postgres -d brotar_db --single-transaction -v ON_ERROR_STOP=1 --quiet -c 'DROP SCHEMA public;' -f $remoteFile *> $logPath
    if ($LASTEXITCODE -ne 0) {
        throw "La restauración falló y se revirtió. Revisa el log privado $logPath; no lo publiques porque puede contener datos."
    }
    $hash = (Get-FileHash -LiteralPath $backupFile.FullName -Algorithm SHA256).Hash
    Write-Output "Restauración terminada en brotar-local / brotar_db. SHA256 del archivo: $hash"
    Write-Output 'Ejecuta verify.ps1 antes de considerar verificada la estructura.'
}
finally {
    & docker exec $containerId rm -f -- $remoteFile
    # Solo esta copia temporal, con nombre generado en private; nunca el archivo original.
    Remove-Item -LiteralPath $preparedPath
}
