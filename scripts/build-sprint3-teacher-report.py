"""Informe docente del equipo completo. Ejecutar con Python del runtime de documentos."""
from pathlib import Path
import json
import re
from docx import Document
from docx.shared import Cm, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs/entregables/sprint-3'
OUT.mkdir(parents=True, exist_ok=True)
PLAN = json.loads((ROOT/'docs/planificacion-sprints.json').read_text(encoding='utf8'))
TASKS = [t for t in PLAN['tasks'] if t['sprint'] == 3]
assert len(TASKS) == 36
assert {owner: sum(t['owner'] == owner for t in TASKS) for owner in ['Ricardo','Alison','Santiago']} == {'Ricardo':18,'Alison':9,'Santiago':9}
ROUTES = len(json.loads((ROOT/'docs/contratos-http-sprint3.json').read_text(encoding='utf8'))['routes'])
assert ROUTES == 219

EVIDENCE = {
 'S1-11':'Condiciones y aceptación versionada provisional.',
 'S1-12':'Recuperación por enlace y revocación de sesiones.',
 'S2-01':'Galería pública con orden y reemplazo.',
 'S2-06':'Expediente personal con documentos privados.',
 'S2-07':'KYB y representación con revisión vigente.',
 'S2-08':'Cola y decisiones independientes KYC y KYB.',
 'S2-09':'Observaciones, corrección y reenvío del expediente.',
 'S2-18':'Selección de apoyo y recompensa compatible.',
 'S2-19':'Resumen y confirmación antes del aporte.',
 'S2-20':'Interfaz de simulación y resultado del pago.',
 'S3-01':'Adaptador interno de pagos simulados.',
 'S3-02':'Importes, cupos, estados e idempotencia.',
 'S3-03':'Resumen privado del patrocinador y pendientes.',
 'S3-04':'Historial propio con filtros y paginación.',
 'S3-05':'Detalle y constancia de pago confirmado.',
 'S3-06':'Operaciones, filtros, totales y exportación.',
 'S3-07':'Diferencias y resolución de conciliación.',
 'S3-08':'Destino, autorización y resultado de desembolso.',
 'S3-09':'Devoluciones y control de saldo disponible.',
 'S3-10':'Incidencias y conversación con adjuntos privados.',
 'S3-11':'Investigación, escalamiento y resolución de disputas.',
 'S3-12':'Avances, correcciones y novedades publicadas.',
 'S3-13':'Rendición periódica y final con revisión.',
 'S3-14':'Personas, restricciones y organizaciones.',
 'S3-15':'Consulta de auditoría con filtros y permisos.',
 'S3-16':'Permisos por responsabilidad y por objeto.',
 'S3-17':'Catálogos y parámetros tipados autorizados.',
 'S3-18':'Contratos, migraciones y persistencia integrada.',
 'S3-19':'Revisión transversal de rutas y validaciones.',
 'S3-20':'Entrega base publicada y documentación del corte.',
 'S3-21':'Recorrido integral y aceptación del corte académico.',
 'S3-22':'Favoritos, seguimiento y novedades persistidas.',
 'S3-23':'Recaudación, ejecución, cancelación y cierre.',
 'S3-24':'Indicadores y acciones del creador por estado.',
 'S3-25':'Panel interno y alertas según responsabilidad.',
 'S3-26':'Verificación de correo y avisos operativos.'
}

doc=Document()
section=doc.sections[0]
section.page_width,section.page_height=Cm(21),Cm(29.7)
section.top_margin,section.bottom_margin=Cm(1.65),Cm(1.6)
section.left_margin=section.right_margin=Cm(1.9)
section.header_distance=section.footer_distance=Cm(.7)
for name in ['Normal','Title','Subtitle','Heading 1','Heading 2','Heading 3']:
 style=doc.styles[name];style.font.name='Calibri';style.font.color.rgb=RGBColor(0,0,0)
 ppr=style.element.get_or_add_pPr()
 for border in list(ppr.findall(qn('w:pBdr'))):ppr.remove(border)
normal=doc.styles['Normal'];normal.font.size=Pt(10.5)
normal.paragraph_format.line_spacing=1.08
normal.paragraph_format.space_after=Pt(6)
normal.paragraph_format.widow_control=True
doc.styles['Title'].font.size=Pt(27);doc.styles['Title'].font.bold=True
doc.styles['Title'].paragraph_format.space_after=Pt(13)
doc.styles['Subtitle'].font.size=Pt(12)
for name,size in [('Heading 1',18),('Heading 2',12),('Heading 3',10.7)]:
 doc.styles[name].font.size=Pt(size)
 doc.styles[name].paragraph_format.space_before=Pt(9)
 doc.styles[name].paragraph_format.space_after=Pt(6)
 doc.styles[name].paragraph_format.keep_with_next=True
