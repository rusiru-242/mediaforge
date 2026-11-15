"""Reproducible Windows icon: the website's purple film/play brand mark."""
from pathlib import Path
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[1]
image = Image.new('RGBA', (256, 256))
draw = ImageDraw.Draw(image)
draw.ellipse((8, 8, 248, 248), fill='#6750f5')
draw.rounded_rectangle((64, 61, 192, 195), radius=10, outline='white', width=9)
draw.line((88, 65, 88, 192), fill='white', width=6)
draw.line((168, 65, 168, 192), fill='white', width=6)
for y in (83, 118, 153):
    draw.rectangle((69, y, 81, y + 13), fill='white')
    draw.rectangle((175, y, 187, y + 13), fill='white')
draw.polygon([(106, 98), (106, 158), (151, 128)], fill='white')
image.save(root / 'windows/runner/resources/app_icon.ico', sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
