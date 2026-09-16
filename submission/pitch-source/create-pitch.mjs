import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {Presentation, PresentationFile} from '@oai/artifact-tool';

const workspaceDir=process.env.PITCH_WORKSPACE || '/tmp/lotlight-final-pitch';
const SKILL_DIR='/Users/shivamgupta/.codex/plugins/cache/openai-primary-runtime/presentations/26.905.11957/skills/presentations';
const RUNTIME_PYTHON='/Users/shivamgupta/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3';
const {resolvePresentationFont,finalizePresentation}=await import(pathToFileURL(path.join(SKILL_DIR,'container_tools/artifact_tool_utils.mjs')));
const font=resolvePresentationFont();
const p=Presentation.create({slideSize:{width:1280,height:720}});
const C={paper:'#F8F9F5',forest:'#263329',lime:'#DDEC8B',orange:'#B55C36',muted:'#66715F',white:'#FFFFFF'};
const source='https://www.medline.com/media/assets/pdf/vendor-list/FA-2025-039-Customer-Letter-Final-Combined.pdf';
const ecri='https://home.ecri.org/blogs/ecri-blog/enhancing-recall-management-the-power-of-ecri-and-workday-integration';
const screenshot=process.env.LOTLIGHT_SCREENSHOT || path.resolve('docs/images/workspace.png');
const revision=process.env.PITCH_REVISION || 'firebase-final-v2';
const textRecords=[];
function txt(s,text,x,y,w,h,size=24,color=C.forest,bold=false){
 const a=s.shapes.add({geometry:'textbox',position:{left:x,top:y,width:w,height:h},fill:'none',line:{fill:'none',width:0}});
 a.text=text; a.text.style={typeface:font,fontSize:size,color,bold,autoFit:'none'};
 textRecords.push({slide:p.slides.items.length,text,x,y,w,h,size,color,bold});
 return a;
}
function slide(n,dark=false){const s=p.slides.add();s.background.fill=dark?C.forest:C.paper;
 txt(s,'lotlight',64,28,180,30,22,dark?C.lime:C.forest,true);
 txt(s,String(n).padStart(2,'0'),1150,30,65,26,16,dark?'#ACB99E':C.muted);
 return s;}
function note(s,t){s.speakerNotes.textFrame.setText(t);}
function title(s,t,dark=false){txt(s,t,64,94,1135,114,48,dark?C.paper:C.forest,true);}

