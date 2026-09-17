$ErrorActionPreference = 'Stop'
$composePath = Join-Path $PSScriptRoot 'compose.yaml'
$envPath = Join-Path $PSScriptRoot '.env'
if (-not (Test-Path -LiteralPath $envPath)) { throw 'Primero configura infra/postgres/.env.' }
$sql = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'verify.sql') -Raw
$result = & docker compose --env-file $envPath -f $composePath exec -T postgres psql -X -U postgres -d brotar_db -At -v ON_ERROR_STOP=1 -c $sql
if ($LASTEXITCODE -ne 0) { throw 'No se pudo consultar la estructura de brotar_db.' }
$inventory = $result | ConvertFrom-Json
if (-not $inventory.citext) { throw 'Falta la extensión citext en public.' }
if (-not $inventory.pgTrgm) { throw 'Falta la extensión pg_trgm en public.' }
$expected = @{ tables=54; views=5; sequences=6; enums=31; functions=8; triggers=29; foreignKeys=117; requiredTables=10 }
foreach ($key in $expected.Keys) {
    if ($inventory.$key -ne $expected[$key]) {
        throw "Inventario distinto al backup provisional: $key. Esperado $($expected[$key]), obtenido $($inventory.$key). No se modificó la base."
    }
}
$inventory | ConvertTo-Json
Write-Output 'Inventario básico verificado. Esto NO acredita mapeo ORM, permisos, reglas ni persistencia desde la API.'
