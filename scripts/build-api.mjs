import {build} from 'esbuild';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
await mkdir('deploy-api',{recursive:true});
await build({entryPoints:['server/index.ts'],outfile:'deploy-api/index.mjs',bundle:true,platform:'node',target:'node22',format:'esm',packages:'external'});
const pkg=JSON.parse(await readFile('package.json','utf8'));
await writeFile('deploy-api/package.json',JSON.stringify({name:'lotlight-api',version:'1.0.0',type:'module',private:true,engines:{node:'22'},scripts:{start:'node index.mjs'},dependencies:Object.fromEntries(['express','firebase-admin','zod'].map(k=>[k,pkg.dependencies[k]])),overrides:{gaxios:pkg.overrides.gaxios}},null,2));
await writeFile('deploy-api/Dockerfile','FROM node:22-slim\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci --omit=dev\nCOPY index.mjs ./\nENV NODE_ENV=production\nUSER node\nCMD ["node", "index.mjs"]\n');