for name in ['List Bullet','List Number']:
 doc.styles[name].font.name='Calibri';doc.styles[name].font.size=Pt(10.5)
 doc.styles[name].paragraph_format.space_after=Pt(4)
head=section.header.paragraphs[0];head.text='BROTAR    /    Proyecto de Sistemas II    /    Sprint 3'
for run in head.runs:run.font.size=Pt(8);run.font.color.rgb=RGBColor(0,0,0)
foot=section.footer.paragraphs[0];foot.alignment=WD_ALIGN_PARAGRAPH.RIGHT
foot.add_run('Equipo Ricardo Alison y Santiago    |    Página ').font.size=Pt(8)
field=OxmlElement('w:fldSimple');field.set(qn('w:instr'),'PAGE');foot._p.append(field)
doc.core_properties.author='Ricardo Núñez del Prado Justiniano, Santiago Rocha Mejia y Alison Pizarro Apaza'
doc.core_properties.title='Informe detallado del Sprint 3 de Brotar'
doc.core_properties.subject='Proyecto de Sistemas II Implementación y validación del equipo'
doc.core_properties.keywords='Brotar, Sprint 3, informe, integración, pruebas, equipo'

def p(text,bold=False,small=False):
 par=doc.add_paragraph();run=par.add_run(text);run.bold=bold
 if small:run.font.size=Pt(9)
 return par
def h(text,level=2):
 assert re.fullmatch(r'[\w\s]+',text,re.UNICODE),text
 return doc.add_heading(text,level)
def page(title):
 par=h(title,1);par.paragraph_format.page_break_before=True
def items(lines):
 for line in lines:doc.add_paragraph(line,style='List Bullet')
def steps(lines):
 for i,line in enumerate(lines,1):p(f'{i}. {line}')
def source(text):p('Evidencia y fuentes: '+text,small=True)
def table(headers,rows,widths,font=9):
 t=doc.add_table(rows=1,cols=len(headers));t.alignment=WD_TABLE_ALIGNMENT.CENTER;t.autofit=False
 for col,width in zip(t.columns,widths):col.width=Cm(width)
 for cell,value in zip(t.rows[0].cells,headers):cell.text=str(value)
 for row in rows:
  for cell,value in zip(t.add_row().cells,row):cell.text=str(value)
 for index,row in enumerate(t.rows):
  trpr=row._tr.get_or_add_trPr();trpr.append(OxmlElement('w:cantSplit'))
  if index==0:trpr.append(OxmlElement('w:tblHeader'))
  for cell,width in zip(row.cells,widths):
   cell.width=Cm(width);cell.vertical_alignment=WD_CELL_VERTICAL_ALIGNMENT.CENTER
   tcpr=cell._tc.get_or_add_tcPr()
   shade=OxmlElement('w:shd');shade.set(qn('w:fill'),'E7E7E7' if index==0 else ('F6F6F6' if index%2==0 else 'FFFFFF'));tcpr.append(shade)
   margins=OxmlElement('w:tcMar')
   for side in ['top','bottom','left','right']:
    v=OxmlElement('w:'+side);v.set(qn('w:w'),'65');v.set(qn('w:type'),'dxa');margins.append(v)
   tcpr.append(margins)
   for par in cell.paragraphs:
    par.paragraph_format.space_after=Pt(1);par.paragraph_format.line_spacing=1.0
    for run in par.runs:run.font.size=Pt(font);run.bold=index==0;run.font.color.rgb=RGBColor(0,0,0)
 return t

# Página 1
p('BROTAR',bold=True)
doc.add_paragraph('Informe detallado del Sprint 3',style='Title')
doc.add_paragraph('Implementación integrada del equipo y evidencias de validación',style='Subtitle')
p('Proyecto de Sistemas II',bold=True)
p('Equipo de trabajo: Ricardo, Alison y Santiago')
h('Estudiantes')
for name in ['Ricardo Núñez del Prado Justiniano','Santiago Rocha Mejia','Alison Pizarro Apaza']:p(name)
h('Datos de la entrega')
p('Destinatario: docente de Proyecto de Sistemas II')
p('Fecha del informe: 9 de noviembre de 2026')
p('Corte de trabajo: rama RicardoDev, base 4579e52 y ajustes locales posteriores documentados.')
p('La entrega base del Sprint 3 fue publicada en DEV el 30 de octubre. Este informe incluye las mejoras locales del 9 de noviembre, que no se presentan como un nuevo commit publicado.')
h('Propósito del informe')
p('Presentamos el incremento construido entre los tres integrantes para completar el recorrido de campañas, aportes, operación interna, ejecución y cierre. El informe relaciona las tareas asignadas con su implementación, explica las decisiones técnicas y describe cómo demostrar el resultado al docente.')
p('El resultado es un MVP académico integrado con persistencia real en PostgreSQL y correo Gmail configurable. Los pagos y movimientos financieros son simulados; las condiciones de participación y verificación son provisionales del equipo. Estas decisiones delimitan la demostración y no representan autorización comercial, bancaria o jurídica.')
p('La documentación distingue la asignación original, la integración conjunta, los resultados de pruebas y las condiciones todavía necesarias para operar fuera del entorno académico.',small=True)

