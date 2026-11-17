param([string]$Installer)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$repoRoot = [IO.Path]::GetFullPath((Join-Path $projectRoot '../..'))
if (!$Installer) { $Installer = Join-Path $repoRoot 'releases/MediaForge-Setup-v1.0.exe' }
$runRoot = Join-Path $projectRoot ('build/installer-verification/' + [DateTime]::UtcNow.ToString('yyyyMMdd-HHmmss'))
$installRoot = Join-Path $runRoot 'MediaForge App'
$startGroup = 'MediaForge'
$menuRoot = Join-Path ([Environment]::GetFolderPath('StartMenu')) ('Programs/' + $startGroup)
$desktopLink = Join-Path ([Environment]::GetFolderPath('DesktopDirectory')) 'MediaForge.lnk'
$registryKey = 'HKCU:/Software/Microsoft/Windows/CurrentVersion/Uninstall/{8BE30DAE-3227-4595-8D03-D5359B66DE26}_is1'
if (Test-Path -LiteralPath $registryKey) { throw 'An existing MediaForge installation is registered. Do not overwrite it for this test.' }
if (Test-Path -LiteralPath $menuRoot) { throw 'The verification Start Menu group already exists.' }
if (Test-Path -LiteralPath $desktopLink) { throw 'A MediaForge Desktop shortcut already exists. Do not overwrite it for this test.' }
if (Test-Path -LiteralPath $installRoot) { throw 'The verification install directory already exists.' }
New-Item -ItemType Directory -Force -Path $runRoot | Out-Null
$report = [ordered]@{ installer = $Installer; testDirectory = $installRoot; checks = [ordered]@{}; success = $false }
$testApp = $null
$installed = $false
try {
    $setupArgs = @('/VERYSILENT','/SUPPRESSMSGBOXES','/NORESTART','/SP-',
        ('/DIR="' + $installRoot + '"'),
        '/TASKS="desktopicon"', ('/LOG="' + (Join-Path $runRoot 'install.log') + '"'))
    $setup = Start-Process -FilePath $Installer -ArgumentList $setupArgs -WindowStyle Hidden -PassThru -Wait
    if ($setup.ExitCode -ne 0) { throw "Installer exit code: $($setup.ExitCode)" }
    $installed = $true
    $report.checks.install = $true
    $manifest = Get-Content -LiteralPath (Join-Path $repoRoot 'releases/MediaForge-v1.0-runtime-manifest.json') -Raw | ConvertFrom-Json
    foreach ($entry in $manifest) {
        $file = Join-Path $installRoot $entry.path
        if (!(Test-Path -LiteralPath $file) -or (Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash -ne $entry.sha256) {
            throw "Installed runtime file is missing or changed: $($entry.path)"
        }
    }
    $report.checks.runtimeFilesVerified = @($manifest).Count
    $shell = New-Object -ComObject WScript.Shell
    foreach ($link in @((Join-Path $menuRoot 'MediaForge.lnk'), $desktopLink)) {
        if (!(Test-Path -LiteralPath $link)) { throw "Missing shortcut: $link" }
        if ($shell.CreateShortcut($link).TargetPath -ne (Join-Path $installRoot 'mediaforge_desktop.exe')) { throw 'Shortcut has an incorrect target.' }
    }
    $report.checks.startMenuShortcut = $true
    $report.checks.optionalDesktopShortcut = $true
    $registration = Get-ItemProperty -LiteralPath $registryKey
    if ($registration.DisplayName -ne 'MediaForge v1.0' -or $registration.InstallLocation.TrimEnd('\') -ne $installRoot) {
        throw 'Installed Apps registration is incorrect.'
    }
    $report.checks.installedAppsRegistration = $true
    $testApp = Start-Process -FilePath (Join-Path $installRoot 'mediaforge_desktop.exe') -WorkingDirectory $installRoot -WindowStyle Hidden -PassThru
    for ($i = 0; $i -lt 50; $i++) {
        Start-Sleep -Milliseconds 200
        $testApp.Refresh()
        if ($testApp.HasExited) { throw "Installed application exited during startup: $($testApp.ExitCode)" }
        if ($testApp.MainWindowHandle -ne 0) { break }
    }
    if ($testApp.MainWindowHandle -eq 0 -or !$testApp.Responding) { throw 'Installed application did not create a responsive window.' }
    $report.checks.applicationLaunch = @{ pid = $testApp.Id; executable = $testApp.Path; title = $testApp.MainWindowTitle; responding = $testApp.Responding }
    if (!$testApp.CloseMainWindow()) { throw 'Could not request a normal close of the verification application.' }
    if (!$testApp.WaitForExit(20000)) { throw 'Verification application did not close normally.' }
    $report.checks.applicationNormalClose = $true
    foreach ($tool in @('ffmpeg','ffprobe','yt-dlp')) {
        $toolArgs = if ($tool -eq 'yt-dlp') { @('--version') } else { @('-version') }
        $toolProcess = Start-Process -FilePath (Join-Path $installRoot ('tools/' + $tool + '.exe')) -ArgumentList $toolArgs -WindowStyle Hidden -PassThru -Wait `
            -RedirectStandardOutput (Join-Path $runRoot ($tool + '.stdout.log')) -RedirectStandardError (Join-Path $runRoot ($tool + '.stderr.log'))
        if ($toolProcess.ExitCode -ne 0) { throw "Installed tool failed: $tool" }
        $report.checks[$tool] = (Get-Content -LiteralPath (Join-Path $runRoot ($tool + '.stdout.log')) -First 1).ToString()
    }
    $report.checks.backendBundled = @(Get-ChildItem -LiteralPath $installRoot -Recurse -File -Filter '*.jar').Count -gt 0
    if ($report.checks.backendBundled) { throw 'Unexpected Java archive in standalone installer.' }
} catch {
    $report.error = $_.Exception.Message
} finally {
    # Never close the user's source-tree application or an unrelated process.
    if ($testApp -and !$testApp.HasExited) {
        $testApp.Refresh()
        if ($testApp.Path -eq (Join-Path $installRoot 'mediaforge_desktop.exe')) {
            $null = $testApp.CloseMainWindow()
            if (!$testApp.WaitForExit(5000)) { Stop-Process -Id $testApp.Id -Force }
        }
    }
    if ($installed) {
        $uninstaller = Join-Path $installRoot 'unins000.exe'
        if (Test-Path -LiteralPath $uninstaller) {
            $uninstall = Start-Process -FilePath $uninstaller -ArgumentList @('/VERYSILENT','/SUPPRESSMSGBOXES','/NORESTART',('/LOG="' + (Join-Path $runRoot 'uninstall.log') + '"')) -WindowStyle Hidden -PassThru -Wait
            for ($i = 0; $i -lt 50 -and (Test-Path -LiteralPath $uninstaller); $i++) { Start-Sleep -Milliseconds 200 }
            $report.checks.uninstallExitCode = $uninstall.ExitCode
            $report.checks.installDirectoryRemoved = !(Test-Path -LiteralPath $installRoot)
            $report.checks.uninstall = $uninstall.ExitCode -eq 0 -and !(Test-Path -LiteralPath $uninstaller) -and !(Test-Path -LiteralPath $registryKey) -and !(Test-Path -LiteralPath $desktopLink) -and !(Test-Path -LiteralPath (Join-Path $menuRoot 'MediaForge.lnk'))
        }
    }
    $report.success = !$report.Contains('error') -and $report.checks.uninstall -eq $true
    $report | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $repoRoot 'releases/MediaForge-v1.0-verification.json') -Encoding UTF8
    $report | ConvertTo-Json -Depth 6
}
if (!$report.success) { throw 'Installer verification failed. Inspect releases/MediaForge-v1.0-verification.json.' }
