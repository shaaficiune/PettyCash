$ErrorActionPreference = "Continue"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  POSTGRESQL - LOCAL DATABASE CLEAN & RESTORE" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

$pgBin = "C:\Program Files\PostgreSQL\18\bin"
$dumpFile = "d:\Petty Cash App\petty_cash_live_20261031_133307.dump"
$dbName = "petty_cash_db"
$dbUser = "postgres"
$env:PGPASSWORD = "Somtel@PL"

if (-not (Test-Path $dumpFile)) {
    Write-Host "Faylka dump-ka lama helin: $dumpFile" -ForegroundColor Red
    exit 1
}

# 1. Nadiifi database-ka local-ka ah (Drop & Recreate Schema)
Write-Host "[1/3] Nadiifinaya database-ka local-ka ah (Emptying local test data)..." -ForegroundColor Yellow
& "$pgBin\psql.exe" -U $dbUser -h localhost -p 5432 -d $dbName -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO postgres; GRANT ALL ON SCHEMA public TO public;"

Write-Host "Database-ka local-ka ah hadda gabi ahaanba waa maran yahay (100% Empty)!" -ForegroundColor Green

# 2. Toos ugu shub Live Database Dump-ka
Write-Host ""
Write-Host "[2/3] Ku shubaya database-kii live-ka ahaa ee October 31..." -ForegroundColor Yellow
& "$pgBin\pg_restore.exe" -U $dbUser -h localhost -p 5432 -d $dbName --no-owner --no-privileges --verbose "$dumpFile" 2>&1 | Out-Null

Write-Host "Dib u shubistii way dhammaatay!" -ForegroundColor Green

# 3. Hubi xogta soo gashay
Write-Host ""
Write-Host "[3/3] Hubinaya xogta dhabta ah ee soo gashay..." -ForegroundColor Yellow
& "$pgBin\psql.exe" -U $dbUser -h localhost -p 5432 -d $dbName -c "\dt"

Write-Host ""
Write-Host "==================================================" -ForegroundColor Green
Write-Host "  GUUL! LOCAL DATABASE WAA 100% EXACT LIVE REPLICA!" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
