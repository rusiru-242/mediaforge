"""Inspect owned emulator test exports independently with bundled FFmpeg."""
import array
import json
import os
from pathlib import Path
import subprocess

root = Path(__file__).resolve().parents[1]
adb = Path(os.environ['LOCALAPPDATA']) / 'Android/Sdk/platform-tools/adb.exe'
ffmpeg = root / 'vendor/windows/tools/ffmpeg.exe'
dest = root / 'build/mobile-effects-verification'
dest.mkdir(parents=True, exist_ok=True)

def device(*args):
    return subprocess.check_output([str(adb), '-s', 'emulator-5554', *args], timeout=60)

names = device('shell', 'run-as', 'com.mediaforge.app', 'ls', 'cache/mediaforge-jobs').decode().splitlines()
rows = []
for name in names:
    if not name.endswith(('.mp4', '.m4a')):
        continue
    local = dest / Path(name).name
    local.write_bytes(device('exec-out', 'run-as', 'com.mediaforge.app', 'cat', f'cache/mediaforge-jobs/{name}'))
    row = {'file': name, 'bytes': local.stat().st_size}
    if name.endswith('.mp4'):
        pixels = subprocess.check_output([str(ffmpeg), '-v', 'error', '-i', str(local), '-frames:v', '1', '-vf', 'scale=16:16', '-pix_fmt', 'rgb24', '-f', 'rawvideo', '-'], timeout=30)
        row['meanChannelDifference'] = sum(abs(pixels[i]-pixels[i+1])+abs(pixels[i+1]-pixels[i+2]) for i in range(0,len(pixels),3))/(len(pixels)/3)
    else:
        samples = array.array('f', subprocess.check_output([str(ffmpeg), '-v', 'error', '-i', str(local), '-ac', '1', '-ar', '8000', '-f', 'f32le', '-'], timeout=30))
        row['peakAudio'] = max(map(abs,samples), default=0)
    rows.append(row)
assert any(r.get('meanChannelDifference', 999) < 2 for r in rows), 'No grayscale video export found'
assert any(r.get('meanChannelDifference', 0) > 10 for r in rows), 'No colored comparison video found'
assert any(r.get('peakAudio', 1) < .0001 for r in rows), 'No zero-volume audio export found'
report = {'passed': True, 'checks': ['mono export is grayscale', 'comparison exports retain color', 'zero-volume export is silent'], 'outputs': rows}
(dest/'verification.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
print(json.dumps(report))
