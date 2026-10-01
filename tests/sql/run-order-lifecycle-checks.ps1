param([string]$Port = '55439', [string]$PostgresBin = 'C:\Program Files\PostgreSQL\18\bin')
$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$database = 'orders_checks_' + (Get-Date -Format 'yyyyMMddHHmmssfff')
$compilePath = Join-Path $repoRoot '.codex-tmp/phase-modernization/order-sql-client'
Push-Location -LiteralPath $repoRoot
try {
  & "$PostgresBin/createdb.exe" -h 127.0.0.1 -p $Port -U postgres $database
  if ($LASTEXITCODE -ne 0) { throw 'Cannot create disposable test database' }
  $files = @('tests/sql/legacy-inventory-bridge-fixture.sql',
    'supabase_migration_20260929_business_foundation.sql',
    'supabase_migration_20260929_inventory_transactions.sql',
    'supabase_migration_20260930_legacy_inventory_bridge.sql',
    'supabase_migration_20260930_calculation_projects.sql',
    'supabase_migration_20260930_project_orders.sql',
    'supabase_migration_20260930_catalog_templates.sql',
    'supabase_migration_20261001_order_lifecycle.sql',
    'supabase_migration_20261001_order_lifecycle.sql',
    'tests/sql/order-lifecycle-fixture.sql')
  foreach ($file in $files) {
    & "$PostgresBin/psql.exe" -h 127.0.0.1 -p $Port -U postgres -d $database -v ON_ERROR_STOP=1 -f $file
    if ($LASTEXITCODE -ne 0) { throw "SQL failed: $file" }
  }
  node node_modules/typescript/bin/tsc src/shared/lib/businessOrders.ts src/shared/lib/projectOrders.ts --outDir $compilePath --module commonjs --target ES2020 --esModuleInterop --skipLibCheck --pretty false
  if ($LASTEXITCODE -ne 0) { throw 'Client test compilation failed' }
  node tests/sql/order-lifecycle-scenarios.cjs (Join-Path $compilePath 'lib') "$PostgresBin/psql.exe" $database $Port
  if ($LASTEXITCODE -ne 0) { throw 'Order lifecycle assertions failed' }
  foreach ($file in @('tests/sql/business-maintenance-fixture.sql',
    'supabase_migration_20261001_business_maintenance.sql', 'supabase_migration_20261001_business_maintenance.sql')) {
    & "$PostgresBin/psql.exe" -h 127.0.0.1 -p $Port -U postgres -d $database -v ON_ERROR_STOP=1 -f $file
    if ($LASTEXITCODE -ne 0) { throw "SQL failed: $file" }
  }
  node tests/sql/business-maintenance-scenarios.cjs "$PostgresBin/psql.exe" $database $Port
  if ($LASTEXITCODE -ne 0) { throw 'Business maintenance assertions failed' }
  Write-Output "Disposable SQL database: $database"
} finally { Pop-Location }