# Página 2
page('1 Objetivos y arquitectura del incremento')
h('Objetivo general')
p('Completar una versión funcional que permita apoyar una campaña y seguir lo que sucede después del aporte: confirmación, conciliación, posibles devoluciones, ejecución, rendición y cierre. El trabajo amplía el registro y acceso del Sprint 1 y el módulo de campañas del Sprint 2, conservando sus datos y controles.')
h('Objetivos específicos')
items(['Separar responsabilidades de revisión, identidad, finanzas, soporte, administración y auditoría.',
 'Mantener referencias, estados e historial verificables en cada operación.',
 'Integrar los paneles del patrocinador, creador y personal interno con información persistida.',
 'Validar entradas y reglas cruzadas en la interfaz y nuevamente en el servidor.',
 'Documentar instalación, operación, pruebas y límites del alcance académico.'])
h('Arquitectura aplicada')
table(['Capa','Responsabilidad concreta'],[
 ('React y Vite','Formularios, navegación, validación inmediata y estados de carga, error y confirmación. Vite reenvía /api al backend.'),
 ('API NestJS','Controladores y DTO, sesión, protección de origen, permisos, casos de uso y repositorios.'),
 ('PostgreSQL en Docker','Usuarios, campañas, relaciones, operaciones y eventos. Restricciones y transacciones preservan la consistencia.'),
 ('Almacén de archivos','Binarios separados del frontend público y metadatos en la base. Descarga privada según cuenta y expediente.'),
 ('Canal de correo','Mensajes operativos y enlaces temporales mediante SMTP configurado fuera de Git; avisos opcionales según preferencia.')],[4,13.2],9.4)
p('Docker ejecuta PostgreSQL, no el frontend ni NestJS. El contenedor escucha en 5432 y se publica en 127.0.0.1:15433; la API usa 3000 y la interfaz 5173. El puerto 5432 del equipo no se presupone como la base correcta.')
h('Organización del alcance')
p('La planificación conserva 64 historias y 67 tareas únicas del proyecto. Al Sprint 3 corresponden 36 tareas: Ricardo 18, Santiago 9 y Alison 9. Diez mantienen un identificador S1 o S2 por ser arrastres; no se cuentan otra vez como historias nuevas.')
source('[F1] Guía general del MVP. [F2] Planificación local y reparto del Sprint 3. [F3] README y contratos HTTP.')

# Página 3
page('2 Trazabilidad de las tareas de Ricardo')
p('La tabla conserva la asignación del backlog. Resume el resultado integrado y permite localizar el alcance durante la exposición; no atribuye a una sola persona todas las líneas de código posteriores a las integraciones.')
ricardo=[t for t in TASKS if t['owner']=='Ricardo']
table(['Tarea','Alcance asignado','Resultado incorporado'],[(t['id'],t['title'],EVIDENCE[t['id']]) for t in ricardo],[1.6,7.2,8.4],9)
h('Estado de estas tareas en el corte')
p('Los alcances funcionales están incorporados para el MVP académico. S3-01 utiliza un adaptador de simulación autorizado por el equipo; no se declara una integración con un banco. S3-20 tiene una entrega base publicada y las mejoras locales de este informe aún pendientes de publicación. S3-21 conserva la aceptación expresa del corte del 29 de octubre, sin atribuir una aceptación nueva al cliente o docente.')
source('[F2] 18 tareas asignadas a Ricardo. [F4] Entrega DEV y aceptación S3-21. Las secciones 4 a 10 explican funcionamiento y evidencia.')

