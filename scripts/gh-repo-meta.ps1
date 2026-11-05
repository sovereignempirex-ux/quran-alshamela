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
    Accept                 = "application/vnd.github+json"
}

$meta = Get-Content (Join-Path $PSScriptRoot "gh-repo-meta.json") -Raw -Encoding UTF8 | ConvertFrom-Json

# الوصف والرابط الرسمي
$body = @{
    description = $meta.description
    homepage    = $meta.homepage
    has_issues  = $true
} | ConvertTo-Json
$updated = Invoke-RestMethod -Uri ("https://api.github.com/repos/" + $repo) -Method Patch -Headers $headers -Body $body -ContentType "application/json; charset=utf-8"
Write-Output ("description length: " + $updated.description.Length + ", homepage: " + $updated.homepage)

# المواضيع (topics)
$topicsBody = @{ names = $meta.topics } | ConvertTo-Json
Invoke-RestMethod -Uri ("https://api.github.com/repos/" + $repo + "/topics") -Method Put -Headers $headers -Body ([System.Text.Encoding]::UTF8.GetBytes($topicsBody)) -ContentType "application/json; charset=utf-8"
Write-Output ("topics updated: " + $meta.topics.Count)
