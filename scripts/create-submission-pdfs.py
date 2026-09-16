from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor, Color, white
from reportlab.lib.pagesizes import A4
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle
from pathlib import Path
from xml.sax.saxutils import escape
import textwrap
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'submission';OUT.mkdir(exist_ok=True)
W,H=A4
ink=HexColor('#263329');muted=HexColor('#65745b');lime=HexColor('#ddec8b');paper=HexColor('#f8f9f5');orange=HexColor('#b55c36')
def para(c,text,x,y,w,size=10,leading=15,color=ink,bold=False):
 s=ParagraphStyle('p',fontName='Helvetica-Bold' if bold else 'Helvetica',fontSize=size,leading=leading,textColor=color)
 p=Paragraph(text,s);_,h=p.wrap(w,H);p.drawOn(c,x,y-h);return y-h
c=canvas.Canvas(str(OUT/'Lotlight-One-Page.pdf'),pagesize=A4);c.setTitle('Lotlight | One-page project description');c.setAuthor('Shivam Gupta')
c.setFillColor(paper);c.rect(0,0,W,H,fill=1,stroke=0)
c.setFillColor(ink);c.setFont('Helvetica-Bold',9);c.drawString(42,H-42,'DSH HACKS V2  /  AI x HEALTHCARE');c.setFont('Helvetica',9);c.drawRightString(W-42,H-42,'Shivam Gupta')
c.setFont('Helvetica-Bold',45);c.drawString(40,H-105,'lotlight');c.setFillColor(lime);c.roundRect(W-117,H-109,75,45,10,fill=1,stroke=0);c.setFillColor(ink);c.setFont('Helvetica-Bold',9);c.drawCentredString(W-79.5,H-90,'NOTICE');c.drawCentredString(W-79.5,H-102,'TO RESPONSE')
y=para(c,'A notice is only the beginning.',42,H-127,W-84,23,28)
y=para(c,'Lotlight helps independent clinics reconcile a medical recall notice with spreadsheet inventory, resolve uncertain identifiers, and document a response someone owns.',42,y-14,W-84,11,16)
y-=20
c.setStrokeColor(HexColor('#dce2d4'));c.line(42,y,W-42,y)
y-=21
left=42;right=310;col=243
para(c,'THE PROBLEM',left,y,col,8.5,12,muted,True);para(c,'THE WORKING PRODUCT',right,y,col,8.5,12,muted,True)
y1=para(c,'A recall letter is not a completed stock check. Product names vary, lot fields are missing, and responsibility can get lost between a notice and a shelf.',left,y-22,col,10,15)
y2=para(c,'Import a notice and CSV. Compare each catalog/lot pair with source evidence. Confirm the source, assign an owner, record quantities handled, and export the audit.',right,y-22,col,10,15)
y=min(y1,y2)-22
c.setFillColor(HexColor('#edf2df'));c.roundRect(42,y-76,W-84,76,8,fill=1,stroke=0)
para(c,'A REAL NOTICE. A CLEARLY SYNTHETIC CLINIC.',56,y-13,W-112,8,11,muted,True)
para(c,'The demo uses two pairs from Baxter notice FA-2025-039 (29 Aug 2025). Eight fictional stock lines contain two exact matches, two incomplete records, and four lines outside the entered scope. No patient data or current recall status is implied.',56,y-32,W-112,9.5,14)
y-=101
para(c,'AI WITH A BOUNDARY',left,y,col,8.5,12,muted,True);para(c,'ENGINEERING THAT MATTERS',right,y,col,8.5,12,muted,True)
y1=para(c,'A pinned MiniLM model compares descriptions locally in a browser worker, without paid inference APIs. AI can surface aliases. Only deterministic identifier rules establish matches; a person confirms the source and response.',left,y-22,col,10,15)
y2=para(c,'Private sign-in and database persistence. Server-validated actions. Versioned source and inventory snapshots. Conflicting-save protection. Unknown identifiers cannot close; partial quantities stay open.',right,y-22,col,10,15)
y=min(y1,y2)-25
para(c,'COMMERCIAL HYPOTHESIS',left,y,W-84,8.5,12,muted,True)
y=para(c,'Start with independent clinics using spreadsheet stock records. Test <b>$149/site/month</b>: at an assumed $30/hour staff cost, five hours saved covers the fee. Existing enterprise competitors validate the category; clinic demand and savings still need a supervised pilot.',left,y-22,W-84,10,15)
y-=20
para(c,'VALIDATION & LIMITS',left,y,W-84,8.5,12,muted,True)
y=para(c,'Automated tests cover scope pairing, missing identifiers, workflow gates, import validation and version changes. Browser tests exercise sign-in, persistence, response completion and exports. This is a hackathon MVP, not clinically validated or approved for unsupervised clinical use. Shared team roles, OCR and complex recall scope remain future work.',left,y-20,W-84,9,13)
c.setStrokeColor(HexColor('#dce2d4'));c.line(42,88,W-42,88)
para(c,'CODE  <link href="https://github.com/shi1720/DSH-Hacks-V2" color="#455d37">github.com/shi1720/DSH-Hacks-V2</link>',42,75,W-84,8.5,12)
para(c,'SOURCES  Baxter FA-2025-039 (Medline-hosted manufacturer PDF); FDA, What is a Medical Device Recall? Full source links and limitations are in the repository.',42,57,W-84,7.5,10,muted)
para(c,'Project creator: Shivam Gupta. AI-assisted research, implementation, testing and presentation preparation.',42,30,W-84,7,9,muted)
c.save()
# Authored code listing; vendor libraries and lockfiles remain in the repository.
files=[]
for prefix in ['app','lib/lotlight','db','tests']:
 for p in (ROOT/prefix).rglob('*'):
  if p.suffix in ['.ts','.tsx','.css','.mjs'] and p.is_file():files.append(p)