# Página 4
page('3 Trazabilidad de Santiago y Alison')
h('Tareas asignadas a Santiago')
table(['Tarea','Alcance asignado','Resultado incorporado'],[(t['id'],t['title'],EVIDENCE[t['id']]) for t in TASKS if t['owner']=='Santiago'],[1.6,7.2,8.4],9)
h('Tareas asignadas a Alison')
table(['Tarea','Alcance asignado','Resultado incorporado'],[(t['id'],t['title'],EVIDENCE[t['id']]) for t in TASKS if t['owner']=='Alison'],[1.6,7.2,8.4],9)
p('La integración conjunta conecta la selección de Alison con el checkout y los estados financieros; la captura documental y la ejecución de Santiago con la revisión, los permisos y el cierre; y los módulos transversales de Ricardo con los tres paneles. El reparto identifica responsables originales, mientras que las correcciones posteriores forman parte del trabajo integrado del equipo.',small=True)
p('S1-11 y S2-06/S2-07 se consideran implementadas bajo condiciones provisionales propias. Su cierre técnico no equivale a recibir textos legales definitivos ni aprobación documental comercial.',small=True)
source('[F2] 9 tareas de Santiago y 9 de Alison. [F5] Integraciones y decisiones internas del MVP.')

# Página 5
page('4 Identidad contactos y control de acceso')
h('Identidad y organizaciones')
p('El participante crea un expediente KYC o KYB con los campos y documentos exigidos por una política activa de PostgreSQL. Guardar, enviar, revisar y aprobar son acciones diferentes. Las observaciones permiten corregir y reenviar sin sobrescribir el historial; una versión antigua no puede reemplazar una revisión nueva.')
p('Los miembros y representantes institucionales tienen vínculos y vigencias propios. Una invitación pendiente no concede acceso. Los cambios sensibles de representación requieren el procedimiento correspondiente y no convierten automáticamente al integrante en administrador de la plataforma.')
h('Responsabilidades internas verificadas en el código')
table(['Rol','Puede realizar','Separación relevante'],[
 ('REVIEWER','Decidir campañas y revisar la rendición final.','No ejecuta el cierre definitivo ni operaciones de FINANCE.'),
 ('COMPLIANCE','Consultar y decidir expedientes KYC y KYB.','No publica campañas ni acredita por sí solo un pago.'),
 ('FINANCE','Conciliar y operar devoluciones y desembolsos.','Una solicitud o autorización no equivale a completar el movimiento.'),
 ('SUPPORT','Responder incidencias e investigar disputas.','Recomendar una devolución no mueve fondos.'),
 ('ADMIN','Administrar permisos, publicar y decidir el ciclo.','No hereda automáticamente finance.operate ni support.resolve.'),
 ('AUDITOR','Consultar las áreas autorizadas.','Mantiene solo lectura incluso si acumula otros roles.')],[3.1,7.0,7.1],9.1)
h('Correo consentimiento y sesión')
p('La aceptación guarda versión, actor, fecha y referencia del contenido. Consultar un documento no sustituye la aceptación registrada. El envío de identidad requiere las confirmaciones aplicables; aceptarlas no concede roles ni aprueba el expediente. Las condiciones siguen siendo provisionales del equipo.')
p('La recuperación utiliza enlaces temporales de un uso y revoca sesiones después del cambio de contraseña. La verificación de correo acredita acceso a esa dirección; no sustituye KYC, KYB ni SMS. Los avisos opcionales requieren preferencia habilitada y dirección verificada. La contraseña de aplicación de Gmail permanece fuera de este informe y del repositorio.')
p('El backend aplica sesión con cookie HttpOnly, comprobación de origen, permisos y pertenencia. La contraseña se almacena mediante hash; las credenciales y documentos no se copian a la auditoría. Los permisos se revalidan al ejecutar operaciones sensibles.')
source('[F5] ADR de responsabilidades, identidad y condiciones. Código: roles/domain/access-policy.ts y módulos auth, contacts, legal y verifications.')

# Página 6
page('5 Apoyos checkout y pagos simulados')
h('Recorrido del patrocinador')
steps(['Consultar una campaña publicada y elegir el apoyo compatible con su modalidad.',
 'Seleccionar una recompensa cuando corresponda, revisar su mínimo y disponibilidad, o usar apoyo sin recompensa si está permitido.',
 'Revisar el resumen del checkout y confirmar los datos y condiciones aplicables.',
 'Crear el intento y consultar su resultado. El servidor valida importe, campaña, selección y estado antes de confirmarlo.',
 'Consultar Mis aportes y la constancia informativa del pago confirmado.'])
h('Estados y efecto en la recaudación')
table(['Situación','Comportamiento del sistema'],[
 ('Iniciado o pendiente','El intento tiene referencia y vigencia, pero todavía no aumenta la recaudación confirmada.'),
 ('Confirmado','La confirmación válida se registra una sola vez y se refleja en la operación y el historial.'),
 ('Fallido o expirado','No suma como ingreso confirmado; el nuevo intento conserva la trazabilidad sin duplicar la confirmación.'),
 ('Evento repetido o tardío','Se contrasta con la operación registrada; no se confirma otra vez ni se reabre ciegamente un pago.'),
 ('Devolución o disputa','Se conserva la relación con el pago y se separan importe confirmado, devuelto y reservado.')],[4.2,13],9.4)
