$exe = Join-Path $PSScriptRoot ".." | Join-Path -ChildPath "release\Quran-AlShamela 2.2.0.exe"
Write-Output ("exists: " + (Test-Path $exe))
$p = Start-Process -FilePath $exe -PassThru
for ($i = 1; $i -le 8; $i++) {
    Start-Sleep -Seconds 1
    $p.Refresh()
    $q = Get-Process -Name "Quran-AlShamela" -ErrorAction SilentlyContinue
    Write-Output ("t=" + $i + " wrapper alive=" + (-not $p.HasExited) + " appProcs=" + (($q | Measure-Object).Count))
    if ($q) { Write-Output ("appProc sample: " + $q[0].ProcessName) }
    if ($q -and $i -ge 4) { $q | Stop-Process -Force; Write-Output "killed app procs"; break }
}
if (-not $p.HasExited) { Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue }
