"""Manual de revisión desde Markdown. Usar Python del runtime de documentos."""
from pathlib import Path
import re
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'docs/revision-lideres'
doc=Document()
for border in list(doc.styles.element.iter(qn('w:pBdr'))):border.getparent().remove(border)
section=doc.sections[0]
section.page_width=Inches(8.5);section.page_height=Inches(11)
section.top_margin=Inches(.7);section.bottom_margin=Inches(.7)
section.left_margin=Inches(.7);section.right_margin=Inches(.7)
for name in ['Normal','Title','Heading 1','Heading 2','Subtitle']:
 s=doc.styles[name];s.font.name='Arial';s.font.color.rgb=RGBColor(0,0,0)
normal=doc.styles['Normal'];normal.font.size=Pt(11)
normal.paragraph_format.line_spacing=1.12;normal.paragraph_format.space_after=Pt(8)
normal.paragraph_format.widow_control=True
doc.styles['Title'].font.size=Pt(28);doc.styles['Title'].font.bold=True
doc.styles['Heading 1'].font.size=Pt(19)
doc.styles['Heading 1'].paragraph_format.space_after=Pt(13)
header=section.header.paragraphs[0];header.text='BROTAR    |    Manual de instalación y revisión'
header.runs[0].font.size=Pt(8)
footer=section.footer.paragraphs[0];footer.alignment=WD_ALIGN_PARAGRAPH.RIGHT
footer.add_run('Paquete de evaluación    |    ').font.size=Pt(8)
field=OxmlElement('w:fldSimple');field.set(qn('w:instr'),'PAGE');footer._p.append(field)
doc.core_properties.author='Ricardo Núñez del Prado Justiniano, Santiago Rocha Mejia y Alison Pizarro Apaza'
doc.core_properties.title='Manual de instalación y revisión de Brotar'
doc.core_properties.subject='DEV con datos sintéticos, credenciales y recorridos de validación'

def paragraph(text):
 p=doc.add_paragraph()
 if re.match(r'^\d+\. ',text):p.paragraph_format.left_indent=Inches(.17);p.paragraph_format.first_line_indent=Inches(-.17)
 for i,part in enumerate(re.split(r'\*\*(.*?)\*\*',text)):
  r=p.add_run(part);r.bold=bool(i%2)
 return p

def table(lines):
 rows=[[v.strip() for v in line.strip().strip('|').split('|')] for line in lines if not re.fullmatch(r'[| :\-]+',line)]
 t=doc.add_table(rows=0,cols=len(rows[0]));t.alignment=WD_TABLE_ALIGNMENT.CENTER;t.autofit=False
 widths=[2.35,2.05,2.7] if rows[0][0]=='Correo' else ([.84,3.25,3.01] if len(rows[0])==3 else [1.45,5.65])
 for j,width in enumerate(widths):t.columns[j].width=Inches(width)
 for i,values in enumerate(rows):
  cells=t.add_row().cells
  if i==0:
   repeat=OxmlElement('w:tblHeader');t.rows[-1]._tr.get_or_add_trPr().append(repeat)
  no_split=OxmlElement('w:cantSplit');t.rows[-1]._tr.get_or_add_trPr().append(no_split)
  for j,text in enumerate(values):
   cell=cells[j];cell.width=Inches(widths[j]);cell.vertical_alignment=WD_CELL_VERTICAL_ALIGNMENT.CENTER
   p=cell.paragraphs[0];p.paragraph_format.space_after=Pt(4);p.paragraph_format.space_before=Pt(4);p.paragraph_format.line_spacing=1.05
   r=p.add_run(text);r.font.size=Pt(9.5 if rows[0][0]=='Correo' else 10)
   r.bold=i==0;r.font.color.rgb=RGBColor(255,255,255) if i==0 else RGBColor(0,0,0)
   pr=cell._tc.get_or_add_tcPr()
   sh=OxmlElement('w:shd');sh.set(qn('w:fill'),'303B42' if i==0 else ('F3F5F6' if i%2==0 else 'FFFFFF'));pr.append(sh)
   borders=OxmlElement('w:tcBorders')
   for edge in ['top','left','bottom','right']:
    e=OxmlElement('w:'+edge);e.set(qn('w:val'),'single');e.set(qn('w:sz'),'4');e.set(qn('w:color'),'D9D9D9');borders.append(e)
   pr.append(borders)
   margins=OxmlElement('w:tcMar')
   for edge in ['top','left','bottom','right']:
    e=OxmlElement('w:'+edge);e.set(qn('w:w'),'75');e.set(qn('w:type'),'dxa');margins.append(e)
   pr.append(margins)
 doc.add_paragraph().paragraph_format.space_after=Pt(2)

