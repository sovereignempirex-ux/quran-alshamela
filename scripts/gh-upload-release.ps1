$ErrorActionPreference = "Stop"
$env:GCM_INTERACTIVE = "Never"
$inputText = "protocol=https`nhost=github.com`nusername=sovereignempirex-ux`n`n"
$out = $inputText | & "C:\Program Files\Git\mingw64\bin\git-credential-manager.exe" get 2>&1
$pass = ($out | Where-Object { $_ -match '^password=' }) -replace 'password=', ''
if (-not $pass) { throw "no token" }

$repo = "sovereignempirex-ux/quran-alshamela"
$releaseId = "433913687"

$files = @(
    @{ src = "Quran-AlShamela Setup 2.2.0.exe"; type = "application/vnd.microsoft.portable-executable" },
    @{ src = "Quran-AlShamela 2.2.0.exe"; type = "application/vnd.microsoft.portable-executable" },
    @{ src = "Quran-AlShamela-v2.2.0-debug.apk"; type = "application/vnd.android.package-archive" }
)

$root = Join-Path (Split-Path $PSScriptRoot -Parent) "release"
foreach ($f in $files) {
    $local = Join-Path $root $f.src
    if (-not (Test-Path $local)) { Write-Output ("MISSING: " + $local); continue }
    $name = [uri]::EscapeDataString($f.src)
    $url = "https://uploads.github.com/repos/$repo/releases/$releaseId/assets?name=$name"
    Write-Output ("uploading: " + $f.src + " (" + [math]::Round((Get-Item $local).Length / 1MB, 1).ToString() + " MB)")
    try {
        $res = Invoke-RestMethod -Uri $url -Method Post -Headers @{ Authorization = "Bearer " + $pass; "X-GitHub-Api-Version" = "2022-11-28"; "User-Agent" = "opencode-deploy" } -InFile $local -ContentType $f.type
        Write-Output ("uploaded: " + $res.name + " state=" + $res.state)
    } catch {
        Write-Output ("UPLOAD FAILED for " + $f.src + ": " + $_.Exception.Message)
        if ($_.ErrorDetails -and $_.ErrorDetails.Message) { Write-Output $_.ErrorDetails.Message }
    }
}
Write-Output "all-uploads-done"