for name in ['scripts/build-ai.mjs','scripts/evaluate-ai.mjs','scripts/create-submission-pdfs.py','playwright.config.ts','vite.config.ts','package.json','drizzle/0000_real_hellcat.sql']:
 p=ROOT/name
 if p.exists():files.append(p)
files += [p for p in (ROOT/'scripts').glob('*') if p.suffix in ['.mjs','.py']]
files += list((ROOT/'.github').rglob('*.yml'))
files=sorted(set(files))
c=canvas.Canvas(str(OUT/'Lotlight-Source-Code.pdf'),pagesize=A4);c.setTitle('Lotlight | Authored source listing');c.setAuthor('Shivam Gupta');page=0
def newpage(title):
 global page
 if page:c.showPage()
 page+=1;c.setFillColor(paper);c.rect(0,0,W,H,fill=1,stroke=0);c.setFillColor(ink);c.setFont('Helvetica-Bold',11);c.drawString(35,H-33,'LOTLIGHT / SOURCE RECORD');c.setFont('Helvetica',7);c.drawRightString(W-35,H-33,str(page));c.setFont('Helvetica-Bold',8);c.drawString(35,H-56,title[:105]);c.setFont('Helvetica',7);c.setFillColor(muted);c.drawString(35,24,'Shivam Gupta · DSH Hacks V2 · AI-assisted development · Dependencies and full history in GitHub');return H-77
y=newpage('Contents and provenance')
y=para(c,'This listing includes application code, matching/workflow logic, database schema, tests and authored build/evaluation scripts. Vendored UI primitives, build scaffolding and package lockfiles are available in the repository. The MIT license applies to original code; dependencies retain their own licenses.',35,y,W-70,10,15)-20
for p in files:
 if y<55:y=newpage('Contents (continued)')
 c.setFont('Helvetica',8);c.setFillColor(ink);c.drawString(35,y,str(p.relative_to(ROOT)));y-=13
for p in files:
 y=newpage(str(p.relative_to(ROOT)))
 for num,line in enumerate(p.read_text().splitlines(),1):
  line=line.expandtabs(2).encode('ascii','backslashreplace').decode('ascii')
  chunks=textwrap.wrap(line,width=108,replace_whitespace=False,drop_whitespace=False) or ['']
  for j,chunk in enumerate(chunks):
   if y<45:y=newpage(str(p.relative_to(ROOT))+' (continued)')
   c.setFillColor(muted if j else ink);c.setFont('Courier',7);c.drawString(35,y,(f'{num:4} ' if j==0 else '     ')+chunk);y-=9
c.save()
print('Created one-page description and authored source listing:',len(files),'files,',page,'code pages')
