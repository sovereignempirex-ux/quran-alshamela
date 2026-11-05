# Pack the static export (out/) into release/web-app.zip for self-updates.
# Excludes out/downloads (storage space), keeps everything else.
# Runs via: powershell -File scripts/pack-web.ps1
$ErrorActionPreference = "Stop"

$root = Split-Path $PSScriptRoot -Parent
$out = Join-Path $root "out"
$release = Join-Path $root "release"
if (-not (Test-Path $out)) { Write-Output "out/ not found. Run npm run build first."; exit 1 }
if (-not (Test-Path $release)) { New-Item -ItemType Directory -Path $release | Out-Null }

# staging folder: copy out/ except downloads/
$stage = Join-Path $env:TEMP ("quran-webapp-" + [guid]::NewGuid().ToString("N").Substring(0, 8))
New-Item -ItemType Directory -Path $stage | Out-Null

Get-ChildItem $out | Where-Object { $_.Name -ne "downloads" } | ForEach-Object {
    Copy-Item $_.FullName -Destination $stage -Recurse -Force
}

$zip = Join-Path $release "web-app.zip"
if (Test-Path -LiteralPath $zip) { Remove-Item -LiteralPath $zip -Force }
Compress-Archive -Path (Join-Path $stage "*") -DestinationPath $zip -CompressionLevel Optimal
try { Remove-Item -LiteralPath $stage -Recurse -Force -ErrorAction Stop } catch {
    Get-ChildItem -LiteralPath $env:TEMP -Filter "quran-webapp-*" -Directory |
        Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
}

$mb = [math]::Round((Get-Item $zip).Length / 1MB, 1)
Write-Output ("web-app.zip created: " + $zip + " (" + $mb + " MB)")