h('Qué significa el QR en esta versión')
p('La interfaz dispone de un QR escaneable para identificar el aporte del flujo simulado. Su contenido no es una orden bancaria ni permite cobrar dinero real. El ensayo de selección aislado tampoco constituye por sí mismo un aporte: la operación económica demostrable se crea en el checkout integrado y exige una confirmación registrada.')
p('Los importes se validan con precisión monetaria y se contrastan contra los datos persistidos. El cliente no decide el propietario, el rol ni el resultado financiero. Una misma clave de reintento no puede representar otro importe, otra recompensa o contenido distinto.')
h('Demostración esperada')
p('Usar una cuenta aportante, confirmar un apoyo simulado y recargar Mis aportes. Repetir la solicitud con la misma clave no debe crear otro ingreso. Un importe incompatible con la recompensa, una campaña fuera de su período o el acceso a un aporte ajeno debe rechazarse sin modificar saldos.')
source('[F1] Estados y reglas financieras generales. [F5] Adaptación académica. Código: contributions, demo-payments y clientes de checkout.')

# Página 7
page('6 Finanzas conciliación y devoluciones')
h('Operaciones y conciliación')
p('FINANCE consulta operaciones por estado, referencia, campaña y moneda. La conciliación contrasta los registros internos del simulador con los pagos de la aplicación e identifica pendientes, diferencias o eventos que requieren revisión. Los resultados se documentan; resolver una diferencia no debe inventar un ingreso confirmado.')
h('Desembolsos con separación de etapas')
p('El titular propone un destino del entorno académico y solicita el desembolso permitido. FINANCE revisa su vigencia, moneda y fondos disponibles, autoriza y registra el procesamiento y resultado. El control de versión, las reservas y las referencias impiden comprometer dos veces el mismo saldo. Una autorización no se muestra como desembolso completado.')
h('Devoluciones parciales y automáticas')
p('El aportante puede solicitar una devolución total disponible o una parcial, indicando causa, explicación y evidencias privadas opcionales. El importe se contrasta contra el pago propio confirmado, devoluciones previas y compromisos vigentes. El historial distingue solicitud, autorización y resultado, con observaciones comprensibles.')
p('La cancelación confirmada y el resultado que exige devolución generan la devolución del remanente permitido. El procesamiento utiliza bloqueos e idempotencia y conserva las solicitudes existentes; no devuelve otra vez lo ya reembolsado. Los casos históricos admiten la acción administrativa de recuperación correspondiente, sin convertir una solicitud de cancelación en devolución ejecutada.')
h('Ejemplo de saldo controlado')
table(['Concepto','Ejemplo en BOB'],[
 ('Pago confirmado original','100,00'),('Devolución ya completada','30,00'),('Otra devolución vigente reservada','10,00'),('Resto potencial antes de otras obligaciones','60,00')],[12.5,4.7],9.7)
p('El servidor comprueba además disputas y compromisos de la campaña. Por eso la pantalla diferencia pago original de importe actualmente disponible. Rechazar o fallar una devolución libera su reserva según las reglas; no se presenta como dinero devuelto.')
h('Trazabilidad y presentación')
p('Las tarjetas separan importes, estado, causa, fechas y responsable. Nombre y correo identifican al solicitante y operadores en las vistas autorizadas; los UUID quedan como referencias técnicas. Los archivos de evidencia son privados y una evidencia vinculada no puede borrarse desde la API de archivos.')
source('[F6] Ajustes de devoluciones automáticas y evidencias. Código: finance, refunds, disbursements y campaign-lifecycle.')

