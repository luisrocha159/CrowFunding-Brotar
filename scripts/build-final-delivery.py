"""Generate the four public final PDFs from repository sources. No credentials are read."""
import io
import json
import re
from pathlib import Path
from html import escape
from PIL import Image as PILImage
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, landscape
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer,
    PageBreak, NextPageTemplate, LongTable, TableStyle, Preformatted, Image, KeepTogether)

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'output/pdf'
OUT.mkdir(parents=True, exist_ok=True)
PLAN = json.loads((ROOT/'docs/planificacion-sprints.json').read_text(encoding='utf8'))
MATRIX = json.loads((ROOT/'docs/evidencias/s3-19/matriz-casos.json').read_text(encoding='utf8'))
FONT = Path('C:/Windows/Fonts')
for name, filename in [('Body','arial.ttf'),('BodyBold','arialbd.ttf'),('BodyItalic','ariali.ttf')]:
    pdfmetrics.registerFont(TTFont(name, str(FONT/filename)))
pdfmetrics.registerFontFamily('Body',normal='Body',bold='BodyBold',italic='BodyItalic',boldItalic='BodyBold')
styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name='Text',fontName='Body',fontSize=10.4,leading=15,spaceAfter=8,splitLongWords=True,allowWidows=0,allowOrphans=0))
styles.add(ParagraphStyle(name='SmallText',parent=styles['Text'],fontSize=9,leading=12,spaceAfter=5))
styles.add(ParagraphStyle(name='TitleFinal',fontName='BodyBold',fontSize=25,leading=31,spaceAfter=22,textColor=colors.black))
styles.add(ParagraphStyle(name='SectionFinal',fontName='BodyBold',fontSize=16,leading=21,spaceBefore=16,spaceAfter=9,keepWithNext=True))
styles.add(ParagraphStyle(name='SubFinal',fontName='BodyBold',fontSize=12,leading=16,spaceBefore=12,spaceAfter=6,keepWithNext=True))
styles.add(ParagraphStyle(name='CellFinal',fontName='Body',fontSize=9,leading=12,spaceAfter=0,splitLongWords=True))
styles.add(ParagraphStyle(name='CodeFinal',fontName='Courier',fontSize=9.2,leading=12.5,spaceAfter=10,textColor=colors.black))

def clean(s):
    return str(s).replace('\u2011','-').replace('\u2013','-').replace('\u2014','-').replace('\u00a0',' ')

def inline(s):
    s=escape(clean(s))
    s=re.sub(r'\[([^]]+)\]\(([^)]+)\)',lambda m:'<link href="'+(m[2] if re.match(r'^[a-z]+:',m[2]) else '../../'+m[2])+'" color="#125942">'+m[1]+'</link>',s)
    s=re.sub(r'\*\*([^*]+)\*\*',r'<b>\1</b>',s)
    s=re.sub(r'`([^`]+)`',lambda m:'<font name="Courier" size="9">'+m[1]+'</font>',s)
    return s

def paragraph(s, style='Text'):
    return Paragraph(inline(s),styles[style])

def table(rows, widths=None):
    data=[[Paragraph(inline(c),styles['CellFinal']) for c in row] for row in rows]
    t=LongTable(data,colWidths=widths,repeatRows=1,hAlign='LEFT')
    t.setStyle(TableStyle([('GRID',(0,0),(-1,-1),0.45,colors.HexColor('#D9D9D9')),
        ('BACKGROUND',(0,0),(-1,0),colors.HexColor('#E4E9E7')),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white,colors.HexColor('#F6F7F7')]),
        ('VALIGN',(0,0),(-1,-1),'MIDDLE'),('TOPPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),7),
        ('LEFTPADDING',(0,0),(-1,-1),7),('RIGHTPADDING',(0,0),(-1,-1),7)]))
    return t

