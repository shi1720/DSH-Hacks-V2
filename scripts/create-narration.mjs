import fs from 'node:fs/promises';
const scenes=JSON.parse(await fs.readFile('submission/NARRATION-SCENES.json','utf8'));
await fs.mkdir('.artifact-build/narration',{recursive:true});
for(let i=0;i<scenes.length;i++){
 const path=`.artifact-build/narration/${String(i).padStart(2,'0')}.mp3`;
 try{await fs.access(path);continue}catch{}
 const r=await fetch('https://api.openai.com/v1/audio/speech',{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:'gpt-4o-mini-tts',voice:'cedar',response_format:'mp3',instructions:'Narrate a concise product demonstration in clear, warm, conversational English. Calm and confident, with natural pauses and precise diction. About 145 words per minute. Do not add words or sounds. Pronounce Lotlight as lot light. This is a neutral narrator, not an imitation of any person.',input:scenes[i].text})});
 if(!r.ok)throw new Error(`Speech request failed (${r.status}): ${(await r.text()).slice(0,300)}`);
 await fs.writeFile(path,Buffer.from(await r.arrayBuffer()));console.log(`Narration ${i+1}/${scenes.length} saved`);
}