// 1. A specific, relatable operational problem. The scenario is explicitly fictional.
{
const s=slide(1,true);
txt(s,'A recall arrives.\nThe shelf still needs checking.',64,109,1138,172,64,C.paper,true);
txt(s,'Lotlight',64,324,650,95,82,C.lime,true);
txt(s,'Recall response for small healthcare teams',68,438,1060,44,30,C.paper);
txt(s,'Picture a clinic manager with a notice, a stock list and four storage locations.\nLotlight helps them document which products need attention and what staff did.',68,519,1080,75,24,'#D7DFD0');
txt(s,'Shivam Gupta   /   DSH Hacks V2',68,654,665,26,18,C.paper);
txt(s,'Fictional scenario',1010,654,200,26,16,'#ACB99E');
note(s,`I’m Shivam Gupta, and this is Lotlight. Picture a clinic manager who receives a medical device recall. Reading the notice is only the beginning. They still have to find the right product and lot across their shelves, resolve missing identifiers, and record what happened. Lotlight brings that work into one review. Our demonstration clinic and inventory are fictional. The historical manufacturer notice is real.\n\nSource: Baxter urgent medical device recall FA-2025-039, dated 29 August 2025, hosted by Medline: ${source}\nCreator: Shivam Gupta. AI-assisted research and development.`);
}
// 2. Large quantities carry the proof; screenshot shows actual working application.
{
const s=slide(2);title(s,'A real notice. A fictional clinic.');
txt(s,'36',65,231,310,95,88,C.orange,true);
txt(s,'units with exact identifier pairs',68,333,345,67,25);
txt(s,'14',65,423,300,89,80,C.forest,true);
txt(s,'units need more identifier evidence',68,520,345,72,25);
s.images.add({blob:new Uint8Array(await fs.readFile(screenshot)),contentType:'image/png',alt:'Lotlight working recall review application with synthetic Willow Clinic stock',fit:'contain',position:{left:440,top:214,width:774,height:402}});
txt(s,'Willow demo: 8 inventory lines, 218 units, 4 locations. Two selected catalog–lot pairs only.',68,650,1140,28,17,C.muted);
note(s,`The demo uses two catalog and lot pairs from Baxter’s 29 August 2025 notice. It is a training extract, not the full recall. In fictional Willow Clinic stock, two exact matches account for 36 units. Two other inventory lines account for 14 units and need more identifier evidence. Those rows stay visible for review. The full synthetic inventory contains eight lines and 218 units across four locations. These figures describe the fixture, not a measured real-world impact.\n\nManufacturer source: ${source}\nSelected pairs: 2C8632 / R25C31031 and 2R8858 / R25A13024. Product screenshot: implemented Lotlight application.`);
}
// 3. The boundary matters more than a model logo.
{
const s=slide(3);title(s,'AI helps find candidates. People approve.');
txt(s,'Semantic search',68,236,500,48,34,C.forest,true);
txt(s,'Local MiniLM suggests candidates when product names differ.\nNo API key required.',68,296,480,114,25);
txt(s,'Explicit matching rules',68,431,510,48,34,C.forest,true);
txt(s,'Manufacturer, catalog and the paired lot determine an identifier match.',68,492,478,85,25);
s.images.add({blob:new Uint8Array(await fs.readFile(path.resolve('docs/images/ai-review.png'))),contentType:'image/png',alt:'Lotlight AI review with semantic comparison complete, exact matches and unresolved identifiers',fit:'cover',crop:{left:0.185,top:0.29,right:0.025,bottom:0.353},position:{left:585,top:229,width:630,height:330}});
txt(s,'Similarity cannot authorize action.',602,565,610,38,21,C.orange,true);
txt(s,'A reviewer checks the source and approves the working scope before staff record a response.',68,619,1110,55,23,C.muted);
note(s,`The AI has a deliberately narrow job. A local MiniLM model compares product descriptions and suggests candidates when naming differs. Similarity never establishes that a product is affected. Deterministic matching checks manufacturer, catalog and the corresponding lot pair. It must not mix the catalog from one row with a lot from another. Missing identifiers remain unresolved. A person reviews the source and approves the scope before recording a response.\n\nImplementation basis: Lotlight source code and supplied implementation scope. Model family: MiniLM sentence embeddings. Availability and model download behavior depend on the user’s browser and network. No API key is required.`);
}
// 4. A live demo can follow these beats without inventing an integration.
{
const s=slide(4);title(s,'The review workflow');
const rows=[['01','Bring the evidence','Import CSV and notice text. Transcribe PDF tables into checked labeled lines.'],['02','Review the matches','Inspect exact pairs and unresolved identifiers. Approve the source scope.'],['03','Record the response','Name the responsible person. Account for the full quantity with evidence.'],['04','Keep the record','Save under a signed-in account. Export JSON, CSV or a printable audit.']];
rows.forEach((r,i)=>{const y=233+i*93;txt(s,r[0],65,y,78,52,36,C.orange,true);txt(s,r[1],161,y,1050,43,29,C.forest,true);txt(s,r[2],163,y+44,1030,40,22);});
txt(s,'Firebase Auth for sign-in. Cloud Run API with Firestore storage.\nImmutable source and inventory snapshots preserve each response’s inputs.',163,632,1025,57,19,C.muted);
note(s,`Here is the demo path. First, load the sample or bring a stock CSV and the text of a notice. Text-based PDF and TXT imports are supported, but the parser intentionally accepts supported labeled lines. Staff must transcribe PDF tables into labeled catalog and lot lines and check them against the original. Next, review exact pair evidence and unresolved identifiers, then approve the source scope. Record a staff response with the responsible person, a full quantity and evidence. Finally, sign in with Firebase Authentication to save the workspace and export the audit. Firebase Hosting serves the public app, Cloud Run serves the API, and Firestore stores the account workspace. Immutable source and inventory snapshots preserve the basis of each response. A correction to one inventory line retains other actions. This MVP does not offer shared team roles, live inventory integrations or automatic recall monitoring.\n\nSource: implemented Lotlight feature scope and completed browser workflow checks. PDF imports require extractable text. Scanned documents need a separate transcription step.`);
}
// 5. Commercial hypotheses are visible, not hidden in speaker notes.
{
const s=slide(5);title(s,'A small-clinic business hypothesis');
txt(s,'$149',64,223,465,117,102,C.forest,true);
txt(s,'per site / month',68,355,466,44,28);
txt(s,'Proposed price, not validated',68,410,460,40,22,C.orange,true);
txt(s,'5 hours × $30 = $150',615,228,600,59,40,C.forest,true);
txt(s,'Illustrative monthly staff time value.\nThe pilot must measure time saved and willingness to pay.',617,311,555,113,27);
txt(s,'Buyer: clinic operations manager',68,512,1090,40,28,C.forest,true);
txt(s,'ECRI already offers enterprise recall workflows and inventory matching.\nOur wedge to test: lightweight setup for clinics working from spreadsheets.',68,566,1120,86,25);
note(s,`Our initial buyer hypothesis is an operations manager at a small clinic. The proposed price is 149 dollars per site per month. If the workflow saved five staff hours at an assumed thirty dollars per hour, that would equal 150 dollars of staff time. Neither the savings nor the willingness to pay has been validated. ECRI already provides enterprise recall workflows and inventory matching. We are testing a narrower entry point: a lightweight setup for clinics that work from spreadsheets. We have no evidence that competitors cannot serve those clinics. A durable advantage would require trusted workflows, reliable import mappings and retained customers.\n\nCompetitive source: ECRI, Enhancing Recall Management: The Power of ECRI and Workday Integration, ${ecri}\nAll pricing, cost and time figures on this slide are explicit commercial assumptions. No current ECRI price comparison is asserted.`);
}
// 6. An honest evidence slide is more useful than unsupported outcome claims.
{
const s=slide(6);title(s,'What we tested');
txt(s,'36',65,218,480,107,92,C.forest,true);
txt(s,'automated unit tests pass',68,339,500,50,28,C.forest,true);
txt(s,'12 public Firebase browser tests pass across workflow, sign-in, persistence, exports and mobile use.',68,416,465,125,25);
txt(s,'12 synthetic descriptions',655,239,560,55,34,C.forest,true);
txt(s,'6 relevant examples in a toy set.\nSemantic top 6 retrieved 5 of them.\nLexical matching found 4.',658,316,550,123,27);
txt(s,'One plausible alias still missed.',658,468,540,43,24,C.orange,true);
txt(s,'Hand-authored examples, with a threshold tuned after inspection. No accuracy or clinical validation claim.',68,582,1113,83,26,C.orange);
note(s,`Thirty-six automated unit tests pass. Twelve public Firebase browser tests pass, covering the review workflow, sign-in and persistence, exports and mobile use, plus configuration failure recovery and deleted-account token denial. We also ran real local AI inference on twelve hand-authored synthetic descriptions, with six relevant examples. The top six semantic results contained five of the relevant examples. Lexical matching found four. With a threshold of 0.3 chosen after inspecting this tiny set, the system surfaced five relevant candidates and no negative examples. It still missed one plausible alias. This is a smoke test and demonstration, not a held-out benchmark or a statistical accuracy claim. There are no real users or clinical validation yet. The next step is a supervised drill with clinic staff.\n\nSource: completed Lotlight automated test and browser smoke results supplied by the implementation team. Accessibility certification is not claimed. Dataset size: 12 synthetic descriptions, 6 relevant. Threshold tuning used the same examples. The result does not establish performance on real inventory.`);
}
// 7. A focused ask and finish.
{
const s=slide(7,true);
txt(s,'The next proof belongs\nin a clinic.',64,105,1145,161,67,C.paper,true);
txt(s,'A supervised recall drill',68,334,1100,63,42,C.lime,true);
txt(s,'Recruit 3 pilot clinics. Compare review time and missed identifiers.\nAsk whether the evidence record is useful enough to pay for.',68,419,1090,110,29,C.paper);
txt(s,'lotlight-care.web.app',68,589,704,53,38,C.lime,true);
txt(s,'169-second AI-narrated demo with captions',68,650,700,28,20,'#D7DFD0');
txt(s,'Shivam Gupta\nAI-assisted research and development',807,602,410,58,20,'#D7DFD0');
note(s,`Lotlight is ready for its next honest test: a supervised recall drill with clinic staff. I want to recruit three pilot clinics, compare review time and missed identifiers with their existing process, and learn whether the evidence record is useful enough to pay for. The goal is simple: help a small healthcare team turn a notice into a documented response. Try the public app at https://lotlight-care.web.app. The submission includes a 169-second AI-narrated demonstration with captions. I’m Shivam Gupta. Thank you.\n\nThe pilot is proposed and no clinic recruitment is claimed. Creator: Shivam Gupta, with AI-assisted research and development. This is an operational decision-support MVP, not clinical decision software or a certified compliance system.`);
}