def page(canvas, doc):
    width,height=canvas._pagesize
    canvas.saveState();canvas.setFont('Body',8);canvas.setFillColor(colors.HexColor('#45534C'))
    canvas.drawString(48,height-30,'BROTAR  |  Entrega DEV del MVP académico DEMO')
    canvas.drawString(48,26,'Corte 30/10/2026  |  DEV  |  Publicación autorizada')
    canvas.drawRightString(width-48,26,str(doc.page));canvas.restoreState()

def build(name, story):
    doc=BaseDocTemplate(str(OUT/name),pagesize=letter,leftMargin=48,rightMargin=48,topMargin=50,bottomMargin=48,
        title=name.replace('_',' ').removesuffix('.pdf'),author='Equipo Brotar - Ricardo, Alison y Santiago')
    doc.addPageTemplates([PageTemplate(id='portrait',frames=[Frame(48,48,516,694,leftPadding=0,rightPadding=0,topPadding=0,bottomPadding=0)],onPage=page),
        PageTemplate(id='landscape',pagesize=landscape(letter),frames=[Frame(48,48,696,514,leftPadding=0,rightPadding=0,topPadding=0,bottomPadding=0)],onPage=page)])
    doc.build(story)
    print(name)

def cover(title, intro):
    out=[Spacer(1,55),paragraph('BROTAR','SectionFinal'),paragraph(title,'TitleFinal'),paragraph(intro),Spacer(1,25)]
    for text in ['Proyecto de Sistemas II','Ricardo Núñez del Prado Justiniano','Santiago Rocha Mejia','Alison Pizarro Apaza',
        'Corte DEV 30 de octubre de 2026','Entrega S3-20 en DEV autorizada por Ricardo','Recorrido S3-21 aceptado por Ricardo para el alcance académico DEMO']:
        out.append(paragraph(text))
    out.extend([Spacer(1,20),paragraph('Pagos y expedientes de prueba. Condiciones provisionales del equipo. La contraseña Gmail se entrega en un paquete privado separado; no está en estos documentos.','SmallText'),PageBreak()])
    return out

def markdown(text):
    lines=text.splitlines();out=[];i=0
    while i<len(lines):
        line=lines[i].strip()
        if not line:i+=1;continue
        if line.startswith('```'):
            block=[];i+=1
            while i<len(lines) and not lines[i].strip().startswith('```'):block.append(lines[i]);i+=1
            # Copyable commands are preserved; fail rather than silently clip a long line.
            for b in block:
                if pdfmetrics.stringWidth(b,'Courier',9.2)>515:raise ValueError('Code line too wide: '+b)
            command=Preformatted('\n'.join(clean(b) for b in block),styles['CodeFinal'])
            group=[command]
            if out and isinstance(out[-1],Paragraph) and out[-1].getPlainText().rstrip().endswith(':'):
                group.insert(0,out.pop())
            out.append(KeepTogether(group));i+=1;continue
        if line.startswith('|'):
            rows=[]
            while i<len(lines) and lines[i].strip().startswith('|'):
                cells=[c.strip() for c in lines[i].strip().strip('|').split('|')]
                if not all(re.fullmatch(r'[: -]+',c or '-') for c in cells):rows.append(cells)
                i+=1
            widths={2:[175,341],3:[125,195,196]}.get(len(rows[0]))
            out.extend([table(rows,widths),Spacer(1,12)]);continue
        if line.startswith('# '):i+=1;continue
        if line.startswith('## '):
            if line.startswith('## 3. Primera instalación completa'):out.append(PageBreak())
            out.append(paragraph(line[3:],'SectionFinal'))
        elif line.startswith('### '):out.append(paragraph(line[4:],'SubFinal'))
        elif line.startswith('- '):out.append(paragraph('- '+line[2:]))
        else:
            item=paragraph(line)
            if line.endswith(':'):item.keepWithNext=True
            out.append(item)
        i+=1
    return out

