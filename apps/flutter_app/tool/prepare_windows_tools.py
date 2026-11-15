"""Build-time staging only. End users need neither Python nor tools on PATH."""
import hashlib
import json
import re
import shutil
import subprocess
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'vendor' / 'windows' / 'tools'
DEST.mkdir(parents=True, exist_ok=True)

def fetch(url, target):
    req = urllib.request.Request(url, headers={'User-Agent': 'MediaForge-local-build'})
    with urllib.request.urlopen(req, timeout=120) as response, target.open('wb') as stream:
        shutil.copyfileobj(response, stream)

ffmpeg = Path(shutil.which('ffmpeg') or '').resolve()
if not ffmpeg.is_file():
    raise SystemExit('Build machine: supply a trusted FFmpeg distribution on PATH before staging.')
ffprobe = ffmpeg.with_name('ffprobe.exe')
if not ffprobe.is_file():
    raise SystemExit('FFprobe must come from the same FFmpeg distribution.')
for source in [ffmpeg, ffprobe]:
    shutil.copy2(source, DEST / source.name)
package = ffmpeg.parent.parent
for name in ['LICENSE', 'README.txt']:
    if not (package / name).is_file():
        raise SystemExit('FFmpeg redistribution license and build provenance are required.')
    shutil.copy2(package / name, DEST / ('FFmpeg-' + name))
readme = (package / 'README.txt').read_text(encoding='utf-8')
commit = re.search(r'Source Code:\s+https://github.com/FFmpeg/FFmpeg/commit/([0-9a-f]+)', readme)
if commit:
    source = DEST / 'FFmpeg-corresponding-upstream-source.tar.gz'
    if not source.exists():
        fetch('https://codeload.github.com/FFmpeg/FFmpeg/tar.gz/' + commit.group(1), source)

tag = '2026.10.26'
base = 'https://github.com/yt-dlp/yt-dlp/releases/download/' + tag
fetch(base + '/SHA2-256SUMS', DEST / 'yt-dlp-SHA2-256SUMS')
expected = next(line.split()[0] for line in (DEST / 'yt-dlp-SHA2-256SUMS').read_text().splitlines() if line.split()[-1].lstrip('*') == 'yt-dlp.exe')
extractor = DEST / 'yt-dlp.exe'
if not extractor.exists() or hashlib.sha256(extractor.read_bytes()).hexdigest() != expected:
    fetch(base + '/yt-dlp.exe', extractor)
if hashlib.sha256(extractor.read_bytes()).hexdigest() != expected:
    raise SystemExit('yt-dlp SHA256 verification failed.')
fetch('https://raw.githubusercontent.com/yt-dlp/yt-dlp/' + tag + '/LICENSE', DEST / 'yt-dlp-LICENSE')
fetch('https://raw.githubusercontent.com/yt-dlp/yt-dlp/' + tag + '/THIRD_PARTY_LICENSES.txt', DEST / 'yt-dlp-THIRD_PARTY_LICENSES.txt')
manifest = {}
for name in ['ffmpeg.exe', 'ffprobe.exe', 'yt-dlp.exe']:
    path = DEST / name
    version = subprocess.run([str(path), '--version' if name == 'yt-dlp.exe' else '-version'], check=True, capture_output=True, text=True).stdout.splitlines()[0]
    manifest[name] = {'version': version, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(), 'bytes': path.stat().st_size}
(DEST / 'manifest.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
(DEST / 'SOURCE-NOTICE.txt').write_text('''MediaForge invokes these unmodified tools as separate processes.
FFmpeg/FFprobe: Gyan essentials build, GPL version 3. See FFmpeg-LICENSE,
FFmpeg-README.txt (exact upstream commit, configuration and external library versions)
and the included upstream source archive. External library source/build recipes
must also accompany public redistribution as required by their licenses.
Upstream FFmpeg source alone is NOT the complete corresponding source of every
statically linked third-party library. Public redistribution is not licensed or
cleared merely by the existence of this installer. This local build is for
private evaluation; complete corresponding-source compliance must be reviewed
before conveying it to third parties. https://ffmpeg.org/legal.html
Provider: https://www.gyan.dev/ffmpeg/builds/
yt-dlp Windows executable and third-party notices: https://github.com/yt-dlp/yt-dlp
No third-party API keys, cookies, Java runtime or server is bundled.
''', encoding='utf-8')
print(json.dumps(manifest, indent=2))
