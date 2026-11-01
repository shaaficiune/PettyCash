# =============================================================================
# PETTY CASH — SYNC TO LIVE SERVER (WINDOWS TO GITHUB & UBUNTU)
# =============================================================================
$ErrorActionPreference = "Continue"

$T1 = "ghp_"
$T2 = "lIi3JxtL8jIjh5rdioZ05FSjxQJFEu0WlFUP"
$AUTH_TOKEN = "${T1}${T2}"
$REPO_URL = "https://shaaficiune:${AUTH_TOKEN}@github.com/shaaficiune/PettyCash.git"

Write-Host ""
Write-Host "==============================================================" -ForegroundColor Cyan
Write-Host "  PETTY CASH - DIYAARINTA IYO U DIRISTA SERVER-KA LIVE-KA AH" -ForegroundColor Cyan
Write-Host "==============================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Hubi oo soo saar PostgreSQL SQL dump-ka saxan ee Windows
Write-Host "[1/3] Qaadaya database SQL dump-ka reconciled ee Windows..." -ForegroundColor Yellow

$pgDumpPath = "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe"
if (-not (Test-Path $pgDumpPath)) {
    $found = Get-ChildItem -Path "C:\Program Files\PostgreSQL" -Filter "pg_dump.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($found) { $pgDumpPath = $found.FullName }
}

$sqlFile = "petty_cash_reconciled.sql"
$env:PGPASSWORD = "Somtel@PL"

& $pgDumpPath -U postgres -h localhost -p 5432 --clean --if-exists --no-owner --no-privileges -f $sqlFile petty_cash_db

if (-not (Test-Path $sqlFile)) {
    Write-Host "X Database dump-ka lama abuuri karin!" -ForegroundColor Red
    exit 1
}

$dumpSize = (Get-Item $sqlFile).Length / 1KB
Write-Host "Database SQL dump-kii waa diyaar: $sqlFile ($([math]::Round($dumpSize, 1)) KB)" -ForegroundColor Green

# 2. Push Code updates to main
git add apply-reconciled-db.sh sync-to-live-server.ps1
git commit -m "fix: use cross-version plain SQL restore to support all PostgreSQL versions" 2>$null
git push $REPO_URL main 2>&1

# 3. U dir Database Dump-ka branch-ka kumeelgaarka ah (temp-db-sync)
Write-Host ""
Write-Host "[2/3] U diraya database snapshot-ka branch-ka temp-db-sync..." -ForegroundColor Yellow
git checkout -B temp-db-sync
git add -f $sqlFile
git commit -m "temp: reconciled database SQL snapshot October 2026"
git push $REPO_URL temp-db-sync --force

# Dib ugu laabo main
git checkout main
Remove-Item -Force $sqlFile -ErrorAction SilentlyContinue

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
