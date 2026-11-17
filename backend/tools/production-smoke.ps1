param(
    [Parameter(Mandatory=$true)][string]$MediaToolsDirectory,
    [int]$Port = 18081
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Net.Http
$backend = Split-Path $PSScriptRoot -Parent
$jar = Join-Path $backend 'target/mediaforge-backend-1.0.0.jar'
$tools = (Resolve-Path -LiteralPath $MediaToolsDirectory).Path
$run = Join-Path $backend ('target/production-smoke-' + [guid]::NewGuid().ToString('N'))
$storage = Join-Path $run 'storage'
New-Item -ItemType Directory -Path $storage -Force | Out-Null
# Never take over a running port or stop an existing backend.
$portCheck = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
try { $portCheck.Start() } finally { $portCheck.Stop() }
$values = @{
    PORT="$Port"; SPRING_PROFILES_ACTIVE='prod'; STORAGE_LOCAL_PATH=$storage;
    CORS_ALLOWED_ORIGINS='https://studio.example.com';
    FFMPEG_PATH=(Join-Path $tools 'ffmpeg.exe'); FFPROBE_PATH=(Join-Path $tools 'ffprobe.exe');
    YTDLP_PATH=(Join-Path $tools 'yt-dlp.exe'); RATE_LIMIT_RPM='1000'
}
$previous = @{}
$process = $null
$client = [System.Net.Http.HttpClient]::new()
$client.Timeout = [TimeSpan]::FromSeconds(15)
$base = "http://127.0.0.1:$Port"
$checks = [ordered]@{}
function Check-Response([string]$Path, [int]$Expected, [string]$Json = '') {
    if ($Json) {
        $content = [System.Net.Http.StringContent]::new($Json, [Text.Encoding]::UTF8, 'application/json')
        $response = $client.PostAsync("$base$Path", $content).GetAwaiter().GetResult()
        $content.Dispose()
    } else { $response = $client.GetAsync("$base$Path").GetAwaiter().GetResult() }
    $text = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
    $code = [int]$response.StatusCode
    $response.Dispose()
    if ($code -ne $Expected) { throw "$Path returned $code instead of $Expected : $text" }
    $checks[$Path] = @{status=$code}
    return $text
}
try {
    foreach ($key in $values.Keys) {
        $previous[$key] = [Environment]::GetEnvironmentVariable($key, 'Process')
        [Environment]::SetEnvironmentVariable($key, $values[$key], 'Process')
    }
    try {
        # Oracle's javapath shim can create a separate child JVM. Resolve the real
        # runtime binary so cleanup owns exactly the process that holds the JAR.
        $settings = [System.Diagnostics.ProcessStartInfo]::new((Get-Command java.exe).Source, '-XshowSettings:properties -version')
        $settings.UseShellExecute = $false
        $settings.CreateNoWindow = $true
        $settings.RedirectStandardError = $true
        $settingsProcess = [System.Diagnostics.Process]::Start($settings)
        $properties = $settingsProcess.StandardError.ReadToEnd()
        $settingsProcess.WaitForExit()
        $runtimeHome = [regex]::Match($properties, '(?m)^\s*java.home\s*=\s*(.+)$').Groups[1].Value.Trim()
        if (!$runtimeHome) { throw 'Could not resolve the real Java runtime.' }
        $java = Join-Path $runtimeHome 'bin/java.exe'
        $process = Start-Process -FilePath $java -ArgumentList @('-jar', ('"' + $jar + '"')) `
            -WorkingDirectory $backend -WindowStyle Hidden -PassThru `
            -RedirectStandardOutput (Join-Path $run 'stdout.log') -RedirectStandardError (Join-Path $run 'stderr.log')
    } finally {
        foreach ($key in $previous.Keys) { [Environment]::SetEnvironmentVariable($key, $previous[$key], 'Process') }
    }
    $ready = $false
    for ($i = 0; $i -lt 120; $i++) {
        if ($process.HasExited) { throw 'Production JVM exited during startup. Inspect target smoke logs.' }
        try {
            $response = $client.GetAsync("$base/actuator/health").GetAwaiter().GetResult()
            $ready = [int]$response.StatusCode -eq 200
            $response.Dispose()
            if ($ready) { break }
        } catch { }
        Start-Sleep -Milliseconds 500
    }
    if (!$ready) { throw 'Production readiness did not become healthy.' }
    $health = Check-Response '/actuator/health' 200
    if ($health -match 'components|ffmpeg|storage|path') { throw 'Public health leaks diagnostics.' }
    $null = Check-Response '/' 404
    $null = Check-Response '/api/v1' 404
    $null = Check-Response '/unknown-smoke-route' 404
    $null = Check-Response '/api/v1/health' 200
    $null = Check-Response '/api/v1/conversions/formats' 200
    $null = Check-Response '/actuator/env' 403
    $null = Check-Response '/api/v1/jobs' 403
    $null = Check-Response '/api/v1/conversions' 400 '{}'
    $null = Check-Response '/api/v1/downloads/metadata' 400 '{"url":"http://127.0.0.1/private"}'

    $inputFile = Join-Path $run 'owned-source.mp4'
    & $values.FFMPEG_PATH -v error -f lavfi -i 'testsrc2=size=640x480:rate=12:duration=1' `
        -f lavfi -i 'sine=frequency=440:duration=1' -c:v libx264 -preset ultrafast -c:a aac -shortest $inputFile
    if ($LASTEXITCODE -ne 0) { throw 'Owned fixture generation failed.' }
    $multipart = [System.Net.Http.MultipartFormDataContent]::new()
    $fileStream = [IO.File]::OpenRead($inputFile)
    $part = [System.Net.Http.StreamContent]::new($fileStream)
    $part.Headers.ContentType = [System.Net.Http.Headers.MediaTypeHeaderValue]::new('video/mp4')
    $multipart.Add($part, 'file', 'owned-source.mp4')
    try {
        $uploaded = $client.PostAsync("$base/api/v1/files/upload", $multipart).GetAwaiter().GetResult()
        if ([int]$uploaded.StatusCode -ne 201) { throw 'Real upload failed.' }
        $file = $uploaded.Content.ReadAsStringAsync().GetAwaiter().GetResult() | ConvertFrom-Json
        $uploaded.Dispose()
    } finally { $multipart.Dispose(); $fileStream.Dispose() }
    $request = @{inputFileId=$file.id; outputFormat='mp4'; targetResolution='360p'; startTime=0; endTime=0.8} | ConvertTo-Json
    $job = (Check-Response '/api/v1/conversions' 202 $request) | ConvertFrom-Json
    for ($i = 0; $i -lt 100; $i++) {
        $state = (Check-Response "/api/v1/jobs/$($job.jobId)" 200) | ConvertFrom-Json
        if ($state.status -eq 'COMPLETED') { break }
        if ($state.status -in @('FAILED','CANCELLED')) { throw "Job ended as $($state.status): $($state.errorMessage)" }
        Start-Sleep -Milliseconds 200
    }
    if ($state.status -ne 'COMPLETED') { throw 'Real conversion did not finish.' }
    $download = $client.GetAsync("$base/api/v1/files/$($state.outputFileId)/download").GetAwaiter().GetResult()
    if ([int]$download.StatusCode -ne 200 -or $download.Content.Headers.ContentType.MediaType -ne 'video/mp4') {
        throw 'Incorrect output HTTP status or MIME type.'
    }
    if (!$download.Content.Headers.ContentDisposition) { throw 'Missing attachment filename.' }
    $output = Join-Path $run 'verified-output.mp4'
    [IO.File]::WriteAllBytes($output, $download.Content.ReadAsByteArrayAsync().GetAwaiter().GetResult())
    $download.Dispose()
    $probe = (& $values.FFPROBE_PATH -v error -show_streams -show_format -of json $output | Out-String) | ConvertFrom-Json
    if ($LASTEXITCODE -ne 0 -or !($probe.streams.codec_type -contains 'video') -or !($probe.streams.codec_type -contains 'audio') `
            -or @($probe.streams | Where-Object { $_.codec_type -eq 'video' })[0].height -ne 360) {
        throw 'FFprobe output stream/resolution verification failed.'
    }
    $checks.realUploadConversionDownload = @{passed=$true; video=$true; audio=$true; height=360; mimeType='video/mp4'; filename=$true}
    $checks.cloudPortOverride = @{passed=$true; port=$Port}
    $checks.toolHealth = @{passed=$true; checksDisabled=$false}
    $checks | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $run 'checks.json') -Encoding UTF8
    Write-Output "Production smoke checks passed. Evidence: $run"
} finally {
    $client.Dispose()
    # Only terminate the JVM started by this script, never a listener on 8081.
    if ($process -and !$process.HasExited) {
        Stop-Process -Id $process.Id
        $process.WaitForExit()
    }
}
