"""Render the existing film/play vector mark for mobile launchers."""
from pathlib import Path
import json
from PIL import Image, ImageDraw
root=Path(__file__).resolve().parents[1]
image=Image.new('RGB',(1024,1024),'#6750f5')
draw=ImageDraw.Draw(image)
draw.rounded_rectangle((256,244,768,780),radius=40,outline='white',width=36)
for x in (352,672): draw.line((x,260,x,768),fill='white',width=24)
for y in (332,472,612):
 for x in (276,700): draw.rectangle((x,y,x+48,y+52),fill='white')
draw.polygon([(424,392),(424,632),(604,512)],fill='white')
folder=root/'ios/Runner/Assets.xcassets/AppIcon.appiconset'
for entry in json.loads((folder/'Contents.json').read_text())['images']:
 if 'filename' not in entry: continue
 size=round(float(entry['size'].split('x')[0])*float(entry['scale'][:-1]))
 image.resize((size,size),Image.Resampling.LANCZOS).save(folder/entry['filename'])
