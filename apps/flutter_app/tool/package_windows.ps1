param([string]$Compiler)
$ErrorActionPreference='Stop'
$projectRoot=Split-Path $PSScriptRoot -Parent
$releaseRoot=Join-Path $projectRoot 'build/windows/x64/runner/Release'
# Flutter's generated artifacts are shared between modes. Never package while
# another debug/profile build is running; compare the actual release engine.
$flutterCommand=Get-Command flutter -ErrorAction Stop
$flutterSdk=Split-Path (Split-Path $flutterCommand.Source -Parent) -Parent
$expectedEngine=Join-Path $flutterSdk 'bin/cache/artifacts/engine/windows-x64-release/flutter_windows.dll'
if ((Get-FileHash -LiteralPath $expectedEngine).Hash -ne (Get-FileHash -LiteralPath (Join-Path $releaseRoot 'flutter_windows.dll')).Hash) {
  throw 'Flutter runtime is not the release engine. Finish other builds, then rebuild Release before packaging.'
}
foreach($name in @('mediaforge_desktop.exe','flutter_windows.dll','data/app.so','tools/ffmpeg.exe','tools/ffprobe.exe','tools/yt-dlp.exe','tools/FFmpeg-LICENSE','tools/SOURCE-NOTICE.txt')) {
  if (!(Test-Path -LiteralPath (Join-Path $releaseRoot $name))) {throw "Missing release dependency: $name"}
}
# Only Microsoft's documented application-local redistributable CRT DLLs.
$vcRoot=Join-Path ${env:ProgramFiles} 'Microsoft Visual Studio/18/Community/VC/Redist/MSVC'
$crt=Get-ChildItem -LiteralPath $vcRoot -Filter 'Microsoft.VC145.CRT' -Directory -Recurse | Sort-Object FullName -Descending | Select-Object -First 1
if ($null -eq $crt -or $crt.FullName -notmatch '[\\/]x64[\\/]') {
  $crt=Get-ChildItem -LiteralPath $vcRoot -Filter 'Microsoft.VC145.CRT' -Directory -Recurse | Where-Object {$_.FullName -match '[\\/]x64[\\/]'} | Select-Object -First 1
}
if($null -eq $crt) {throw 'Locate the licensed x64 Visual C++ redistributable CRT before packaging.'}
Get-ChildItem -LiteralPath $crt.FullName -Filter '*.dll' | Copy-Item -Destination $releaseRoot -Force
if (!$Compiler) { $Compiler=Join-Path $projectRoot 'build/toolchain/inno/ISCC.exe' }
if (!(Test-Path -LiteralPath $Compiler)) {throw 'Specify the installed Inno Setup ISCC.exe compiler.'}
& $Compiler (Join-Path $projectRoot 'installer/MediaForge.iss')
if ($LASTEXITCODE -ne 0) {throw 'Installer compilation failed.'}