# Página 8
page('7 Incidencias disputas y paneles del equipo')
h('Soporte compartido con evidencias')
p('El patrocinador registra una incidencia desde el aporte o contexto correspondiente. Obtiene una referencia y puede seguirla en Mis incidencias. El personal SUPPORT consulta la bandeja, asigna responsabilidad, responde y actualiza estados con motivo e historial. Las incidencias generales y las disputas financieras conservan flujos diferentes.')
p('La mejora del 9 de noviembre permite adjuntar archivos tanto en Responder al titular como en Responder a soporte. Cada respuesta admite hasta diez PDF, PNG, JPG o WebP de 5 MiB por archivo. El texto es obligatorio; el archivo seleccionado puede retirarse antes del envío. Los adjuntos aparecen junto a su mensaje y no como una lista sin contexto.')
p('La descarga exige propiedad del expediente o permiso del personal. El servidor comprueba propietario, propósito, tipo, tamaño y estado del archivo; la carga aplica firma básica del contenido. Los mensajes internos no se comparten. Una transacción guarda mensaje, vínculos y clave de reintento: el fallo revierte el conjunto y el reintento no duplica el mensaje ni su aviso.')
h('Apertura y atención de una disputa')
steps(['El aportante registra una incidencia y, en su detalle, elige Abrir disputa del pago de este aporte.',
 'Selecciona el pago confirmado elegible y explica el problema; el caso aparece en Administración → Disputas.',
 'SUPPORT asume el expediente, pide información, escala o resuelve con motivo y versión.',
 'Si corresponde recomendar devolución, FINANCE debe ejecutar su propio procedimiento. La resolución de soporte no produce automáticamente ese movimiento.'])
h('Paneles con información real')
table(['Panel','Información disponible'],[
 ('Patrocinador','Aportes, pagos por moneda, guardados y seguimiento; incidencias abiertas, disputas y devoluciones. Enlace Mis incidencias y tarjeta Casos y devoluciones.'),
 ('Creador','Campañas propias, estados, pendientes y accesos a planificación, avances, rendición y obligaciones.'),
 ('Administración','Indicadores y alertas limitados por responsabilidad; accesos a revisión, identidad, finanzas, soporte y auditoría.')],[3.6,13.6],9.3)
p('Se comprobó con una sesión de patrocinador que los enlaces a incidencias y su contador aparecen en el panel. El correo operativo avisa según preferencia y dirección verificada, sin adjuntar documentos ni copiar conversaciones privadas.')
source('[F6] Respuestas con adjuntos. Código: support-cases, disputes y ContributionPages. Las notas internas no son evidencia pública.')

# Página 9
page('8 Ejecución rendición y cierre de campaña')
h('Avances y rendición de cuentas')
p('Durante la ejecución, el creador registra resultados de actividades, hitos e indicadores, con fechas y evidencias. Las novedades publicadas pueden corregirse mediante una versión sucesora que conserva el original y su referencia. La revisión no borra la historia de lo declarado.')
p('La rendición registra gastos por categorías y partidas, fecha real, importe y documentos privados. Se revisan períodos mensuales terminados según el calendario de Bolivia y se conserva el significado de los períodos históricos. El informe final acumula lo aprobado sin duplicar los gastos y explica variaciones. Un resumen público requiere aprobación y autorización específica y no expone documentos o destinos privados.')
h('Orden correcto para cerrar')
table(['Etapa','Responsable','Condición verificable'],[
 ('Preparar','Creador','Completar actividades e hitos, recompensas exigibles y rendición final con evidencias.'),
 ('Revisar el informe','REVIEWER o ADMIN','Aprobar o solicitar cambios con revisión independiente y versión vigente.'),
 ('Resolver obligaciones','FINANCE y SUPPORT según el caso','Atender desembolsos, devoluciones, conciliaciones, disputas e incidencias pendientes.'),
 ('Cerrar el ciclo','Solo ADMIN','En Ciclo de campañas, ejecutar Cerrar campaña cuando no queden bloqueos.')],[3.2,4.2,9.8],9.5)
p('Preparar cierre de campaña es una vista de requisitos y revisión; no es el botón de cierre definitivo. El enlace Ver bloqueos y decidir el ciclo conduce a Administración → Ciclo de campañas. Allí la opción Cerrar campaña se habilita al satisfacer las condiciones y confirmar la operación con el permiso correspondiente.')
h('Bloqueos que se mantienen de forma intencional')
items(['Actividades o hitos incompletos, recompensas sin cumplir o rendición final ausente, observada o desactualizada.',
 'Fondos sin desembolsar o devolver, compromisos pendientes, reservas, diferencias de conciliación o casos abiertos.',
 'Cancelación en trámite, revisión propia o permisos insuficientes.'])
p('Una campaña con 600 BOB confirmados y 0 desembolsados no debe aparentar que ya ejecutó esos fondos. La vista separa confirmado, devuelto, desembolsado y pendiente de desembolso. El cierre es terminal y conserva su historial; no se fuerza para completar una demostración.')
source('[F5] ADR de ejecución y rendición. Código: campaign-cycle.ts, campaign-closure.ts y roles/domain/access-policy.ts.')

