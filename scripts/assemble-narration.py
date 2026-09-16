from pathlib import Path
import json,subprocess
ROOT=Path(__file__).resolve().parents[1]
ff='/opt/homebrew/bin/ffmpeg'
scenes=json.loads((ROOT/'submission/NARRATION-SCENES.json').read_text())
parts=[]
for i,s in enumerate(scenes):
 p=ROOT/f'.artifact-build/narration/{i:02d}.wav'
 subprocess.run([ff,'-y','-hide_banner','-loglevel','error','-i',str(ROOT/f'.artifact-build/narration/{i:02d}.mp3'),'-af','apad=pad_dur=0.5','-ar','48000','-ac','1',str(p)],check=True)
 parts.append("file '"+str(p)+"'")
lst=ROOT/'.artifact-build/narration/concat.txt';lst.write_text('\n'.join(parts))
subprocess.run([ff,'-y','-hide_banner','-loglevel','error','-f','concat','-safe','0','-i',str(lst),'-c:a','pcm_s16le',str(ROOT/'submission/Lotlight-Narration.wav')],check=True)
print('Assembled full narration')
