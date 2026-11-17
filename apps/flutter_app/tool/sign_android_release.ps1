param(
    [string]$Keystore = (Join-Path $env:USERPROFILE 'mediaforge-signing/mediaforge-release.jks'),
    [string]$KeyAlias = 'mediaforge',
    [string]$FlutterSdk,
    [string]$AndroidSdk,
    [string]$JavaHome,
    [switch]$ConsolePrompt
)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$buildRoot = Join-Path $projectRoot 'build'
New-Item -ItemType Directory -Force -Path $buildRoot | Out-Null
$statusFile = Join-Path $buildRoot 'android-production-signing-status.json'
$verificationFile = Join-Path $buildRoot 'android-production-signing-verification.json'
function Set-SigningStatus([string]$state) {
    if ($ConsolePrompt) { Write-Host "Signing status: $state" }
    @{ state = $state; updatedUtc = [DateTime]::UtcNow.ToString('o') } |
        ConvertTo-Json | Set-Content -LiteralPath $statusFile -Encoding UTF8
}
function Invoke-LoggedTool([string]$tool, [string[]]$toolArguments, [string]$log) {
    $previousPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        & $tool @toolArguments *> $log
        $result = $LASTEXITCODE
    } finally { $ErrorActionPreference = $previousPreference }
    if ($result -ne 0) { throw "A signing/build tool failed (exit $result). Inspect the local log: $log" }
}
try {
    if (!(Test-Path -LiteralPath $Keystore -PathType Leaf)) { throw 'Production keystore was not found.' }
    if (!$FlutterSdk) {
        if ($env:FLUTTER_ROOT) { $FlutterSdk = $env:FLUTTER_ROOT }
        else {
            $flutterCommand = Get-Command flutter -ErrorAction SilentlyContinue
            if ($flutterCommand) { $FlutterSdk = Split-Path (Split-Path $flutterCommand.Source -Parent) -Parent }
        }
    }
    if (!$FlutterSdk) { throw 'Pass -FlutterSdk or configure Flutter on PATH.' }
    if (!$AndroidSdk) {
        $AndroidSdk = if ($env:ANDROID_SDK_ROOT) { $env:ANDROID_SDK_ROOT } elseif ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { Join-Path $env:LOCALAPPDATA 'Android/Sdk' }
    }
    if (!$JavaHome) { $JavaHome = if ($env:JAVA_HOME) { $env:JAVA_HOME } else { Join-Path $env:ProgramFiles 'Android/Android Studio/jbr' } }
    $keytool = Join-Path $JavaHome 'bin/keytool.exe'
    $flutter = Join-Path $FlutterSdk 'bin/flutter.bat'
    $tools = Get-ChildItem -LiteralPath (Join-Path $AndroidSdk 'build-tools') -Directory |
        Where-Object { $_.Name -match '^\d+\.\d+\.\d+$' } | Sort-Object { [version]$_.Name } -Descending | Select-Object -First 1
    $apksigner = Join-Path $tools.FullName 'apksigner.bat'
    foreach ($tool in @($keytool, $flutter, $apksigner)) {
        if (!(Test-Path -LiteralPath $tool)) { throw 'Flutter, Java keytool or Android apksigner is unavailable.' }
    }
    $env:JAVA_HOME = $JavaHome
    $env:MEDIAFORGE_ANDROID_KEYSTORE = $Keystore
    $env:MEDIAFORGE_ANDROID_KEY_ALIAS = $KeyAlias
    if (!$env:MEDIAFORGE_ANDROID_STORE_PASSWORD -or !$env:MEDIAFORGE_ANDROID_KEY_PASSWORD) {
        Set-SigningStatus 'awaiting_local_passwords'
        if ($ConsolePrompt) {
            try { $host.UI.RawUI.WindowTitle = 'MediaForge - Android production signing' } catch {}
            Write-Host 'MediaForge production signing: passwords stay in this local process.'
            Write-Host 'Enter the keystore password, then the key password (Enter = same password).'
            $secureStore = Read-Host 'Keystore password' -AsSecureString
            $secureKey = Read-Host 'Key password (Enter = same)' -AsSecureString
            try {
                $env:MEDIAFORGE_ANDROID_STORE_PASSWORD = (New-Object System.Net.NetworkCredential('', $secureStore)).Password
                $env:MEDIAFORGE_ANDROID_KEY_PASSWORD = if ($secureKey.Length -eq 0) { $env:MEDIAFORGE_ANDROID_STORE_PASSWORD } else { (New-Object System.Net.NetworkCredential('', $secureKey)).Password }
            } finally { $secureStore.Dispose(); $secureKey.Dispose() }
        } else {
        Add-Type -AssemblyName System.Windows.Forms
        Add-Type -AssemblyName System.Drawing
        $form = New-Object System.Windows.Forms.Form
        $form.Text = 'MediaForge - Production Android signing'
        $form.Size = New-Object System.Drawing.Size(490,310)
        $form.StartPosition = 'CenterScreen'
        $form.FormBorderStyle = 'FixedDialog'
        $form.MaximizeBox = $false; $form.MinimizeBox = $false; $form.TopMost = $true
        $info = New-Object System.Windows.Forms.Label
        $info.Text = "Enter passwords locally. They are not saved to disk.`nKeystore: mediaforge-release.jks | Alias: $KeyAlias"
        $info.SetBounds(18,14,445,44)
        $storeLabel = New-Object System.Windows.Forms.Label
        $storeLabel.Text = 'Keystore password'; $storeLabel.SetBounds(18,64,430,20)
        $storeBox = New-Object System.Windows.Forms.TextBox
        $storeBox.UseSystemPasswordChar = $true; $storeBox.SetBounds(18,87,435,25)
        $same = New-Object System.Windows.Forms.CheckBox
        $same.Text = 'Key password is the same as the keystore password'
        $same.Checked = $true; $same.SetBounds(18,122,440,24)
        $keyBox = New-Object System.Windows.Forms.TextBox
        $keyBox.UseSystemPasswordChar = $true; $keyBox.Enabled = $false; $keyBox.SetBounds(18,155,435,25)
        $same.Add_CheckedChanged({ $keyBox.Enabled = !$same.Checked })
        $start = New-Object System.Windows.Forms.Button
        $start.Text = 'Build signed APK'; $start.SetBounds(225,208,130,32)
        $start.Add_Click({
            if (!$storeBox.Text.Length -or (!$same.Checked -and !$keyBox.Text.Length)) {
                [System.Windows.Forms.MessageBox]::Show('Enter the required password fields.','MediaForge') | Out-Null
                return
            }
            $form.DialogResult = [System.Windows.Forms.DialogResult]::OK
            $form.Close()
        })
        $cancel = New-Object System.Windows.Forms.Button
        $cancel.Text = 'Cancel'; $cancel.SetBounds(365,208,88,32)
        $cancel.DialogResult = [System.Windows.Forms.DialogResult]::Cancel
        $form.AcceptButton = $start; $form.CancelButton = $cancel
        $form.Controls.AddRange(@($info,$storeLabel,$storeBox,$same,$keyBox,$start,$cancel))
        if ($form.ShowDialog() -ne [System.Windows.Forms.DialogResult]::OK) {
            $form.Dispose(); Set-SigningStatus 'cancelled'; exit 2
        }
        $env:MEDIAFORGE_ANDROID_STORE_PASSWORD = $storeBox.Text
        $env:MEDIAFORGE_ANDROID_KEY_PASSWORD = if ($same.Checked) { $storeBox.Text } else { $keyBox.Text }
        $storeBox.Clear(); $keyBox.Clear(); $form.Dispose()
        }
    }
    Set-SigningStatus 'checking_production_certificate'
    $certificateFile = Join-Path $buildRoot 'android-production-certificate.der'
    Invoke-LoggedTool $keytool @('-exportcert','-keystore',$Keystore,'-alias',$KeyAlias,'-storepass:env','MEDIAFORGE_ANDROID_STORE_PASSWORD','-file',$certificateFile) (Join-Path $buildRoot 'android-production-certificate.log')
    $certificate = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($certificateFile)
    if ($certificate.Subject -match '(?i)\bCN\s*=\s*Android Debug\b') { throw 'The selected keystore contains an Android Debug certificate. Production signing was refused.' }
    $expectedFingerprint = (Get-FileHash -LiteralPath $certificateFile -Algorithm SHA256).Hash.ToLowerInvariant()
    # Do not leave passwords in a long-lived Gradle daemon or configuration cache.
    $env:GRADLE_OPTS = '-Dorg.gradle.daemon=false -Dorg.gradle.configuration-cache=false -Dorg.gradle.workers.max=2'
    Set-Location -LiteralPath $projectRoot
    Set-SigningStatus 'resolving_dependencies'
    Invoke-LoggedTool $flutter @('pub','get') (Join-Path $buildRoot 'android-production-pub-get.log')
    Set-SigningStatus 'building_release'
    Invoke-LoggedTool $flutter @('build','apk','--release') (Join-Path $buildRoot 'android-production-release-build.log')
    $apk = Join-Path $buildRoot 'app/outputs/flutter-apk/app-release.apk'
    Set-SigningStatus 'verifying_apk_signature'
    $signatureLog = Join-Path $buildRoot 'android-production-apksigner.log'
    Invoke-LoggedTool $apksigner @('verify','--verbose','--print-certs',$apk) $signatureLog
    $signature = Get-Content -LiteralPath $signatureLog -Raw
    if ($signature -match '(?i)CN\s*=\s*Android Debug') { throw 'APK is debug-signed. Release verification failed.' }
    $signers = [regex]::Matches($signature,'(?m)^[^\r\n]*certificate SHA-256 digest:\s*([a-fA-F0-9]{64})\s*$')
    if ($signers.Count -ne 1 -or $signers[0].Groups[1].Value.ToLowerInvariant() -ne $expectedFingerprint) { throw 'APK signer does not match the selected production keystore certificate.' }
    [ordered]@{
        success = $true; apk = $apk; keyAlias = $KeyAlias
        certificateSubject = $certificate.Subject
        certificateSha256 = $expectedFingerprint
        apkSha256 = (Get-FileHash -LiteralPath $apk -Algorithm SHA256).Hash.ToLowerInvariant()
        bytes = (Get-Item -LiteralPath $apk).Length
        apksignerVerified = $true; matchesProductionKeystore = $true; androidDebugCertificate = $false
    } | ConvertTo-Json | Set-Content -LiteralPath $verificationFile -Encoding UTF8
    Set-SigningStatus 'complete'
} catch {
    @{ success = $false; error = $_.Exception.Message } | ConvertTo-Json |
        Set-Content -LiteralPath $verificationFile -Encoding UTF8
    Set-SigningStatus 'failed'
    exit 1
} finally {
    Remove-Item Env:MEDIAFORGE_ANDROID_STORE_PASSWORD -ErrorAction SilentlyContinue
    Remove-Item Env:MEDIAFORGE_ANDROID_KEY_PASSWORD -ErrorAction SilentlyContinue
}