pages=(OUT/'Manual_Revision_Brotar.md').read_text(encoding='utf8').split('<!-- page -->')
for n,page in enumerate(pages):
 if n:doc.add_page_break()
 lines=page.strip().splitlines();i=0;code=False
 while i<len(lines):
  line=lines[i].strip()
  if line.startswith('```'):code=not code;i+=1;continue
  if not line:i+=1;continue
  if code:
   p=doc.add_paragraph();p.paragraph_format.space_after=Pt(4)
   r=p.add_run(line);r.font.name='Consolas';r.font.size=Pt(9);i+=1;continue
  if line.startswith('|'):
   block=[]
   while i<len(lines) and lines[i].strip().startswith('|'):block.append(lines[i].strip());i+=1
   table(block);continue
  if line.startswith('# '):doc.add_paragraph(line[2:],'Title')
  elif line.startswith('## '):doc.add_heading(line[3:],1)
  else:paragraph(line)
  i+=1
path=OUT/'Manual_Revision_Brotar.docx';doc.save(path)
print(path)

# PDF independiente desde la misma fuente, para evitar diferencias de glifos del exportador de Office.
from html import escape
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
pdfmetrics.registerFont(TTFont('ManualArial','C:/Windows/Fonts/arial.ttf'))
pdfmetrics.registerFont(TTFont('ManualArialBold','C:/Windows/Fonts/arialbd.ttf'))
pdfmetrics.registerFontFamily('ManualArial',normal='ManualArial',bold='ManualArialBold')
body=ParagraphStyle('Body',fontName='ManualArial',fontSize=11,leading=14,spaceAfter=9)
title=ParagraphStyle('Title',parent=body,fontName='ManualArialBold',fontSize=25,leading=29,spaceAfter=18)
heading=ParagraphStyle('Heading',parent=body,fontName='ManualArialBold',fontSize=18,leading=22,spaceAfter=17)
small=ParagraphStyle('Cell',parent=body,fontSize=9.5,leading=12,spaceAfter=0)
code_style=ParagraphStyle('Code',parent=body,fontName='Courier',fontSize=8.8,leading=12,spaceAfter=7)
def markup(text):
 return re.sub(r'\*\*(.*?)\*\*',r'<b>\1</b>',escape(text))
story=[]
for n,page in enumerate(pages):
 if n:story.append(PageBreak())
 lines=page.strip().splitlines();i=0;in_code=False
 while i<len(lines):
  line=lines[i].strip()
  if line.startswith('```'):in_code=not in_code;i+=1;continue
  if not line:i+=1;continue
  if line.startswith('|'):
   rows=[]
   while i<len(lines) and lines[i].strip().startswith('|'):
    row=lines[i].strip();i+=1
    if not re.fullmatch(r'[| :\-]+',row):rows.append([v.strip() for v in row.strip('|').split('|')])
   widths=[169.2,147.6,194.4] if rows[0][0]=='Correo' else ([60.48,234,216.72] if len(rows[0])==3 else [104.4,406.8])
   data=[[Paragraph(('<b>'+markup(c)+'</b>') if j==0 else markup(c),small) for c in r] for j,r in enumerate(rows)]
   t=Table(data,colWidths=widths,repeatRows=1,hAlign='LEFT')
   t.setStyle(TableStyle([('GRID',(0,0),(-1,-1),.4,colors.HexColor('#D9D9D9')),('BACKGROUND',(0,0),(-1,0),colors.HexColor('#E4EAF0')),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white,colors.HexColor('#F3F5F6')]),('VALIGN',(0,0),(-1,-1),'MIDDLE'),('LEFTPADDING',(0,0),(-1,-1),6),('RIGHTPADDING',(0,0),(-1,-1),6),('TOPPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),7)]))
   story.extend([t,Spacer(1,14)]);continue
  if in_code:story.append(Paragraph(escape(line),code_style))
  elif line.startswith('# '):story.append(Paragraph(markup(line[2:]),title))
  elif line.startswith('## '):story.append(Paragraph(markup(line[3:]),heading))
  else:story.append(Paragraph(markup(line),body))
  i+=1
def decoration(canvas,document):
 canvas.setFont('ManualArial',8);canvas.setFillColor(colors.black)
 canvas.drawString(50.4,760,'BROTAR    |    Manual de instalación y revisión')
 canvas.drawRightString(561.6,30,'Paquete de evaluación    |    '+str(document.page))
pdf=SimpleDocTemplate(str(OUT/'Manual_Revision_Brotar.pdf'),pagesize=(612,792),rightMargin=50.4,leftMargin=50.4,topMargin=58,bottomMargin=49,title='Manual de instalación y revisión de Brotar',author=doc.core_properties.author)
pdf.build(story,onFirstPage=decoration,onLaterPages=decoration)
print(OUT/'Manual_Revision_Brotar.pdf')
