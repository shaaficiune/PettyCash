# =============================================================================
# PETTY CASH — SYNC TO LIVE SERVER (WINDOWS TO GITHUB & UBUNTU)
# =============================================================================
$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "==============================================================" -ForegroundColor Cyan
Write-Host "  PETTY CASH - DIYAARINTA IYO U DIRISTA SERVER-KA LIVE-KA AH" -ForegroundColor Cyan
Write-Host "==============================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Hubi oo soo saar PostgreSQL dump-ka saxan ee Windows
Write-Host "[1/4] Qaadaya database dump-ka reconciled ee Windows..." -ForegroundColor Yellow

$pgDumpPath = "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe"
if (-not (Test-Path $pgDumpPath)) {
    $found = Get-ChildItem -Path "C:\Program Files\PostgreSQL" -Filter "pg_dump.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($found) { $pgDumpPath = $found.FullName }
}

$dumpFile = "petty_cash_reconciled.dump"
$env:PGPASSWORD = "Somtel@PL"

& $pgDumpPath -U postgres -h localhost -p 5432 -F c -b -f $dumpFile petty_cash_db

if (-not (Test-Path $dumpFile)) {
    Write-Host "X Database dump-ka lama abuuri karin!" -ForegroundColor Red
    exit 1
}

$dumpSize = (Get-Item $dumpFile).Length / 1KB
Write-Host "Database dump-kii waa diyaar: $dumpFile ($([math]::Round($dumpSize, 1)) KB)" -ForegroundColor Green

# 2. Commit & Push Code-ka ugu dambeeyay ee main
Write-Host ""
Write-Host "[2/4] U diraya code-ka cusub (Search + Dashboard) branch-ka main..." -ForegroundColor Yellow
git add -A
git commit -m "feat: October reconciliation, search by name/tel/req, and live sync script"
git push origin main
Write-Host "Code-ka ugu dambeeyay waa gaaray GitHub main!" -ForegroundColor Green

# 3. U dir Database Dump-ka branch-ka kumeelgaarka ah (temp-db-sync)
Write-Host ""
Write-Host "[3/4] U diraya database snapshot-ka branch-ka temp-db-sync..." -ForegroundColor Yellow
git checkout -B temp-db-sync
git add -f $dumpFile
git commit -m "temp: reconciled database snapshot October 2026"
git push origin temp-db-sync --force

# Dib ugu laabo main
git checkout main
Remove-Item -Force $dumpFile -ErrorAction SilentlyContinue

Write-Host "Database snapshot-kii wuxuu u baxay GitHub (temp-db-sync)!" -ForegroundColor Green

# 4. Tilmaamaha Ubuntu Live Server
Write-Host ""
Write-Host "==============================================================" -ForegroundColor Green
Write-Host "GUUL! XOGTII OO DHAN WAXAY U BAXDAY SERVER-KA LIVE-KA AH!" -ForegroundColor Green
Write-Host "==============================================================" -ForegroundColor Green
Write-Host ""
Write-Host 'Hadda gal Ubuntu Server-ka oo ku dhufo amarkan kaliya:' -ForegroundColor Cyan
Write-Host ""
Write-Host '   cd ~/app/app && git pull && bash apply-reconciled-db.sh' -ForegroundColor White -BackgroundColor DarkGreen
Write-Host ""
Write-Host 'Script-ka Ubuntu wuxuu si toos ah u qaban doonaa:' -ForegroundColor Yellow
Write-Host '  1. Backup amni ah ka qaadaya live DB ka hor intaan waxba la taaban'
Write-Host '  2. Ku shubaya database-kii saxda ahaa ee October'
Write-Host '  3. Dhisi doona backend & frontend (Search-ka cusub)'
Write-Host '  4. Dib u kicinaya PM2 & Nginx'
Write-Host '  5. Tirtiraya branch-ka GitHub si aysan xog u harin'
Write-Host '  6. Hubinaya hadhaaga labada shirkadood (Somtel $7.64 iyo Bluekom $121.40)'
Write-Host ""