def main():
    build('Manual_Instalacion_y_Correo_Brotar.pdf',cover('Manual de instalación y correo','Guía para instalar una copia propia, preparar PostgreSQL, iniciar frontend y backend e importar el correo autorizado sin copiar credenciales de base.')+markdown((ROOT/'README.md').read_text(encoding='utf8')))
    build('Documento_Explicativo_Final_Brotar.pdf',cover('Documento explicativo final del MVP','Descripción del sistema integrado, decisiones académicas, arquitectura, responsabilidades, reglas, validaciones y evidencia de funcionamiento.')+markdown((ROOT/'docs/explicativo-final-mvp.md').read_text(encoding='utf8')))
    out=cover('Product Backlog final de Brotar','Inventario de 64 historias de usuario y 67 tareas únicas. Mantiene criterios originales, responsables y relaciones; distingue implementación académica local, cierre técnico, publicación y revisión manual adicional.')
    out+=[paragraph('Cómo interpretar el estado','SectionFinal'),paragraph('La planificación JSON es la fuente canónica local. El campo state de las tarjetas conserva una instantánea histórica de Trello; no se presenta como sincronización actual. Las 36 tareas de Sprint 3 están cerradas en el alcance académico DEMO, incluida entrega S3-20 autorizada para DEV. La nueva ronda manual del equipo sobre 73 rutas permanece POR_PROBAR y no se atribuye aceptación a sus integrantes.'),
        paragraph('Los criterios originales pueden proponer capacidades comerciales o verificaciones más amplias. El ensayo adopta pagos/documentos sintéticos y condiciones provisionales propias, sin SMS ni proveedor real. La revisión técnica no es certificación WCAG o jurídica. Estos límites se aplican también cuando una historia figura integrada en el alcance académico.'),
        paragraph('Tareas y responsables','SectionFinal')]
    out[-1].keepWithNext=False
    rows=[['ID','Tarea e historias','Responsable','Estado local']]
    for task in PLAN['tasks']:
        state='Entrega autorizada DEV' if task['id']=='S3-20' else 'Cierre técnico DEMO'
        rows.append([task['id'],task['title']+'\n'+', '.join(task.get('stories',[])),task.get('owner','Equipo'),state])
    out.extend([table(rows,[52,288,76,100]),Spacer(1,16),paragraph('Historias y criterios originales','SectionFinal')])
    for story in PLAN['stories']:
        out.append(paragraph(story['id']+' '+story['title'],'SubFinal'))
        scope='Entrega S3-20 autorizada para DEV; ronda manual adicional pendiente' if story['id']=='BG-63' else 'Recorrido validado y aceptado por Ricardo' if story['id']=='BG-64' else 'Integrada en el alcance académico DEMO de las tareas relacionadas'
        meta=paragraph('Estado local: '+scope+'. Tareas: '+', '.join(story.get('tasks',[]))+'. Estado histórico conservado: '+story.get('state','Sin dato')+'.','SmallText')
        meta.keepWithNext=True
        out.append(meta)
        for criterion in story.get('criteria',[]):out.append(paragraph(criterion))
        text=' '.join(story.get('criteria',[])).lower();limits=[]
        if 'teléfon' in text or 'sms' in text:limits.append('El teléfono se valida; no se verifica por SMS.')
        if any(word in text for word in ['proveedor','pago','banc','desembolso','devoluci']):limits.append('La operación económica es DEMO, sin proveedor externo ni dinero real.')
        if any(word in text for word in ['legal','kyc','kyb','identidad']):limits.append('Documentos sintéticos y condiciones provisionales del equipo; no validación externa.')
        if 'wcag' in text or 'accesibilidad' in text:limits.append('Revisión técnica de interfaz, sin certificación WCAG.')
        if limits:out.append(paragraph('Límites aplicables: '+' '.join(limits),'SmallText'))
        out.append(paragraph(story.get('dependencies',''),'SmallText'));out.append(paragraph(story.get('source',''),'SmallText'))
    build('Product_Backlog_Final_Brotar.pdf',out)
    out=cover('Pantallas finales del MVP','Atlas de la interfaz implementada con 73 patrones de rutas y capturas representativas reales. Se mantiene separado del prototipo histórico y no se atribuye una captura única a cada ruta.')
    out.extend([paragraph('Referencia y procedencia','SectionFinal'),paragraph('Figma de coordinación: https://www.figma.com/design/uHGCxK6bJk3JKba65HzDFu/CrownFundingV3?node-id=12-2574. Se verificó acceso al nodo PÚBLICO Y REGISTRO; no se editó el archivo ni se afirma igualdad visual completa.'),
        paragraph('El inventario procede del router y la matriz S3-19 de 73 patrones/81 casos. Las imágenes seleccionadas proceden de S3-19, S3-26, S3-21 y acceso capturado durante S3-20. Conservan datos sintéticos; no prueban operaciones bancarias, identidad real o recepción nueva de correo.'),
        paragraph('Algunas capturas originales son páginas con desplazamiento: se muestra una vista superior identificada para conservar legibilidad. Los archivos originales completos permanecen en la ruta indicada. Los PDF anteriores de prototipo no se sustituyen ni se confunden con este atlas.'),
        paragraph('Inventario de rutas','SectionFinal')])
    out[-1].keepWithNext=False
    inventory=table([['N','Patrón de ruta']]+[[str(i+1),p] for i,p in enumerate(MATRIX['routerPatterns'])],[32,484])
    inventory.setStyle(TableStyle([('TOPPADDING',(0,0),(-1,-1),4),('BOTTOMPADDING',(0,0),(-1,-1),4)]))
    out.append(inventory)
    images=[
        ('Registro con correo primero','docs/evidencias/s3-20/registro-escritorio.webp'),
        ('Acceso y recuperación','docs/evidencias/s3-20/login-escritorio.webp'),
        ('Campaña pública cerrada','docs/evidencias/s3-21/campana-publica-movil.jpg'),
        ('Cierre del creador y obligaciones','docs/evidencias/s3-21/cierre-creador-escritorio.webp'),
        ('Cierre del creador en móvil','docs/evidencias/s3-21/cierre-creador-movil.jpg'),
        ('Desembolso completado del mismo caso','docs/evidencias/s3-21/desembolso-movil.jpg'),
        ('Revisión administrativa en móvil','docs/evidencias/s3-19/admin-movil.png'),
        ('Catálogos y parámetros','docs/evidencias/s3-19/catalogos-escritorio.png'),
        ('Desembolsos y recuperación de error','docs/evidencias/s3-19/finanzas-escritorio.png'),
        ('Error reintentable de desembolsos en móvil','docs/evidencias/s3-19/finanzas-movil.png'),
        ('Caso negativo porcentaje fuera de rango','docs/evidencias/s3-19/formulario-validaciones-movil.png'),
        ('Portada error y foco de teclado','docs/evidencias/s3-19/portada-foco-escritorio.png'),
        ('Rendición pública y estado vacío','docs/evidencias/s3-19/rendicion-publica-escritorio.png'),
        ('Disputa y soporte','docs/evidencias/s3-19/soporte-final-escritorio.png'),
        ('Confirmación de correo con transporte sintético','docs/evidencias/s3-26/confirmacion-escritorio.png')]
    for title,file in images:
        im=PILImage.open(ROOT/file).convert('RGB');w,h=im.size;wide=w>=900;crop_h=min(h,900 if wide else 1100)
        if crop_h<h:im=im.crop((0,0,w,crop_h))
        out.extend([NextPageTemplate('landscape' if wide else 'portrait'),PageBreak(),paragraph(title,'SectionFinal'),paragraph(file+' | '+('Vista superior; original completo en el repositorio.' if crop_h<h else 'Captura del viewport real.'),'SmallText')])
        iw,ih=im.size;maxw,maxh=(696,420) if wide else (516,590);scale=min(maxw/iw,maxh/ih)
        stream=io.BytesIO();im.save(stream,format='PNG');stream.seek(0);out.append(Image(stream,width=iw*scale,height=ih*scale,hAlign='CENTER'))
    build('Pantallas_Finales_MVP_Brotar.pdf',out)

if __name__=='__main__':main()
