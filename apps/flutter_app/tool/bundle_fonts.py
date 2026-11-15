"""Bundle OFL Google Fonts as explicit static weights for offline Flutter rendering.
Requires fonttools in the developer environment; no runtime Python dependency.
"""
from pathlib import Path
from urllib.request import urlopen
from io import BytesIO
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

output = Path(__file__).resolve().parents[1] / 'assets/fonts'
output.mkdir(parents=True, exist_ok=True)
families = [
    ('PlusJakartaSans', 'plusjakartasans', 'PlusJakartaSans%5Bwght%5D.ttf', [400, 500, 600, 700, 800]),
    ('Inter', 'inter', 'Inter%5Bopsz,wght%5D.ttf', [400, 500, 600, 700]),
]
for family, directory, filename, weights in families:
    base = f'https://raw.githubusercontent.com/google/fonts/main/ofl/{directory}/'
    data = urlopen(base + filename, timeout=30).read()
    (output / f'{family}-OFL.txt').write_bytes(urlopen(base + 'OFL.txt', timeout=30).read())
    for weight in weights:
        font = TTFont(BytesIO(data))
        axes = {'wght': weight}
        if any(axis.axisTag == 'opsz' for axis in font['fvar'].axes):
            axes['opsz'] = 14
        instance = instantiateVariableFont(font, axes, inplace=True)
        instance.save(output / f'{family}-{weight}.ttf')
    print(f'{family}: bundled {len(weights)} weights and license')