await fs.mkdir(path.join(workspaceDir,'build','renders-'+revision),{recursive:true});
const candidatePath=path.join(workspaceDir,'build','candidate-'+revision+'.pptx');
const finalPath=path.join(workspaceDir,'output','Lotlight-Pitch-'+revision+'.pptx');
await (await PresentationFile.exportPptx(p)).save(candidatePath);
await finalizePresentation({workspaceDir,candidatePath,finalPath,pythonExecutable:RUNTIME_PYTHON,
 integrityValidatorPath:path.join(SKILL_DIR,'container_tools/inspect_presentation_package_integrity.py'),
 layoutValidatorPath:path.join(SKILL_DIR,'container_tools/inspect_presentation_layout_geometry.py'),
 layoutArgs:['--expected-slide-size-emu','12192000,6858000','--validate-bullet-geometry','--validate-heading-fit'],
 explicitTotalSlideCount:7,requiredNativeTableOwnerSlides:[],requiredNativeChartOwnerSlides:[],
 fontPolicy:{basis:'design',families:[font]},verifyArtifactToolImport:true,
 receiptPath:path.join(workspaceDir,'build','validation-'+revision+'.json')});
for(let i=0;i<p.slides.items.length;i++){
 const slide=p.slides.items[i];
 const img=await p.export({slide,format:'png',scale:2});
 await fs.writeFile(path.join(workspaceDir,'build','renders-'+revision,`slide-${i+1}.png`),new Uint8Array(await img.arrayBuffer()));
}
await fs.writeFile(path.join(workspaceDir,'build','text-records-'+revision+'.json'),JSON.stringify(textRecords,null,2));
await fs.writeFile(path.join(workspaceDir,'build','metadata-'+revision+'.json'),JSON.stringify({font,finalPath,screenshot},null,2));
console.log(finalPath);
