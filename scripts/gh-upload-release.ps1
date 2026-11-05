// رفع ملفات الإصدار الحالي من release/ إلى GitHub Release v<إصدار package.json>
// Interesting: يعتمد أسماء pattern "Quran-AlShamela*", يوقعها كيكمو (مسافات←نقاط) تلقائياً
// الاستخدام: powershell -File scripts/gh-upload-release.ps1
$ErrorActionPreference = "Stop"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$env:GCM_INTERACTIVE = "Never"
$inputText = "protocol=https`nhost=github.com`nusername=sovereignempirex-ux`n`n"
$out = $inputText | & "C:\Program Files\Git\mingw64\bin\git-credential-manager.exe" get 2>&1
$pass = ($out | Where-Object { $_ -match '^password=' }) -replace 'password=', ''
if (-not $pass) { throw "no token" }

$repo = "sovereignempirex-ux/quran-alshamela"

$pkg = Get-Content (Join-Path (Split-Path $PSScriptRoot -Parent) "package.json") -Raw -Encoding UTF8 | ConvertFrom-Json
$tag = "v" + $pkg.version
Write-Output ("release tag: " + $tag)

$headers = @{
    Authorization          = "Bearer $pass"
    "X-GitHub-Api-Version" = "2022-11-28"
    "User-Agent"           = "opencode-deploy"
}

# إيجاد أو إنشاء الإصدار
try {
    $rel = Invoke-RestMethod -Uri ("https://api.github.com/repos/" + $repo + "/releases/tags/" + $tag) -Headers $headers
    Write-Output ("release exists. id=" + $rel.id)
} catch {
    $body = @{
        tag_name         = $tag
        target_commitish = "main"
        name             = "$tag - Quran AlShamela"
        body             = "Release binaries: Windows Setup EXE, Windows Portable EXE, Android APK"
        draft            = $false
        prerelease       = $false
    } | ConvertTo-Json
    $rel = Invoke-RestMethod -Uri ("https://api.github.com/repos/" + $repo + "/releases") -Method Post -Headers $headers -Body $body -ContentType "application/json; charset=utf-8"
    Write-Output ("created release id=" + $rel.id)
}

# الملفات: كل EXE ليس لديه blockmap/uninstaller + كل APK، من release/
$root = Join-Path (Split-Path $PSScriptRoot -Parent) "release"
$files = @(Get-ChildItem $root -File | Where-Object {
        ($_.Name -like "Quran-AlShamela*.exe" -and $_.Name -notlike "*blockmap*" -and $_.Name -notlike "*uninstaller*") -or
        ($_.Name -like "Quran-AlShamela*.apk")
    })
if (-not $files.Count) { Write-Output "no files to upload in release/"; exit 1 }

# حذف أي مرفق قديم بنفس الاسم (لإعادة الرفع)
$existing = Invoke-RestMethod -Uri ("https://api.github.com/repos/" + $repo + "/releases/" + $rel.id) -Headers $headers
$exact = @{}
foreach ($f in $files) { $exact[$f.Name] = $true }
foreach ($a in $existing.assets) {
    if ($exact.ContainsKey($a.name) -or ($a.name -match "\.(exe|apk)$" -and $exact[$a.name -replace "Setup\.", "Setup "])) {
        Write-Output ("removing old asset: " + $a.name)
        Invoke-RestMethod -Uri ("https://api.github.com/repos/" + $repo + "/releases/assets/" + $a.id) -Method Delete -Headers $headers | Out-Null
    }
}

foreach ($f in $files) {
    $name = [uri]::EscapeDataString($f.Name)
    $url = "https://uploads.github.com/repos/$repo/releases/" + $rel.id + "/assets?name=$name"
    Write-Output ("uploading: " + $f.Name + " (" + [math]::Round($f.Length / 1MB, 1) + " MB)")
    # بث مباشر دون تخزين الذاكرة: يستخدم قراءة الملف مباشرة
    $fs = $null
    $fs = [System.IO.File]::OpenRead($f.FullName)
    try {
        $req = [System.Net.HttpWebRequest]::Create($url)
        $req.Method = "POST"
        $req.ContentType = "application/octet-stream"
        $req.Headers.Add("Authorization", "Bearer " + $pass)
        $req.Headers.Add("X-GitHub-Api-Version", "2022-11-28")
        $req.UserAgent = "opencode-deploy"
        $req.ContentLength = $fs.Length
        $stream = $req.GetRequestStream()
        $fs.CopyTo($stream)
        $stream.Close()
        $resp = $req.GetResponse()
        $reader = New-Object IO.StreamReader($resp.GetResponseStream())
        $json = $reader.ReadToEnd() | ConvertFrom-Json
        $reader.Close(); $resp.Close()
        Write-Output ("uploaded: " + $json.name + " state=" + $json.state)
    } catch {
        Write-Output ("UPLOAD FAILED for " + $f.Name + ": " + $_.Exception.Message)
    } finally {
        if ($fs) { $fs.Dispose() }
    }
}
Write-Output "all-uploads-done"