# Página 10
page('9 Validaciones y criterios de programación')
h('Validación en capas')
p('La interfaz ayuda a corregir antes del envío, los DTO rechazan tipos y campos no admitidos, el dominio aplica reglas de negocio y la base respalda la integridad. Ocultar un botón no sustituye autorización del servidor. La fecha se evalúa según el campo: la planificación exige un período coherente, mientras que un gasto real puede ser pasado dentro de su período y no futuro.')
table(['Regla','Aplicación en el incremento'],[
 ('Texto y catálogos','Obligatoriedad, espacios, mínimos y máximos, Unicode válido y opciones activas; rechazo de controles o etiquetas no permitidas.'),
 ('Números y fechas','Precisión monetaria, enteros en cupos, porcentajes válidos, fechas ordenadas y consistencia del período.'),
 ('Archivos','Propósito y propietario, privacidad, firma básica, MIME, tamaño y relación con el caso; sin descarga por conocer solo una UUID.'),
 ('Estados y concurrencia','expectedVersion o ronda vigente, transacciones, bloqueos y claves de reintento. Un mismo intento no genera dos movimientos.'),
 ('Identidad y publicación','Aprobación editorial distinta de publicación. Falta de identidad vigente produce un motivo explícito y mantiene la campaña privada.')],[4.2,13],9.2)
h('Principios aplicados donde aportan claridad')
table(['Principio o patrón','Uso observable y beneficio'],[
 ('SRP y separación de capas','Controlador HTTP, caso de uso y repositorio tienen responsabilidades distintas; el transporte no concentra reglas y SQL.'),
 ('DIP e inyección','Casos de uso consumen contratos de repositorio; NestJS conecta implementaciones y las pruebas usan dobles controlados.'),
 ('DRY','Permisos centrales, transporte requestApi y formulario SupportReplyForm compartido entre titular y personal.'),
 ('KISS y YAGNI','Monolito modular, catálogo persistido y adaptación de pruebas explícita; se evita introducir una pasarela o logística no autorizada.'),
 ('Repositorio y adaptador','Persistencia mediante repositorios y transporte de correo separado. Se sustituyen transportes en pruebas sin sustituir PostgreSQL.'),
 ('Transacción e idempotencia','Mensaje, adjuntos y evento guardados atómicamente; un reintento devuelve el resultado previo y detecta contenido diferente.')],[4.2,13],9.2)
p('No se afirma aplicar todos los principios SOLID a cada archivo. Se conserva lo que ya cumple y se extrae una responsabilidad compartida cuando reduce duplicación o facilita una prueba significativa. La auditoría y los controles se amplían al incorporar nuevas operaciones.')
source('Código: support-cases/application, support-case.repository.ts, SupportReplyForm.tsx, shared/api/request.ts y roles/domain/access-policy.ts.')

# Página 11
page('10 Pruebas resultados y evidencias')
h('Evidencia actual y evidencia histórica')
table(['Comprobación','Resultado registrado','Alcance temporal'],[
 ('Frontend completo','281 pruebas correctas; lint, tipos y build aprobados.','9 de noviembre de 2026.'),
 ('Backend completo','249 pruebas correctas y 8 de aprovisionamiento local; lint, tipos y build aprobados.','9 de noviembre de 2026.'),
 ('Integración de soporte','2 recorridos PostgreSQL correctos; respuestas, archivos, correo, permisos, idempotencia y rollback.','9 de noviembre de 2026; pruebas dirigidas.'),
 ('Publicación','1 recorrido PostgreSQL correcto; bloqueo por identidad caducada y posterior publicación válida concurrente.','9 de noviembre de 2026; ejecución dirigida separada.'),
 ('Validación integral S3-21','55 integraciones; total histórico 565 casos distintos, sin fallos finales ni omitidos.','29 de octubre de 2026; corte histórico aceptado.'),
 ('Contratos e instalación','219 rutas inventariadas y 43 migraciones acumulativas en la instalación local.','Corte del 9 de noviembre; no son pruebas adicionales.')],[4.3,7.8,5.1],9.2)
