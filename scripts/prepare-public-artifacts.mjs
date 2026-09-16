import {mkdir,copyFile} from 'node:fs/promises';
await mkdir('public/downloads',{recursive:true});
for(const file of ['Lotlight-Demo-Captioned.mp4','Lotlight-One-Page.pdf','Lotlight-Pitch.pdf','Lotlight-Source-Code.pdf','Lotlight-Captions.srt','TESTING-INSTRUCTIONS.md','DEVPOST-STORY.md']) {
  await copyFile('submission/'+file,'public/downloads/'+file);
}
await copyFile('docs/images/lotlight-cover.png','public/downloads/lotlight-cover.png');
console.log('Prepared public judge resources.');
