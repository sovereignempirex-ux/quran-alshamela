// إنشاء GitHub Release باسم v<إصدار package.json> (أو إيجاده إن كان موجوداً)
// الاستخدام: powershell -File scripts/gh-release.ps1
$ErrorActionPreference = "Stop"
$env:GCM_INTERACTIVE = "Never"
$inputText = "protocol=https`nhost=github.com`nusername=sovereignempirex-ux`n`n"
$out = $inputText | & "C:\Program Files\Git\mingw64\bin\git-credential-manager.exe" get 2>&1
$pass = ($out | Where-Object { $_ -match '^password=' }) -replace 'password=', ''
if (-not $pass) { throw "no token" }

$repo = "sovereignempirex-ux/quran-alshamela"
$headers = @{
    Authorization          = "Bearer $pass"
    "X-GitHub-Api-Version" = "2022-11-28"
    "User-Agent"           = "opencode-deploy"
}

$pkg = Get-Content (Join-Path (Split-Path $PSScriptRoot -Parent) "package.json") -Raw | ConvertFrom-Json
$tag = "v" + $pkg.version
Write-Output ("tag: " + $tag)

try {
    $rel = Invoke-RestMethod -Uri ("https://api.github.com/repos/" + $repo + "/releases/tags/" + $tag) -Headers $headers
    Write-Output ("release exists. id=" + $rel.id + " url=" + $rel.html_url)
} catch {
    $body = @{
        tag_name         = $tag
        target_commitish = "main"
        name             = "$tag - Quran AlShamela"
        body             = "Release binaries: Windows Setup EXE, Windows Portable EXE, Android APK"
        draft            = $false
        prerelease       = $false
    } | ConvertTo-Json
    $rel = Invoke-RestMethod -Uri ("https://api.github.com/repos/" + $repo + "/releases") -Method Post -Headers $headers -Body $body -ContentType "application/json"
    Write-Output ("created release id=" + $rel.id + " url=" + $rel.html_url)
}
