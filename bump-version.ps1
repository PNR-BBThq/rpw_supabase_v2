# ============================================================
# 🔄 bump-version.ps1
# Auto-update query string ?v=XXXXXX pada semua fail JS/CSS
# tempatan yang dirujuk dalam fail HTML.
#
# CARA GUNA: Jalankan sebelum git push
#   .\bump-version.ps1
#
# Apa yang berlaku:
#   1. Jana version tag dari timestamp semasa (YYYYMMDDHHmm)
#   2. Cari semua <script src="./js/xxx.js"> dan
#      <link href="./css/xxx.css"> dalam fail HTML
#   3. Ganti/tambah ?v=<timestamp> pada setiap reference
#   4. Update CACHE_NAME dalam service-worker.js juga
# ============================================================

$ErrorActionPreference = "Stop"

# Fail-fail HTML yang perlu diproses
$htmlFiles = @(
    "index.html",
    "form.html"
)

# Service Worker fail
$swFile = "service-worker.js"

# Jana version tag: YYYYMMDDHHmm (contoh: 202607281600)
$version = Get-Date -Format "yyyyMMddHHmm"

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  PNR Digital - Cache Buster v1.0" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Version tag baru: $version" -ForegroundColor Yellow
Write-Host ""

# -----------------------------------------------
# LANGKAH 1: Update semua reference JS/CSS dalam HTML
# -----------------------------------------------
# Pattern: Cari src="./js/xxx.js" atau src="js/xxx.js" (dengan atau tanpa ?v=xxx)
#           Cari href="./css/xxx.css" atau href="css/xxx.css" (dengan atau tanpa ?v=xxx)
# Hanya target fail TEMPATAN (bermula ./ atau tanpa http/https)

$patternJS  = '(src\s*=\s*")((?:\./)?js/[^"?]+\.js)(\?v=[^"]*)?(")'
$patternCSS = '(href\s*=\s*")((?:\./)?css/[^"?]+\.css)(\?v=[^"]*)?(")'

$totalUpdated = 0

foreach ($file in $htmlFiles) {
    $filePath = Join-Path $PSScriptRoot $file
    if (-not (Test-Path $filePath)) {
        Write-Host "  [SKIP] $file tidak dijumpai" -ForegroundColor DarkGray
        continue
    }

    $content = Get-Content $filePath -Raw -Encoding UTF8
    $originalContent = $content

    # Ganti JS references
    $content = [regex]::Replace($content, $patternJS, "`${1}`${2}?v=$version`${4}")

    # Ganti CSS references
    $content = [regex]::Replace($content, $patternCSS, "`${1}`${2}?v=$version`${4}")

    if ($content -ne $originalContent) {
        # Kekalkan encoding UTF-8 tanpa BOM
        [System.IO.File]::WriteAllText($filePath, $content, [System.Text.UTF8Encoding]::new($false))
        
        # Kira berapa reference yang dikemaskini
        $jsMatches  = [regex]::Matches($content, $patternJS).Count
        $cssMatches = [regex]::Matches($content, $patternCSS).Count
        $count = $jsMatches + $cssMatches
        $totalUpdated += $count

        Write-Host "  [OK] $file - $count reference dikemaskini" -ForegroundColor Green
    } else {
        Write-Host "  [OK] $file - tiada perubahan diperlukan" -ForegroundColor DarkGray
    }
}

# -----------------------------------------------
# LANGKAH 2: Update CACHE_NAME dalam service-worker.js
# -----------------------------------------------
$swPath = Join-Path $PSScriptRoot $swFile
if (Test-Path $swPath) {
    $swContent = Get-Content $swPath -Raw -Encoding UTF8
    $swOriginal = $swContent

    # Pattern: CACHE_NAME = "PNR-CACHE-xxx"
    $swPattern = '(const\s+CACHE_NAME\s*=\s*")[^"]*(")'
    $newCacheName = "PNR-CACHE-v$version"
    $swContent = [regex]::Replace($swContent, $swPattern, "`${1}$newCacheName`${2}")

    if ($swContent -ne $swOriginal) {
        [System.IO.File]::WriteAllText($swPath, $swContent, [System.Text.UTF8Encoding]::new($false))
        Write-Host "  [OK] $swFile - CACHE_NAME -> $newCacheName" -ForegroundColor Green
    } else {
        Write-Host "  [OK] $swFile - tiada perubahan" -ForegroundColor DarkGray
    }
} else {
    Write-Host "  [SKIP] $swFile tidak dijumpai" -ForegroundColor DarkGray
}

# -----------------------------------------------
# RINGKASAN
# -----------------------------------------------
Write-Host ""
Write-Host "--------------------------------------" -ForegroundColor Cyan
Write-Host "  Siap! $totalUpdated reference JS/CSS telah dikemaskini." -ForegroundColor Green
Write-Host "  CACHE_NAME telah dikemaskini." -ForegroundColor Green
Write-Host ""
Write-Host "  Seterusnya jalankan:" -ForegroundColor White
Write-Host "    git add -A" -ForegroundColor Yellow
Write-Host "    git commit -m 'bump: cache v$version'" -ForegroundColor Yellow
Write-Host "    git push" -ForegroundColor Yellow
Write-Host "--------------------------------------" -ForegroundColor Cyan
Write-Host ""
