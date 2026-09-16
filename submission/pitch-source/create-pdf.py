"""Create a PDF snapshot from the visually inspected, high-resolution PPTX renders."""
from pathlib import Path
from reportlab.pdfgen import canvas
from pypdf import PdfReader
import sys, os

root=Path(os.environ.get('PITCH_WORKSPACE', '.artifact-build/pitch'))
revision=sys.argv[1] if len(sys.argv)>1 else 'v1'
out=root/'output'/f'Lotlight-Pitch-{revision}.pdf'
c=canvas.Canvas(str(out),pagesize=(960,540))
c.setTitle('Lotlight — Recall response for small healthcare teams')
c.setAuthor('Shivam Gupta')
c.setSubject('DSH Hacks V2 hackathon pitch')
for number in range(1,8):
    c.drawImage(str(root/'build'/f'renders-{revision}'/f'slide-{number}.png'),0,0,960,540)
    c.showPage()
c.save()
assert len(PdfReader(out).pages)==7
print(out)
