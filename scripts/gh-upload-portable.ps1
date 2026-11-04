$ErrorActionPreference = "Stop"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$env:GCM_INTERACTIVE = "Never"
$inputText = "protocol=https`nhost=github.com`nusername=sovereignempirex-ux`n`n"
$out = $inputText | & "C:\Program Files\Git\mingw64\bin\git-credential-manager.exe" get 2>&1
$pass = ($out | Where-Object { $_ -match '^password=' }) -replace 'password=', ''
if (-not $pass) { throw "no token" }

$repo = "sovereignempirex-ux/quran-alshamela"
$releaseId = "433913687"
$src = "Quran-AlShamela 2.2.0.exe"
$local = Join-Path (Split-Path $PSScriptRoot -Parent) "release\$src"

# إزالة أي مرفق جزئي بنفس الاسم
$checkUrl = "https://api.github.com/repos/$repo/releases/$releaseId"
$rel = Invoke-RestMethod -Uri $checkUrl -Headers @{ Authorization = "Bearer " + $pass; "User-Agent" = "opencode-deploy" }
foreach ($a in ($rel.assets | Where-Object { $_.name -eq $src })) {
    Write-Output ("deleting partial asset id=" + $a.id)
    Invoke-RestMethod -Uri ("https://api.github.com/repos/" + $repo + "/releases/assets/" + $a.id) -Method Delete -Headers @{ Authorization = "Bearer " + $pass; "User-Agent" = "opencode-deploy" } | Out-Null
}

$name = [uri]::EscapeDataString($src)
$url = "https://uploads.github.com/repos/$repo/releases/$releaseId/assets?name=$name"
Write-Output ("uploading: " + $src)
$res = Invoke-RestMethod -Uri $url -Method Post -Headers @{ Authorization = "Bearer " + $pass; "X-GitHub-Api-Version" = "2022-11-28"; "User-Agent" = "opencode-deploy" } -InFile $local -ContentType "application/vnd.microsoft.portable-executable"
Write-Output ("uploaded: " + $res.name + " state=" + $res.state)
