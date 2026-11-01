$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  PETTY CASH - DATABASE AUTOMATIC SYNC" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# 1. U dir script-ka GitHub
Write-Host "[1/4] U diraya server-ka script-kii dirista..." -ForegroundColor Yellow
git add send-dump.sh
git commit -m "temp: send-dump trigger"
git push origin main

Write-Host ""
Write-Host "--------------------------------------------------" -ForegroundColor Green
Write-Host "HADDA UBUNTU TERMINAL-KA KU DHUFO AMARKAN:" -ForegroundColor Green
Write-Host "   cd ~/app/app && git pull && bash send-dump.sh" -ForegroundColor White -BackgroundColor DarkGreen
Write-Host "--------------------------------------------------" -ForegroundColor Green
Write-Host ""
Write-Host "[2/4] Wuxuu sugayaa in Ubuntu uu soo diro database-ka..." -ForegroundColor Cyan

# 2. Sug inta branch-ka temp-db-sync uu GitHub ka soo muuqanayo
$found = $false
while (-not $found) {
    Start-Sleep -Seconds 4
    $branchCheck = git ls-remote --heads origin temp-db-sync 2>$null
    if ($branchCheck -match "temp-db-sync") {
        $found = $true
        Write-Host "Database-kii wuu soo gaaray GitHub!" -ForegroundColor Green
    } else {
        Write-Host "." -NoNewline -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "[3/4] Soo dejinaya faylka database-ka ee Windows..." -ForegroundColor Yellow
git fetch origin temp-db-sync

$dumpFiles = git ls-tree -r --name-only origin/temp-db-sync | Where-Object { $_ -like "*.dump" }
if ($dumpFiles) {
    $targetDump = $dumpFiles[0]
    git checkout origin/temp-db-sync -- $targetDump
    Write-Host "GUUL! Faylka database-ka waxaa lagu kaydiyey:" -ForegroundColor Green
    Write-Host "   $((Get-Location).Path)\$targetDump" -ForegroundColor Cyan
}

# 3. Tirtir branch-ka GitHub si xogtu aysan ugu harin
Write-Host ""
Write-Host "[4/4] Nadiifinaya GitHub si xog sir ah aysan ugu harin..." -ForegroundColor Yellow
git push origin --delete temp-db-sync 2>$null

Write-Host ""
Write-Host "==================================================" -ForegroundColor Green
Write-Host "  SHAQADII WAA DHAMMAATAY 100%!" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
