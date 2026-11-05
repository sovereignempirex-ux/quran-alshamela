# Upload release assets with curl.exe (robust for very large files, 3 retries each)
$ErrorActionPreference = "Continue"
$env:GCM_INTERACTIVE = "Never"
$inputText = "protocol=https`nhost=github.com`nusername=sovereignempirex-ux`n`n"
$out = $inputText | & "C:\Program Files\Git\mingw64\bin\git-credential-manager.exe" get 2>&1
$pass = ($out | Where-Object { $_ -match '^password=' }) -replace 'password=', ''
if (-not $pass) { throw "no token" }

$repo = "sovereignempirex-ux/quran-alshamela"
$pkg = Get-Content (Join-Path (Split-Path $PSScriptRoot -Parent) "package.json") -Raw -Encoding UTF8 | ConvertFrom-Json
$tag = "v" + $pkg.version
Write-Output ("release tag: " + $tag)

$rel = Invoke-RestMethod -Uri ("https://api.github.com/repos/" + $repo + "/releases/tags/" + $tag) -Headers @{ Authorization = "Bearer " + $pass; "User-Agent" = "curl-deploy" }

$root = Join-Path (Split-Path $PSScriptRoot -Parent) "release"
$files = @(Get-ChildItem $root -File | Where-Object {
        ($_.Name -like "Quran-AlShamela*.exe" -and $_.Name -notlike "*blockmap*" -and $_.Name -notlike "*uninstaller*") -or
        ($_.Name -like "Quran-AlShamela*.apk") -or
        ($_.Name -eq "web-app.zip")
    })

# delete old same-name assets first
$existing = Invoke-RestMethod -Uri ("https://api.github.com/repos/" + $repo + "/releases/" + $rel.id) -Headers @{ Authorization = "Bearer " + $pass; "User-Agent" = "curl-deploy" }
$wanted = @{}
foreach ($f in $files) { $wanted[$f.Name.Replace(" ", ".")] = $true }
foreach ($a in $existing.assets) {
    if ($wanted.ContainsKey($a.name)) {
        Write-Output ("removing old asset: " + $a.name)
        Invoke-RestMethod -Uri ("https://api.github.com/repos/" + $repo + "/releases/assets/" + $a.id) -Method Delete -Headers @{ Authorization = "Bearer " + $pass; "User-Agent" = "curl-deploy" } | Out-Null
    }
}

$ok = 0; $fail = 0
foreach ($f in $files) {
    $urlName = [uri]::EscapeDataString($f.Name)
    $url = "https://uploads.github.com/repos/" + $repo + "/releases/" + $rel.id + "/assets?name=" + $urlName
    $success = $false
    for ($attempt = 1; $attempt -le 4 -and -not $success; $attempt++) {
        Write-Output ("upload attempt " + $attempt + ": " + $f.Name)
        & curl.exe -sS -X POST $url -H "Authorization: Bearer $pass" -H "Content-Type: application/octet-stream" -H "Accept: application/vnd.github+json" --data-binary "@$($f.FullName)" -o tmp-asset.json
        $code = $LASTEXITCODE
        if ($code -eq 0) {
            $asset = Get-Content tmp-asset.json -Raw | ConvertFrom-Json
            if ($asset.id) {
                Write-Output ("uploaded ok: " + $asset.name + " state=" + $asset.state)
                $success = $true
            } else {
                $msg = ""
                if ($asset.message) { $msg = $asset.message }
                Write-Output ("api error: " + $msg)
            }
        } else {
            Write-Output ("curl exit code: " + $code)
        }
    }
    if ($success) { $ok = $ok + 1 } else { $fail = $fail + 1 }
}
Remove-Item tmp-asset.json -ErrorAction SilentlyContinue
Write-Output ("finished. ok=" + $ok + " fail=" + $fail)
