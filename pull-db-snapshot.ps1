# =============================================================================
# 📥 PULL DB SNAPSHOT TO WINDOWS & DELETE TEMP GITHUB BRANCH
# =============================================================================
$ErrorActionPreference = "Stop"

Write-Host "🔍 Soo jiidaya macluumaadka GitHub..." -ForegroundColor Cyan
git fetch origin temp-db-sync

# Raadi faylka dump-ka ee branch-kaas ku jira
$dumpFiles = git ls-tree -r --name-only origin/temp-db-sync | Where-Object { $_ -like "*.dump" }

if (-not $dumpFiles) {
    Write-Host "❌ Wax .dump ah lagama helin branch-ka temp-db-sync!" -ForegroundColor Red
    exit 1
}

$targetDump = $dumpFiles[0]
Write-Host "✅ Waxaa la helay faylka: $targetDump" -ForegroundColor Green

# Soo saar faylka oo Windows-ka dhig
git checkout origin/temp-db-sync -- $targetDump

Write-Host "📁 Faylku wuxuu hadda yaallaa: $(Get-Location)\$targetDump" -ForegroundColor Green

# Isla markiiba tirtir branch-ka GitHub si aysan xog u harin
Write-Host "🧹 Tirtiraya branch-ka temp-db-sync ee GitHub..." -ForegroundColor Yellow
git push origin --delete temp-db-sync

Write-Host ""
Write-Host "🎉 DHAMMAYSTIRAN! Database-kii Windows-ka ayuu yaallaa, GitHub-kiina waa la nadiifiyey!" -ForegroundColor Cyan

