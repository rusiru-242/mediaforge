param(
    [string]$Compiler,
    [string]$FlutterSdk,
    [string]$CrtDirectory
)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$repositoryRoot = [IO.Path]::GetFullPath((Join-Path $projectRoot '../..'))
$releaseRoot = Join-Path $projectRoot 'build/windows/x64/runner/Release'
$outputRoot = Join-Path $repositoryRoot 'releases'
if (!$FlutterSdk) {
    if ($env:FLUTTER_ROOT) { $FlutterSdk = $env:FLUTTER_ROOT }
    else {
        $flutterCommand = Get-Command flutter -ErrorAction SilentlyContinue
        if ($flutterCommand) { $FlutterSdk = Split-Path (Split-Path $flutterCommand.Source -Parent) -Parent }
    }
}
if (!$FlutterSdk) { throw 'Pass -FlutterSdk or make flutter available on PATH.' }
$expectedEngine = Join-Path $FlutterSdk 'bin/cache/artifacts/engine/windows-x64-release/flutter_windows.dll'
if ((Get-FileHash -LiteralPath $expectedEngine).Hash -ne (Get-FileHash -LiteralPath (Join-Path $releaseRoot 'flutter_windows.dll')).Hash) {
    throw 'The staged Flutter runtime is not the release engine. Rebuild Windows Release before packaging.'
}
foreach ($name in @('mediaforge_desktop.exe','flutter_windows.dll','data/app.so','data/icudtl.dat','tools/ffmpeg.exe','tools/ffprobe.exe','tools/yt-dlp.exe','tools/FFmpeg-LICENSE','tools/SOURCE-NOTICE.txt')) {
    if (!(Test-Path -LiteralPath (Join-Path $releaseRoot $name))) { throw "Missing release dependency: $name" }
}
if (!$CrtDirectory) {
    $vswhere = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio/Installer/vswhere.exe'
    if (!(Test-Path -LiteralPath $vswhere)) { throw 'Pass -CrtDirectory with the licensed x64 Visual C++ redistributable CRT folder.' }
    $vsInstall = & $vswhere -latest -products '*' -property installationPath
    $redistRoot = Join-Path $vsInstall 'VC/Redist/MSVC'
    $crt = Get-ChildItem -LiteralPath $redistRoot -Filter 'Microsoft.VC*.CRT' -Directory -Recurse |
        Where-Object { $_.FullName -match '[\\/]x64[\\/]' -and $_.FullName -notmatch '[\\/]onecore[\\/]' } |
        Sort-Object FullName -Descending | Select-Object -First 1
    if (!$crt) { throw 'No supported x64 app-local Visual C++ CRT was found.' }
    $CrtDirectory = $crt.FullName
}
foreach ($dll in @('msvcp140.dll','vcruntime140.dll','vcruntime140_1.dll')) {
    if (!(Test-Path -LiteralPath (Join-Path $CrtDirectory $dll))) { throw "Missing CRT runtime: $dll" }
}
Get-ChildItem -LiteralPath $CrtDirectory -Filter '*.dll' | Copy-Item -Destination $releaseRoot -Force
if (!$Compiler) {
    $compilerCommand = Get-Command ISCC.exe -ErrorAction SilentlyContinue
    $compilerCandidates = @(
        (Join-Path $projectRoot 'build/toolchain/inno/ISCC.exe'),
        (Join-Path ${env:ProgramFiles} 'Inno Setup 7/ISCC.exe'),
        (Join-Path ${env:ProgramFiles(x86)} 'Inno Setup 6/ISCC.exe'),
        (Join-Path $env:LOCALAPPDATA 'Programs/Antigravity IDE/resources/app/node_modules/innosetup/bin/ISCC.exe')
    )
    if ($compilerCommand) { $Compiler = $compilerCommand.Source }
    else { $Compiler = $compilerCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1 }
}
if (!$Compiler -or !(Test-Path -LiteralPath $Compiler)) { throw 'Pass -Compiler with an installed Inno Setup ISCC.exe.' }
New-Item -ItemType Directory -Force -Path $outputRoot | Out-Null
$manifest = Get-ChildItem -LiteralPath $releaseRoot -File -Recurse | ForEach-Object {
    [pscustomobject]@{
        path = $_.FullName.Substring($releaseRoot.Length + 1)
        bytes = $_.Length
        sha256 = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
    }
}
$manifest | ConvertTo-Json -Depth 3 | Set-Content -LiteralPath (Join-Path $outputRoot 'MediaForge-v1.0-runtime-manifest.json') -Encoding UTF8
& $Compiler (Join-Path $projectRoot 'installer/MediaForge.iss')
if ($LASTEXITCODE -ne 0) { throw 'Installer compilation failed.' }
$installer = Join-Path $outputRoot 'MediaForge-Setup-v1.0.exe'
if (!(Test-Path -LiteralPath $installer)) { throw 'Compiler did not produce the requested installer.' }
(Get-FileHash -LiteralPath $installer -Algorithm SHA256).Hash.ToLowerInvariant() + '  MediaForge-Setup-v1.0.exe' |
    Set-Content -LiteralPath (Join-Path $outputRoot 'MediaForge-Setup-v1.0.exe.sha256') -Encoding ASCII
Write-Output "Installer ready: $installer"