p('Los conteos pertenecen a sus ejecuciones y cortes. No sumamos repeticiones ni presentamos las 55 integraciones históricas como una nueva ejecución sobre todos los cambios locales. Las suites completas del 9 de noviembre contienen regresiones de los sprints previos; su cantidad no equivale al número de historias de usuario.')
h('Qué demuestra una prueba de integración')
p('Ejecuta la petición HTTP con sesión, DTO, permisos, caso de uso y PostgreSQL real. En soporte, el titular y el personal cargan archivos, responden, descargan desde su expediente y reciben denegación al usar otra cuenta. Se induce un fallo al insertar el aviso: no deben quedar mensaje, vínculo de archivo ni clave parcialmente guardados. Dos peticiones concurrentes con la misma clave generan un único resultado.')
p('En publicación, una campaña aprobada con identidad caducada devuelve HTTP 409 y el motivo de identidad, conserva APPROVED y no agrega una publicación al historial. Una vez restablecida la vigencia en la cuenta efímera, dos intentos concurrentes producen una sola publicación. Los datos de prueba se crean en una base aislada, no sobre las campañas de presentación.')
h('Revisión de interfaz y límites de la evidencia')
p('Se revisaron formularios de soporte y panel del patrocinador en escritorio o móvil: sin desbordamiento horizontal y sin infracciones detectadas por axe en los criterios A/AA examinados. Esto no es certificación integral WCAG. La advertencia existente de tamaño del bundle permanece documentada; el build finaliza correctamente.')
source('[F4] Resumen y aceptación S3-21. [F7] Logs fechados de frontend, backend, soporte y publicación; rutas exactas en las referencias del informe.')

# Página 12
page('11 Preparación defensa técnica y estado final')
h('Arranque para la presentación')
p('Usar la copia de RicardoDev que contiene este corte. Para una instalación nueva, seguir README completo: dependencias con lockfiles, instalación de la línea base V2, migraciones, preparación de catálogos y activación del entorno. No copiar una configuración privada de otra base ni ejecutar install sobre una base ya utilizada.')
steps(['Encender Docker Desktop y el contenedor PostgreSQL original. Mantener la base de uso separada de las bases de comprobación.',
 'Desde backend, con dependencias instaladas y compilación actual, ejecutar corepack pnpm run start. Para cambios de código, recompilar con corepack pnpm run build antes del arranque.',
 'En otra terminal, desde la raíz del proyecto, ejecutar bun run dev y abrir http://127.0.0.1:5173.',
 'Comprobar /api/health/ready y, con sesión, el catálogo de cinco categorías. Configurar Gmail mediante el procedimiento privado del equipo; nunca incluir su contraseña en el informe o Git.'])
h('Preguntas para la defensa')
table(['Pregunta','Respuesta sustentada'],[
 ('Por qué Docker','Reproduce PostgreSQL con la versión y volumen del proyecto; API y frontend permanecen en el equipo.'),
 ('Por qué UUID y slug','Identifican técnicamente la campaña. El nombre puede repetirse y la semejanza es información para revisión.'),
 ('Por qué no aparece Cerrar','El creador prepara, REVIEWER revisa y ADMIN decide el ciclo; se oculta la acción mientras existan bloqueos.'),
 ('Qué garantiza el reintento','La misma clave y contenido recuperan el mismo resultado; una clave reutilizada con datos distintos se rechaza.'),
 ('Qué falta para producción','Proveedor y autorizaciones financieras reales, condiciones legales definitivas, operación y revisión de seguridad acordes con ese entorno.')],[4.8,12.4],9.1)
h('Estado y referencias')
p('El equipo entrega un MVP académico integrado con evidencia funcional y pruebas. La aceptación registrada corresponde a Ricardo sobre el corte S3-21; no se atribuye aceptación al docente, líderes, cliente o compañeros. La ronda humana adicional permanece sujeta a registro. Los ajustes locales del 9 de noviembre no se publican por generar este informe.',small=True)
for line in [
 '[F1] docs/requisitos/Guia_Contexto_y_Alcance_MVP_Crowdfunding.pdf, 24 de agosto de 2026.',
 '[F2] docs/planificacion-sprints.json y docs/plan-sprint-3-cierre-mvp-2026-10-15.md.',
 '[F3] README.md, backend/README.md y docs/contratos-http-sprint3.json del corte local.',
 '[F4] docs/entrega-dev-2026-10-30.md y docs/evidencias/s3-21/resumen.json y aceptacion.json.',
 '[F5] docs/decisiones/ADR-012 a ADR-016; reglas y condiciones provisionales del equipo.',
 '[F6] docs/devoluciones-automaticas-y-evidencias-2026-11-09.md, docs/soporte-adjuntos-respuestas-2026-11-09.md y docs/publicacion-requisitos-identidad-2026-11-09.md.',
 '[F7] tmp/check-soporte-adjuntos-frontend-20261109.log, tmp/check-soporte-adjuntos-backend-20261109.log, tmp/qa-soporte-adjuntos-20261109.log y tmp/qa-publicacion-20261109.log. Logs locales de comprobación sin credenciales.']:
 p(line,small=True)

target=OUT/'Informe_Detallado_Sprint_3_Brotar.docx'
doc.save(target)
print(str(target))
print('Tareas de Sprint 3 documentadas:',len(TASKS),'Rutas HTTP:',ROUTES)
