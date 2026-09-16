from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import json,subprocess,textwrap
ROOT=Path(__file__).resolve().parents[1]; ff='/opt/homebrew/bin/ffmpeg'
work=ROOT/'.artifact-build/narration'; video=ROOT/'.artifact-build/video/lotlight-demo.webm'
scenes=json.loads((ROOT/'submission/NARRATION-SCENES.json').read_text())
def run(args):subprocess.run([ff,'-y','-hide_banner','-loglevel','error']+args,check=True)
parts=[];offset=0
for i,s in enumerate(scenes):
 wav=work/f'{i:02d}.wav';dur=float(subprocess.check_output(['/opt/homebrew/bin/ffprobe','-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',str(wav)]));s['finalStart']=offset;s['finalEnd']=offset+dur;offset+=dur
 out=work/f'video-{i:02d}.mp4';factor=dur/(s['end']-s['start'])
 run(['-ss',str(s['start']),'-t',str(s['end']-s['start']),'-i',str(video),'-an','-vf',f'setpts={factor}*(PTS-STARTPTS),fps=30,pad=1440:1120:0:0:color=0x263329','-t',str(dur),'-c:v','libx264','-crf','20','-preset','fast','-pix_fmt','yuv420p',str(out)])
 parts.append("file '"+str(out)+"'")
(work/'video-concat.txt').write_text('\n'.join(parts));run(['-f','concat','-safe','0','-i',str(work/'video-concat.txt'),'-c','copy',str(work/'picture.mp4')])
words=json.loads((work/'alignment.json').read_text())['words'];cues=[];group=[]
for w in words:
 w['word']=w['word'].replace('LotLight','Lotlight').replace('Manufacturing','manufacturer')
 if group and (len(' '.join(x['word'] for x in group))+len(w['word'])>74 or len(group)>=11):
  cues.append(group);group=[]
 group.append(w)
 if len(group)>=5 and w['word'].endswith(('.', '?','!')):cues.append(group);group=[]
if group:cues.append(group)
font=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf',32);small=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf',16)
def card(text,p):
 im=Image.new('RGB',(1440,120),'#263329');d=ImageDraw.Draw(im)
 for j,line in enumerate(textwrap.wrap(text,74)):
  d.text((720,10+j*39),line,font=font,fill='#ffffff',anchor='mt')
 d.text((720,102),'AI narration  |  Actual browser recording  |  Historical notice and synthetic stock',font=small,fill='#ddec8b',anchor='mm');im.save(p)
def ts(t):
 n=round(t*1000);return f'{n//3600000:02}:{n//60000%60:02}:{n//1000%60:02},{n%1000:03}'
subs=[];concat=['ffconcat version 1.0'];cursor=0;blank=work/'caption-blank.png';card('',blank)
for i,g in enumerate(cues):
 start=max(cursor,g[0]['start']);end=min(offset,g[-1]['end']);text=' '.join(x['word'] for x in g);p=work/f'caption-{i:03d}.png';card(text,p)
 if start>cursor:concat += [f"file '{blank}'",f'duration {start-cursor:.3f}']
 concat += [f"file '{p}'",f'duration {end-start:.3f}'];cursor=end
 subs.append(f'{i+1}\n{ts(start)} --> {ts(end)}\n'+textwrap.fill(text,74)+'\n')
if offset>cursor:concat += [f"file '{blank}'",f'duration {offset-cursor:.3f}']
concat.append(f"file '{blank}'");(work/'captions.ffconcat').write_text('\n'.join(concat));(ROOT/'submission/Lotlight-Captions.srt').write_text('\n'.join(subs))
run(['-i',str(work/'picture.mp4'),'-f','concat','-safe','0','-i',str(work/'captions.ffconcat'),'-i',str(ROOT/'submission/Lotlight-Narration.wav'),'-filter_complex','[0:v][1:v]overlay=0:1000:eof_action=repeat[v]','-map','[v]','-map','2:a','-c:v','libx264','-crf','19','-preset','fast','-c:a','aac','-b:a','192k','-t',str(offset),'-movflags','+faststart',str(ROOT/'submission/Lotlight-Demo-Captioned.mp4')])
(ROOT/'submission/NARRATION-SCENES.json').write_text(json.dumps(scenes,indent=2)+'\n');print('Finished captioned demo:',round(offset,2),'seconds;',len(cues),'caption cues')
