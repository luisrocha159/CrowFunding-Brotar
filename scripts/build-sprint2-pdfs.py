"""Genera dos guías PDF del corte local; valida las tareas y los anclajes de código.

Requiere reportlab y pypdf. Las imágenes de revisión se generan aparte con Poppler.
No conecta a servicios, no publica archivos y no modifica los documentos históricos.
"""
from pathlib import Path
from html import escape
import json
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle, KeepTogether
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'output/pdf'
TASKS = [t for t in json.loads((ROOT / 'docs/planificacion-sprints.json').read_text(encoding='utf-8'))['tasks'] if t['sprint'] == 2]
assert len(TASKS) == 13
for name, file in [('Body', 'arial.ttf'), ('Bold', 'arialbd.ttf'), ('Mono', 'consola.ttf')]:
    pdfmetrics.registerFont(TTFont(name, str(Path('C:/Windows/Fonts') / file)))
pdfmetrics.registerFontFamily('Body', normal='Body', bold='Bold', italic='Body', boldItalic='Bold')
INK = colors.HexColor('#172820')
S = {
    'body': ParagraphStyle('Body', fontName='Body', fontSize=10.2, leading=14, spaceAfter=7),
    'small': ParagraphStyle('Small', fontName='Body', fontSize=8.5, leading=11.3, spaceAfter=5),
    'h1': ParagraphStyle('H1', fontName='Bold', fontSize=19, leading=23, textColor=INK, spaceAfter=12, keepWithNext=True),
    'h2': ParagraphStyle('H2', fontName='Bold', fontSize=11.2, leading=15, spaceBefore=8, spaceAfter=5, keepWithNext=True),
    'title': ParagraphStyle('Title', fontName='Bold', fontSize=31, leading=36, textColor=INK, spaceAfter=19),
    'code': ParagraphStyle('Code', fontName='Mono', fontSize=8.3, leading=11.5, spaceAfter=5),
}

def p(text, style='body'):
    return Paragraph(escape(text).replace('\n', '<br/>'), S[style])

def section(title, text):
    return [p(title, 'h2'), p(text)]

def steps(items):
    return [p(f'{i}. {text}') for i, text in enumerate(items, 1)]

def ref(path, symbol):
    lines = (ROOT / path).read_text(encoding='utf-8').splitlines()
    line = next((i for i, text in enumerate(lines, 1) if symbol in text), None)
    if line is None:
        raise ValueError(f'Anclaje no encontrado: {path} | {symbol}')
    # Romper solo la presentación: la ruta se conserva también sin cortes en el texto extraíble.
    return p(f'{path}:{line}\nBuscar: {symbol}', 'small')

def table(rows, widths):
    content = [[p(str(cell), 'small') for cell in row] for row in rows]
    result = Table(content, colWidths=widths, hAlign='LEFT', repeatRows=1)
    result.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#EAF1EC')),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LINEBELOW', (0, 0), (-1, 0), .6, INK),
        ('LINEBELOW', (0, 1), (-1, -1), .25, colors.HexColor('#D6DDD8')),
        ('LEFTPADDING', (0, 0), (-1, -1), 7),
        ('RIGHTPADDING', (0, 0), (-1, -1), 7),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    return result

def build(filename, title, pages):
    OUT.mkdir(parents=True, exist_ok=True)
    path = OUT / filename
    def footer(canvas, doc):
        canvas.setTitle(title)
        canvas.setAuthor('Equipo Brotar - Ricardo, Alison y Santiago')
        canvas.setFont('Body', 8)
        canvas.setFillColor(INK)
        canvas.drawString(48, 814, 'BROTAR  /  SPRINT 2  /  CORTE LOCAL 05-10-2026')
        canvas.setStrokeColor(colors.HexColor('#D6DDD8'))
        canvas.line(48, 804, 547, 804)
        canvas.drawString(48, 30, 'Guía técnica y académica | No sustituye aceptación de los líderes')
        canvas.drawRightString(547, 30, str(doc.page))
    story = []
    for i, page in enumerate(pages):
        if i:
            story.append(PageBreak())
        story.extend(page)
    doc = SimpleDocTemplate(str(path), pagesize=A4, leftMargin=48, rightMargin=48, topMargin=55, bottomMargin=48)
    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    reader = PdfReader(path)
    if len(reader.pages) != len(pages):
        raise ValueError(f'Una sección desbordó su página: {filename}: {len(reader.pages)} != {len(pages)}')
    text = '\n'.join(page.extract_text() or '' for page in reader.pages)
    assert '05-10-2026' in text and len(text) > 15000
    print(f'{path.name}: {len(reader.pages)} páginas, {len(text)} caracteres; anclajes verificados.')

# Cada ficha complementa, no reemplaza, los criterios del inventario JSON.
DEMOS = {
    'S2-02': {
        'impl': 'El caso CampaignSections valida la propiedad y el estado; validatePlan comprueba responsables, días reales y relación del hito. TypeormSectionsRepository escribe bajo transacción y bloqueo de campaña. El editor conserva el estado de cambios pendientes y recupera las secciones desde la API.',
        'steps': ['Entrar como creador y abrir Mis borradores. Crear una campaña de ensayo o continuar una propia. Avanzar guardando hasta Plan y presupuesto.', 'Añadir actividad “Plantación de cañahua”, responsable “Ana Muñoz”, inicio 01/11/2026 y fin 10/11/2026. Añadir un hito “Entrega” y asociarlo a la actividad.', 'Pulsar Guardar planificación. Esperar Sección guardada; salir y volver a la misma campaña. Comprobar texto, fechas y vínculo.', 'Quitar una actividad: el editor elimina su vínculo en los hitos y reajusta las posiciones restantes. Guardar y comprobar que no quedan índices inválidos.'],
        'negative': 'Responsable vacío, fin anterior al inicio o fecha 31/02 deben marcar el campo. Otra cuenta no puede leer ni escribir la planificación privada; el API rechaza el acceso aunque conozca el UUID.',
        'refs': [('backend/src/campaigns/domain/sections.ts', 'export function validatePlan'), ('src/features/campaigns/useCampaignSections.ts', 'export function useCampaignSections')],
        'proof': 'backend/test/campaign-sections.test.ts; tests/campaign-sections.test.ts; integración campaign-sections-submission.integration.test.ts.',
    },
    'S2-03': {
        'impl': 'El presupuesto y los riesgos se guardan como bloque separado del plan. Se valida la categoría activa y cada importe; los errores usan rutas como items.0.plannedAmount. El total de presentación suma céntimos enteros. No se inventa una obligación de presupuesto igual a meta.',
        'steps': ['En Plan y presupuesto, añadir una partida y elegir una categoría de gasto activa del catálogo real.', 'Escribir “Semillas”, cantidad 2, precio unitario 5, importe planificado 10 y notas opcionales. Añadir riesgo “Retraso” y mitigación “Proveedor alternativo”.', 'Pulsar Guardar presupuesto y riesgos. Si también se modificó el plan, guardar ambos bloques: el éxito de uno no confirma el otro.', 'Recargar la campaña y comparar partidas, notas, riesgos y total. Probar dos importes 0.10 y 0.20: el total debe presentarse como 0.30.'],
        'negative': 'Cero, negativos, tres decimales, categoría inactiva, notas con más de 5000 caracteres o carácter NUL no deben reemplazar los datos anteriores. Descripción de campaña con números sí es válida: no es un nombre personal.',
        'refs': [('backend/src/campaigns/domain/sections.ts', 'export function validateBudget'), ('src/features/campaigns/sectionsClient.ts', 'export function budgetTotal')],
        'proof': 'sprint2-quality.test (frontend/backend); campaign-sections.test; integración con lectura posterior a entradas inválidas.',
    },
    'S2-04': {
        'impl': 'Se persisten meta, moneda, duración, modelo y fechas opcionales en la campaña. El backend comprueba que la moneda exista y esté activa. Hay dos modelos del esquema: ALL_OR_NOTHING y FLEXIBLE. Si existen recompensas, se protege el cambio de moneda para no dejar importes incoherentes.',
        'steps': ['Abrir Financiamiento después de guardar Plan y presupuesto.', 'Introducir meta 1000, moneda BOB si aparece activa, duración 30 y modelo Flexible. Dejar ambas fechas vacías o indicar un par coherente.', 'Pulsar Guardar financiamiento y esperar confirmación. Recargar y comprobar los cuatro datos y las fechas si se introdujeron.', 'Aclarar al docente que aquí se configura financiamiento: no se ejecuta un pago, no se garantiza recaudación y no se confirma cumplimiento de meta.'],
        'negative': 'Meta 0 o 1.001, duración fraccionaria, moneda inexistente, fin igual/anterior al inicio o solo una fecha deben fallar. 31 de febrero se rechaza, no se convierte silenciosamente en marzo.',
        'refs': [('backend/src/campaigns/domain/sections.ts', 'export function validateFunding'), ('backend/src/campaigns/application/sections.ts', 'async saveFunding')],
        'proof': 'Validaciones pares frontend/backend y suite PostgreSQL. Las fechas y duración no se fuerzan a equivalencia comercial exacta: esa regla no está confirmada.',
    },
    'S2-05': {
        'impl': 'Las recompensas incluyen título, descripción, tipo, aporte mínimo, disponibilidad y entrega estimada. El backend verifica modalidad y moneda. Cambiar a donación exige reconocer la existencia de recompensas, pero conserva sus filas; no activa ventas, inventario de aportes ni checkout.',
        'steps': ['Usar modalidad Recompensa o Preventa. Abrir Recompensas después de Financiamiento.', 'Añadir “Planta de cañahua”, descripción, tipo REWARD o PRESALE según el ensayo, mínimo 10, disponibilidad 20 y fecha 01/01/2027. Guardar.', 'Volver a Modalidad y cambiar a Donación. Si hay recompensas, leer el aviso y confirmar conscientemente el cambio. El asistente omite el paso aplicable.', 'Volver a Recompensa y comprobar que los datos anteriores permanecen. Para enviar esa modalidad hace falta al menos una recompensa completa.'],
        'negative': 'Mínimo cero/negativo, disponibilidad negativa/fraccionaria, entrega imposible y texto excesivo deben marcar errores. Vacío significa sin límite de disponibilidad; 0 no se confunde con ese vacío.',
        'refs': [('backend/src/campaigns/domain/sections.ts', 'export function validateRewards'), ('backend/src/campaigns/application/modality.ts', 'export class Modalities')],
        'proof': 'campaign-sections.test.ts y campaign-sections-submission.integration.test.ts: cambio con reconocimiento, conservación y exclusión pública en donación.',
    },
    'S2-10': {
        'impl': 'CampaignSubmissionPanel consulta datos persistidos y faltantes calculados por missingForSubmission. El resumen no se basa solo en el estado local de inputs. Cada faltante tiene campo, etiqueta y posición del asistente. La portada se presenta como etapa separada sin cambiar el alcance funcional del PDF.',
        'steps': ['Completar y guardar todos los bloques salvo, por ejemplo, la meta. Abrir Revisión y envío.', 'Leer el resumen y localizar el faltante Meta de financiamiento. Pulsarlo para regresar al paso correcto.', 'Guardar la meta y volver a revisión. Comparar título, resumen, historia, indicadores, portada, plan, presupuesto, financiamiento y recompensas aplicables.', 'Comprobar que los indicadores describen metas esperadas, no resultados alcanzados. La revisión es privada: no equivale a publicar.'],
        'negative': 'No debe mostrarse completa una campaña con categoría/moneda inactiva, portada privada/inválida o bloque requerido ausente. Un error al consultar no debe convertirse en éxito ni rellenarse con datos simulados.',
        'refs': [('backend/src/campaigns/domain/submission.ts', 'export function missingForSubmission'), ('src/features/campaigns/CampaignSubmissionPanel.tsx', 'export function CampaignSubmissionPanel')],
        'proof': 'campaign-submission.test.ts, submission-http.test.ts y prueba PostgreSQL integral: respuesta 422 y corrección de faltantes.',
    },
    'S2-11': {
        'impl': 'El envío reutiliza la sesión existente y exige REGISTERED_USER y CREATOR. La API comprueba propiedad, estado editable y completitud; el repositorio vuelve a comprobar bajo bloqueo. La nueva ronda, el estado IN_REVIEW y el historial se registran de manera transaccional.',
        'steps': ['Iniciar sesión con una cuenta de ensayo que tenga CREATOR realmente almacenado. Elegir “creador” en el registro no concede el rol.', 'En Revisión y envío, resolver todos los faltantes y guardar. Pulsar Enviar a revisión una vez y esperar el resultado.', 'Abrir Mis proyectos y comprobar En revisión. Intentar volver a editar: la interfaz y la API deben bloquear la escritura.', 'Como administrador, abrir la cola y verificar que aparece esa campaña; todavía no debe encontrarse en Explorar sin sesión.'],
        'negative': 'Sin sesión: 401; sin CREATOR: 403; campaña incompleta: 422; otro propietario: acceso denegado/no disponible. Dos envíos concurrentes no crean dos rondas: la prueba obtiene un éxito y un 409.',
        'refs': [('backend/src/campaigns/application/submission.ts', 'export class CampaignSubmission'), ('backend/src/campaigns/infrastructure/typeorm-submission.repository.ts', 'export class TypeormSubmissionRepository')],
        'proof': 'submission-http.test.ts, campaign-submission.test.ts y escenarios de concurrencia/persistencia del ensayo PostgreSQL integral.',
    },
    'S2-12': {
        'impl': 'ADMIN consulta el expediente completo y decide aprobar, solicitar cambios o rechazar. Se registra actor autenticado, fecha, motivo y observaciones; no se acepta que el cuerpo elija el revisor. Una ronda esperada impide decidir sobre una revisión que ya cambió.',
        'steps': ['Iniciar sesión como ADMIN y abrir Mi cuenta > Opciones para iniciativas y permisos > Revisión de campañas.', 'Abrir el detalle de una campaña IN_REVIEW. Revisar todos los bloques, portada, faltantes, rondas y estado: no solo nombre y meta.', 'Elegir Solicitar cambios, escribir un motivo entendible y una observación por sección si corresponde; confirmar. Comprobar CHANGES_REQUESTED.', 'En otro ensayo, aprobar y comprobar APPROVED privada. Para rechazo usar una segunda campaña enviada y un motivo; comprobar REJECTED y su historial.'],
        'negative': 'Solicitud de cambios o rechazo sin motivo, NUL, más de 5000 caracteres, sección inventada, campos extra y ronda obsoleta no deben escribir. Si la respuesta es incierta, actualizar antes de intentar decidir de nuevo.',
        'refs': [('backend/src/campaigns/domain/administrative-review.ts', 'export function validateDecision'), ('backend/src/campaigns/infrastructure/typeorm-administrative.repository.ts', 'decide(actorId')],
        'proof': 'administrative-review.test.ts; administrative-review-http.test.ts; administrative-campaigns.test.ts; ensayo completo PostgreSQL.',
    },
    'S2-13': {
        'impl': 'Solo CHANGES_REQUESTED permite la corrección del propietario. Las observaciones de la última ronda se muestran en el constructor. Guardar no borra el historial; reenviar crea otra ronda pendiente y vuelve a bloquear la edición.',
        'steps': ['Después de una solicitud de cambios real, salir de ADMIN e iniciar sesión como creador propietario.', 'En Mis proyectos, abrir Corregir campaña. Consultar las observaciones de la revisión y ubicar el bloque afectado.', 'Corregir, por ejemplo, la explicación de beneficiarios. Guardar ese bloque; volver a Revisión y envío y comprobar que no quedan faltantes.', 'Reenviar. Como ADMIN, actualizar el expediente: debe existir una ronda nueva PENDING y conservarse la decisión y observaciones anteriores.'],
        'negative': 'Otra persona no puede corregir el borrador. IN_REVIEW, APPROVED, PUBLISHED y REJECTED no permiten edición/reenvío en este incremento. Rechazado no significa “cambios solicitados”.',
        'refs': [('backend/src/campaigns/domain/draft.ts', 'export function allowsBuilderEditing'), ('src/features/campaigns/CampaignSubmissionPanel.tsx', 'export function CampaignSubmissionPanel')],
        'proof': 'Prueba PostgreSQL: varias rondas, observaciones, reenvío y conflictos con la ronda anterior; pruebas de dominio de estados.',
    },
    'S2-14': {
        'impl': 'Aprobar y publicar son operaciones distintas. D05 autoriza provisionalmente solo ADMIN a publicar con la bandera habilitada. La publicación exige aprobación vigente, confirmación expresa, ronda correcta y campaña completa; registra fecha/actor y deja el recurso visible al visitante.',
        'steps': ['Como ADMIN, aprobar la campaña enviada y confirmar. Leer el aviso de que APPROVED sigue privada.', 'Sin sesión, buscarla en Explorar: aún no debe aparecer. Volver al expediente administrativo actualizado.', 'Pulsar Publicar campaña y confirmar. Comprobar PUBLISHED y el historial de publicación.', 'Sin sesión, buscar y abrir el proyecto publicado. Comparar con los datos que guardó el creador. No editar el estado con SQL para simular esta demostración.'],
        'negative': 'Sin ADMIN, sin bandera habilitada, sin confirmación, en DRAFT/IN_REVIEW/REJECTED o con ronda obsoleta se deniega. La bandera no concede roles. Publicar dos veces no duplica el historial.',
        'refs': [('backend/src/campaigns/application/administrative-review.ts', 'publish(actorId'), ('backend/src/campaigns/domain/lifecycle.ts', 'export const PHASE3_STATUSES')],
        'proof': 'D05 en ADR-005; migración CampaignRejected; pruebas HTTP, dominio, migración aislada y PostgreSQL con publicación concurrente.',
    },
    'S2-15': {
        'impl': 'Projects y TypeormProjectRepository listan solo proyectos propios y permiten abrir un proyecto concreto. Las acciones dependen del estado. El descarte es lógico, exige confirmación y solo afecta DRAFT propio; mantiene relaciones e historial.',
        'steps': ['Como creador, abrir Mis proyectos. Identificar título, estado y actualización de cada campaña propia.', 'Abrir el detalle y pulsar Continuar borrador o Corregir campaña según el estado. Comprobar que abre esa campaña y no otra.', 'Crear otro borrador desechable. Pedir Descartar, cancelar y comprobar que sigue visible. Volver a pedirlo y confirmar.', 'Comprobar que el descartado sale de la lista habitual y no se publica. No usar la campaña principal de la presentación para el ensayo de descarte.'],
        'negative': 'Una cuenta distinta no debe consultar/descartar esa campaña; tampoco se descartan campañas enviadas, aprobadas o publicadas. Una carrera entre envío y descarte debe abortar sin un historial incoherente.',
        'refs': [('backend/src/campaigns/application/projects.ts', 'async discard'), ('src/features/campaigns/ProjectsPage.tsx', 'export function ProjectsPage')],
        'proof': 'projects.test.ts, projects.integration.test.ts y pruebas de frontend de listas, confirmación, estados y errores.',
    },
    'S2-16': {
        'impl': 'El catálogo y detalle públicos leen la API real; el repositorio filtra PUBLISHED, no descartadas y portada pública válida. El contrato excluye contenido administrativo. El avance procede de la vista de financiamiento, no de cifras de demostración.',
        'steps': ['Cerrar sesión o usar una ventana privada. Abrir Explorar; debe verse la campaña publicada del ensayo anterior.', 'Buscar por parte de su nombre y combinar categoría, ubicación y modalidad. Los filtros se intersectan, no se suman indiscriminadamente.', 'Abrir la tarjeta: comprobar portada, creador, problema, solución, beneficiarios, impacto esperado, meta/avance y recompensas aplicables.', 'Buscar un texto inexistente y observar el vacío explicado. Si no hay publicaciones, no deben aparecer automáticamente las antiguas campañas mock.'],
        'negative': 'DRAFT, IN_REVIEW, CHANGES_REQUESTED, APPROVED y REJECTED no se muestran. Un slug privado/inexistente devuelve no disponible. Fallo de red o JSON malformado no se transforma en una campaña inventada.',
        'refs': [('backend/src/campaigns/infrastructure/typeorm-public-campaign.repository.ts', 'export class TypeormPublicCampaignRepository'), ('src/features/public/campaignsApi.ts', 'export function mapPublicCampaign')],
        'proof': 'public-campaigns.test.ts de ambas aplicaciones y public-campaigns.integration.test.ts. Favoritos, aportes y pagos quedan fuera del alcance actual.',
    },
    'S2-17': {
        'impl': 'La cola administrativa reutiliza la lista/detalle y el panel de decisión; distingue navegación de S2-12. Incluye campañas enviadas y aprobadas pendientes de publicación. La autorización se comprueba en servidor, además del acceso condicional de la interfaz.',
        'steps': ['Entrar con ADMIN; desde Mi cuenta abrir Revisión de campañas. Consultar la lista y buscar la campaña de ensayo.', 'Filtrar por estado, abrir el detalle y comprobar que mantiene el proyecto seleccionado. Usar Volver para regresar a la cola.', 'Después de aprobar, volver a la cola: APPROVED debe seguir disponible para publicar; no se pierde entre revisión y publicación.', 'Con una cuenta básica intentar abrir /administracion/campanas: debe verse denegación, no una cola con datos ajenos.'],
        'negative': 'Sin sesión se solicita iniciar sesión; un usuario común no recibe datos administrativos. Lista vacía, carga y error se distinguen. La cola no incorpora estadísticas financieras ni revisión KYC/KYB de Sprint 3.',
        'refs': [('backend/src/campaigns/infrastructure/projects.controller.ts', 'export class CampaignReviewQueueController'), ('src/features/campaigns/useProjects.ts', 'export function useProjects')],
        'proof': 'projects.integration.test.ts, pruebas HTTP de proyectos y pruebas frontend de cola/accesos. Provisión definitiva de ADMIN sigue pendiente en D06.',
    },
    'S2-21': {
        'impl': 'Se integraron los trece compromisos y se ejecutaron validaciones, lint, tipos, compilaciones y pruebas reales de PostgreSQL. Se documentaron instalación, permisos, D05 y recorridos. Esta revisión añade dos guías y casos de Unicode, precisión decimal, fechas y NUL.',
        'steps': ['Seguir la preparación de esta guía o el README vigente. Comprobar Docker saludable y /api/health/ready antes de evaluar funcionalidades.', 'Ejecutar bun run check; en backend las comprobaciones con pnpm 11.19.0; ejecutar la integración con escritura de fixtures autorizada.', 'Guardar la salida resumida: 130 frontend, 128 backend y 18 integración, todos aprobados. Estos 276 casos incluyen regresiones del Sprint 1.', 'Demostrar creador > administrador > visitante con datos ficticios. Anotar qué se observó, resultado esperado, resultado real y responsable de la revisión.'],
        'negative': 'No marcar aceptación externa por tener tests verdes. Falta publicar el corte con referencia de commit/PR cuando se autorice y obtener revisión de líderes. No declarar correo, legal, KYC/KYB, pagos ni provisión definitiva de roles resueltos.',
        'refs': [('tests/sprint2-quality.test.tsx', "test('S2 calidad"), ('backend/integration/campaign-sections-submission.integration.test.ts', "test('S2 completo PostgreSQL")],
        'proof': 'Los tests de integración limpian solo sus cuentas, campañas y catálogos temporales. No se borraron volúmenes ni datos previos. El ensayo UI del corte anterior se conserva separado de las pruebas automáticas actuales.',
    },
}
assert set(DEMOS) == {t['id'] for t in TASKS}

def demonstration_pages():
    pages = []
    pages.append([
        Spacer(1, 28), p('BROTAR', 'title'), p('Guía de demostración y estudio\nSprint 2 - módulo de campañas', 'h1'),
        p('Equipo: Ricardo, Alison y Santiago. Corte: 5 de octubre de 2026. Base: incremento integrado local en RicardoDev; frontend React/TypeScript, backend NestJS/TypeORM y PostgreSQL V2.'),
        *section('Propósito y lectura', 'Explicar qué debía cumplir cada tarea, dónde está implementada y cómo demostrarla. Primero preparar el entorno; después realizar el recorrido completo y consultar las trece fichas. Cada ficha incluye los criterios del backlog y un ensayo negativo. Las rutas de código son relativas a la raíz del proyecto y las líneas se verifican al generar este PDF.'),
        *section('Estado real del corte', 'Trece tareas con verificación técnica local. S2-21 y el criterio externo común conservan pendiente el commit/entrega y aceptación de líderes. No se ha publicado este corte ni modificado DEV, main o Trello. “Cierre técnico” no significa cerrar toda una historia BG del MVP.'),
        *section('Alcance funcional', 'Crear y guardar campañas propias; plan, presupuesto, financiamiento y recompensas; revisión final, envío, decisión administrativa, corrección, aprobación, publicación y catálogo público real. Se mantiene la base de acceso, perfiles y organizaciones del Sprint 1.'),
        *section('Fuera del alcance', 'Aportes, pagos, checkout, desembolsos, reembolsos, conciliación, KYC/KYB y rendición. No se añaden reglas comerciales definitivas pendientes del cliente. ADMIN publica de forma provisional conforme a D05; D06 sigue pendiente.'),
        p('Resultado automatizado: 276 pruebas aprobadas, sin fallos ni omisiones. No constituye una auditoría de seguridad integral ni garantía de ausencia de errores.', 'small'),
    ])
    pages.append([p('01. Mapa de tareas y alcance', 'h1'),
        p('El identificador se conserva aunque tenga saltos: tareas trasladadas al Sprint 3 no se renumeran. S2-16 es una tarea compuesta vinculada a varias historias; no son seis tareas independientes.'),
        table([['Tarea', 'Responsable', 'Resultado del incremento']] + [[t['id'], t['owner'], t['title']] for t in TASKS], [59, 80, 360]),
        *section('Cómo leer los checklists', 'CA1: resultado funcional. CA2: validaciones y escenarios. Ambos están verificados técnicamente dentro del alcance indicado. CA3: evidencia y documentación existen; referencia del nuevo commit/PR y revisión externa siguen pendientes para todas las fichas. No se oculta ese criterio incompleto.'),
        p('Los criterios se leen desde docs/planificacion-sprints.json; localProgress expresa el corte actual y los estados históricos del inventario se conservan. Las tallas M/L son estimaciones, no horas medidas ni autoría exclusiva de cada línea.', 'small')])
    pages.append([p('02. Preparar el entorno de prueba', 'h1'),
        p('Primera instalación: seguir la sección de instalación limpia del README. La infraestructura vigente es infra/postgres-v2; infra/postgres es histórica. No copiar .env.example encima de una instalación existente ni restaurar el SQL sobre datos poblados.'),
        *section('V2 ya instalada: actualización ordenada', 'Desde la raíz, instalar dependencias y arrancar PostgreSQL. Dentro de backend compilar, migrar, preparar permisos y verificar. Detenerse si cualquiera de esos pasos falla.'),
        *[p(line, 'code') for line in ['bun install --frozen-lockfile', 'docker compose --env-file infra/postgres-v2/.env -f', '  infra/postgres-v2/compose.yaml up -d --wait', 'cd backend', 'pnpm install --frozen-lockfile', 'pnpm run build', 'node scripts/migrate.mjs up', 'node scripts/prepare-sprint2.mjs', 'node scripts/migrate.mjs status', 'node scripts/verify-provisional-v2.mjs']],
        p('El comando docker compose mostrado en dos líneas se ejecuta como una sola línea. No omitir --env-file ni cambiar la carpeta de infraestructura.', 'small'),
        *section('Configuración y procesos', 'El instalador genera secretos locales y un candidato .env.backend; activate lo coloca en backend/.env conservando la configuración previa. La API local apunta a 127.0.0.1:15433, brotar_db y brotar_app. PostgreSQL escucha 5432 dentro del contenedor. NestJS y Vite corren fuera de Docker.'),
        p('Publicación: CAMPAIGN_ADMIN_PUBLICATION_ENABLED=true en backend/.env habilita la política provisional, sin conceder ADMIN. No publicar .env. Arrancar pnpm run dev en backend y bun run dev en otra terminal desde la raíz. Abrir http://127.0.0.1:5173 y comprobar http://127.0.0.1:3000/api/health/ready.'),
        p('Usar las versiones del README: Node 24, Bun 1.4.2 y pnpm 11.19.0. Si el pnpm global difiere, corepack pnpm run lint/typecheck/test/build se ejecutan individualmente. No borrar volúmenes ni usar Factory Reset.', 'small')])
    pages.append([p('03. Recorrido integral para el ensayo', 'h1'),
        p('Preparar tres perspectivas: creador propietario, ADMIN autorizado y visitante sin sesión. Las cuentas de prueba deben ser ficticias. El registro concede rol básico, no CREATOR/ADMIN; no compartir contraseñas ni mostrar .env durante la defensa.'),
        *steps(['Creador: entrar, crear un borrador de modalidad Recompensa y completar información general, historia/impacto y portada pública.', 'Plan y presupuesto: guardar una actividad, un hito, una partida y un riesgo. Guardar ambos bloques. Financiamiento: meta 1000, moneda activa, duración 30 y modelo Flexible.', 'Recompensas: guardar título, descripción, tipo, mínimo 10, cantidad 20 y entrega estimada. Salir y retomar la misma campaña para comprobar persistencia.', 'Revisión final: comprobar resumen y faltantes. Enviar completo; verificar IN_REVIEW y edición bloqueada.', 'ADMIN: abrir la cola y expediente completo. Solicitar cambios con motivo; creador: corregir, guardar y reenviar. Verificar nueva ronda y conservación de la anterior.', 'ADMIN: aprobar y confirmar. Visitante: comprobar que todavía no aparece. ADMIN: publicar y confirmar; visitante: encontrarla con filtros y abrir detalle real.', 'Segundo ensayo: rechazar otra campaña completa con motivo. Tercer borrador desechable: cancelar y luego confirmar descarte. No descartar la campaña principal.']),
        table([['Estado', 'Qué se puede demostrar'], ['DRAFT', 'Guardar/continuar; descarte propio confirmado'], ['IN_REVIEW', 'ADMIN decide; creador no edita; no pública'], ['CHANGES_REQUESTED', 'Propietario corrige; reenvío crea nueva ronda'], ['APPROVED', 'Privada; publicación administrativa separada'], ['PUBLISHED', 'Visible al visitante; no editable aquí'], ['REJECTED', 'Motivo/historial; no publicación ni reenvío aquí']], [135, 364]),
        p('El PDF oficial define siete áreas; la interfaz mantiene ocho posiciones porque Portada está separada. Donación omite Recompensas. No confundir posición del constructor con número de tarea.', 'small')])
    for task in TASKS:
        demo = DEMOS[task['id']]
        page = [p(f"{task['id']} | {task['title']}", 'h1'),
                p(f"Responsable planificado: {task['owner']} | Esfuerzo: {task['size']} | Historias: {', '.join(task['stories'])}", 'small'),
                p('Qué debía cumplirse y estado del checklist', 'h2')]
        for i, criterion in enumerate(task['acceptance'], 1):
            state = 'PARCIAL: entrega y aceptación externas pendientes' if i == 3 else 'VERIFICADO TÉCNICAMENTE'
            page.append(p(f'CA{i} - {state}. {criterion}', 'small'))
        page.extend(section('Implementación y motivo', demo['impl']))
        page.append(p('Demostración paso a paso', 'h2'))
        page.extend(steps(demo['steps']))
        page.extend(section('Ensayo negativo y resultado esperado', demo['negative']))
        page.append(p('Código y evidencia para defender', 'h2'))
        page.extend(ref(*r) for r in demo['refs'])
        page.append(p(demo['proof'], 'small'))
        pages.append(page)
    pages.append([p('04. Repetir las pruebas y registrar evidencia', 'h1'),
        table([['Conjunto', 'Aprobadas', 'Fallidas / omitidas'], ['Frontend', '130', '0 / 0'], ['Backend sin base', '128', '0 / 0'], ['PostgreSQL real', '18', '0 / 0'], ['Total', '276', '0 / 0']], [280, 80, 139]),
        p('En raíz: bun run check. Backend: pnpm run check con la versión declarada. En el equipo de la revisión, el pnpm global era distinto: se ejecutaron individualmente corepack pnpm run lint, typecheck, test y build. La suite de tests compila dist-test antes de la integración.'),
        *[p(line, 'code') for line in ['# Desde backend, con V2 configurada y permisos preparados', "$env:ALLOW_DB_TEST_WRITES='true'", "$env:DB_TEST_RESTART='false'", 'node --env-file=../infra/postgres-v2/.env.backend --test', '  --test-concurrency=1 dist-test/integration/*.test.js', 'Remove-Item Env:\\ALLOW_DB_TEST_WRITES', 'Remove-Item Env:\\DB_TEST_RESTART']],
        p('La invocación node partida en dos líneas se ejecuta como una línea. El README usa try/finally para retirar las variables aunque falle el ensayo. Solo ejecutar escritura de fixtures en la base local de ensayo, nunca en producción.', 'small'),
        *section('Qué prueban realmente', 'La integración usa HTTP, roles y PostgreSQL reales: propiedad, validación, rollback, lectura posterior, reinicio de API, sesión, rondas, solicitudes concurrentes, aprobación privada, publicación y catálogo. La migración se ensaya también sobre una base temporal restaurada desde SQL oficial. En este corte DB_TEST_RESTART=false: no se repitió el reinicio del contenedor.'),
        *section('Nuevas regresiones de esta revisión', 'Ñ, acentos y espacios exactos en hash/login; 128 puntos de código; nombres personales con números rechazados; importes válidos altos; total 0.10 + 0.20; febrero imposible; límites 5000; NUL rechazado antes de PostgreSQL; ronda administrativa inválida; carga inicial accesible tras extraer el hook.'),
        *section('Limitaciones de la evidencia', 'La interfaz real fue ensayada en el corte previo (capturas en docs/evidencia-sprint-2). La comprobación adicional por navegador de esta revisión quedó bloqueada por el acceso de la herramienta: no se declara repetida. El render SSR comprueba contenido inicial, no sustituye una prueba interactiva completa del hook.')])
    pages.append([p('05. Defensa, contingencias y cierre', 'h1'),
        *section('Errores de entorno: cómo explicar y actuar', 'Si /health/ready falla, revisar Docker saludable, DATABASE_ENABLED, puerto 15433 y configuración activada sin imprimir secretos. Si falta app_user/user_profile, detenerse: la migración no instala una línea base ausente; seguir instalación limpia. No restaurar sobre una base poblada para “arreglarla”.'),
        *section('403 o botones ausentes', 'Revisar sesión y roles guardados. Perfil elegido en registro, estado PENDING_VERIFICATION y verificación de identidad son conceptos distintos. La cuenta puede tener acceso básico sin recibir CREATOR o ADMIN. No eliminar guards para facilitar la presentación.'),
        *section('409, 422 y respuesta incierta', '409: estado/ronda cambió; actualizar antes de repetir. 422: revisar los faltantes y guardar los bloques indicados. Si se perdió la respuesta del guardado, los datos del formulario se conservan, pero no afirmar que el servidor no escribió: recuperar el estado antes de otra decisión administrativa.'),
        *section('Preguntas frecuentes de defensa', '¿Por qué aprobar no publica? Para separar evaluación y exposición pública, conforme a D05 provisional. ¿Por qué sigue vacía Explorar? No hay PUBLISHED con portada pública válida o el filtro excluye resultados. ¿Dónde se valida? Frontend orienta; DTO/dominio/caso de uso y transacción protegen la escritura. ¿Se cerró todo Brotar? No: solo el alcance técnico de estas trece tareas.'),
        *section('Pendientes explícitos', 'Entrega del nuevo corte con referencia de commit/PR y aceptación de líderes; provisión definitiva de roles D06; política final de publicación/negocio del cliente; correo real, textos legales y verificación cuando corresponda. Estas decisiones no se resuelven falsamente mediante SQL ni con pruebas verdes.'),
        *section('Fuentes y material de apoyo', 'Brotar_Tarea_Fase3_Modulo_Campanas.pdf, secciones 4-10 y 13; docs/planificacion-sprints.json (trece tareas); README, secciones 3, 12, 14 y 15; docs/cierre-tecnico-sprint-2-2026-10-05.md; ADR-005; código y suites citados en cada ficha. El segundo PDF explica los principios de diseño que sustentan la implementación.'),
        p('Ficha de ensayo sugerida: tarea / cuenta y rol ficticios / pasos / resultado esperado / resultado observado / prueba o captura / fecha / revisor. Marcar “no ejecutado” cuando no se comprobó, no “aprobado por suposición”.', 'small')])
    return pages

# Páginas agrupadas por concepto: definición, problema real, evidencia y límite.
METHODS = [
    ('KISS - simplicidad verificable',
     'Elegir la solución más simple que satisfaga el requisito, no la más corta a costa de seguridad. En este sprint las decisiones se expresan mediante funciones de dominio pequeñas y operaciones explícitas; no se añadió un motor genérico de campañas.',
     'reviewTarget, isPublicCampaign y canDiscardCampaign conservan reglas concretas. validateFunding revisa meta/modelo/duración/fechas y devuelve errores por campo. La corrección decimal compara con toFixed(2) en lugar de una tolerancia binaria arbitraria; budgetTotal suma céntimos dentro del límite actual de partidas.',
     [('backend/src/campaigns/domain/lifecycle.ts', 'export function reviewTarget'), ('backend/src/campaigns/domain/sections.ts', 'const money'), ('src/features/campaigns/sectionsClient.ts', 'export function budgetTotal')],
     'Mostrar una campaña APPROVED que aún no aparece públicamente; abrir isPublicCampaign. Ejecutar el caso 0.10 + 0.20 y el importe máximo válido. La regla es legible y se puede aislar en una prueba sin arrancar NestJS.',
     'Una función pequeña puede seguir siendo incorrecta. Sumar céntimos aquí no constituye un motor financiero listo para pagos: es un total de presentación sobre partidas validadas y límites acotados.',
     '“Aplicamos KISS a reglas acotadas y resultados explícitos; mantuvimos transacciones y autorización porque forman parte del requisito, no son complejidad prescindible”.'),
    ('DRY - reutilizar conocimiento, no acoplar fronteras',
     'Evitar copias de una misma decisión que evolucionen de forma contradictoria. Se conserva transporte HTTP común y parsers reutilizados. No se elimina la validación de servidor por existir una en la interfaz.',
     'requestApi centraliza cookies, no-store, timeout, cabecera de mutación y traducción de fallos. administrativeDetailFrom reutiliza planFrom, budgetFrom, fundingFrom y rewardsFrom. El hook concentra el patrón de guardado y feedback para cuatro bloques sin copiarlo en cada formulario.',
     [('src/shared/api/request.ts', 'export async function requestApi'), ('src/features/campaigns/administrativeClient.ts', 'export function administrativeDetailFrom'), ('src/features/campaigns/useCampaignSections.ts', 'async function persist')],
     'Abrir tests/api-request.test.ts y observar cookies/cancelación. Abrir administrative-campaigns.test.ts: una respuesta anidada incorrecta no crea un éxito falso. Mostrar cómo cada formulario invoca una operación del mismo hook.',
     'Frontend y backend tienen reglas espejo de secciones porque protegen fronteras distintas; son duplicación consciente, no DRY perfecto. Pruebas de paridad evitan divergencia en los casos cubiertos. El navegador no importa código de infraestructura del backend. Cambiar la regla exige revisar ambos lados.',
     '“Reutilizamos transporte y contratos; el servidor sigue siendo autoridad. No confundimos eliminar copia con eliminar una defensa independiente”.'),
    ('YAGNI - alcance confirmado, no funciones supuestas',
     'No construir hoy funcionalidades basadas solo en una posibilidad futura. La tarea Fase 3 excluye explícitamente pagos, aportes, checkout, KYC/KYB y rendición. El backlog conserva esos módulos para refinamiento posterior.',
     'PublicCampaigns expone catálogo/detalle; Projects controla proyectos/descarte; AdministrativeReview decide y publica según D05. No se añadió un proveedor de pagos, permisos definitivos inventados ni activación de identidad automática. La configuración se limita a publicación administrativa provisional.',
     [('backend/src/campaigns/application/public-campaigns.ts', 'export class PublicCampaigns'), ('backend/src/campaigns/application/projects.ts', 'export class Projects'), ('backend/src/campaigns/domain/administrative-review.ts', 'export function publicationEnabled')],
     'En el detalle público mostrar contenido/recompensas sin cobrar. Explicar que configurar una meta y mostrar avance real no implementa checkout. Abrir ADR-005 y señalar alcance provisional y decisión D06 pendiente.',
     'YAGNI no justifica omitir pruebas, seguridad, documentación o publicación requerida por la fase. Tampoco significa borrar el backlog futuro. El diseño deja puertos acotados, no una plataforma extensible para cualquier caso imaginado.',
     '“Construimos el flujo real pedido y no adelantamos los módulos expresamente excluidos. Las decisiones del cliente pendientes se documentan en vez de inventarse”.'),
    ('S de SOLID - responsabilidad única (SRP)',
     'Una unidad debe concentrar una responsabilidad y una razón coherente para cambiar. Separar archivos por sí solo no basta: cada pieza debe conservar un propósito claro.',
     'Se extrajo useCampaignSections del componente. El hook coordina carga, guardado, cambios pendientes y errores; CampaignSectionsEditor describe controles. sectionsClient transporta y valida contratos. En backend SectionsController recibe HTTP, CampaignSections coordina el caso y TypeormSectionsRepository realiza persistencia.',
     [('src/features/campaigns/useCampaignSections.ts', 'export function useCampaignSections'), ('src/features/campaigns/CampaignSectionsEditor.tsx', 'export function CampaignSectionsEditor'), ('backend/src/campaigns/application/sections.ts', 'export class CampaignSections')],
     'Buscar en el editor: no contiene fetch ni las operaciones de persistencia. Mostrar en el hook persist y sus callbacks de guardado. Ejecutar el render SSR de carga y las pruebas de cliente/reglas; el constructor continúa integrando los bloques.',
     'El hook coordina cuatro bloques relacionados y el constructor general conserva bastante estado. No se afirma que todo archivo tenga una única tarea microscópica ni que esta extracción reduzca por sí sola el número de bugs. Una prueba interactiva adicional del hook no fue repetida por bloqueo del navegador.',
     '“Separé coordinación y presentación para poder cambiar mensajes/controles sin reescribir red, y cambiar guardado sin alterar todo el marcado”.'),
    ('O de SOLID - abierto/cerrado (OCP)',
     'Diseñar puntos de variación que permitan extender comportamientos sin reescribir consumidores estables. No exige que nunca se modifique una línea existente: una corrección o un nuevo requisito puede requerir cambios.',
     'AdministrativeReview depende del contrato AdministrativeRepository. La misma coordinación se prueba con un repositorio en memoria y se ejecuta con TypeormAdministrativeRepository. requestApi admite un transporte send y una estrategia errorFromResponse; los módulos concretos validan sus propios contratos.',
     [('backend/src/campaigns/application/administrative-review.ts', 'export interface AdministrativeRepository'), ('backend/src/campaigns/application/administrative-review.ts', 'export class AdministrativeReview'), ('src/shared/api/request.ts', 'errorFromResponse?')],
     'Mostrar en administrative-review.test.ts el objeto repository que cuenta escrituras. Activar/desactivar publicación sin cambiar el caso. Mostrar cómo el cliente de campañas especializa errores 400 sin duplicar todo requestApi.',
     'Cambiar PostgreSQL por otro motor sigue exigiendo implementar consultas, restricciones y migraciones; no es una sustitución gratuita. Agregar un nuevo estado o decisión podría modificar dominio, contratos, UI y base: no se anuncia OCP universal.',
     '“Dejamos extensible la persistencia y el transporte en puntos concretos; no añadimos una jerarquía por cada modalidad solo para mostrar el principio”.'),
    ('L de SOLID - sustitución de Liskov (LSP)',
     'Una implementación o especialización debe conservar el contrato esperado por quien la consume. Coincidir en nombres o tipos no basta si cambia las promesas de errores, resultados o invariantes.',
     'DraftFieldError extiende SessionError, mantiene status=400 y agrega fields. requestApi conserva errores que ya son SessionError, de modo que vistas generales pueden tratarlos sin perder su estado HTTP; vistas de formulario aprovechan el detalle. Los dobles de repositorio conservan promesas y resultados del puerto.',
     [('src/features/campaigns/campaignsClient.ts', 'export class DraftFieldError'), ('src/shared/api/sessionError.ts', 'export class SessionError'), ('tests/api-request.test.ts', "test('LSP")],
     'Ejecutar el caso LSP de api-request.test.ts: el error especializado es también SessionError y conserva status. Después probar un formulario inválido: se muestran campos, sin convertir el error en un éxito genérico.',
     'Un fake en memoria no demuestra por sí solo todas las garantías del repositorio SQL, especialmente concurrencia. La suite PostgreSQL complementa esa evidencia. No se creó herencia artificial entre usuario, creador y organización: esas responsabilidades se expresan mediante roles/relaciones.',
     '“El error más específico puede utilizarse donde se esperaba SessionError sin romper el consumidor; añade detalle, no cambia su significado”.'),
    ('I de SOLID - segregación de interfaces (ISP)',
     'Los consumidores no deberían depender de operaciones que no necesitan. Un contrato se define por su uso, no por intentar reunir todo el sistema en una interfaz universal.',
     'SubmissionRepository ofrece snapshot, submit y observations. AdministrativeRepository se limita a detail, decide y publish. PublicCampaignRepository solo lista el contenido público. La capa de casos de uso no exige métodos de pagos, KYC o perfil para consultar campañas.',
     [('backend/src/campaigns/application/submission.ts', 'export interface SubmissionRepository'), ('backend/src/campaigns/application/administrative-review.ts', 'export interface AdministrativeRepository'), ('backend/src/campaigns/application/public-campaigns.ts', 'export interface PublicCampaignRepository')],
     'Abrir los tres contratos y comparar operaciones. Mostrar un doble de AdministrativeRepository que implementa únicamente tres métodos para ensayar decisiones. Mostrar que el catálogo no recibe datos privados de revisión.',
     'SectionsRepository conserva varios métodos de lectura/escritura y catálogo porque el constructor los utiliza. Podría refinarse si aparecen consumidores con necesidades distintas, pero no se crearon decenas de interfaces sin necesidad actual. Interfaces pequeñas no garantizan por sí mismas privacidad.',
     '“Los puertos se separan por caso de uso; el catálogo no debe implementar aprobación, autenticación ni pagos”.'),
    ('D de SOLID - inversión de dependencias (DIP)',
     'Las reglas de alto nivel dependen de abstracciones de su propia capa, no de detalles de HTTP o persistencia. La inyección es una técnica de ensamblaje; no equivale automáticamente al principio.',
     'CampaignSections recibe DraftRepository y SectionsRepository; CampaignSubmission recibe puertos de borradores/envío; AdministrativeReview recibe su repositorio y una política booleana. Dominio/aplicación no importan NestJS, Express, TypeORM ni infrastructure. campaigns.module.ts ensambla adaptadores concretos.',
     [('backend/src/campaigns/application/sections.ts', 'constructor('), ('backend/src/campaigns/campaigns.module.ts', 'provide: AdministrativeReview'), ('backend/test/architecture.test.ts', "test('BG-58")],
     'Ejecutar architecture.test.ts, que inspecciona imports de capas. Luego mostrar una prueba de aplicación que inyecta un repositorio fake. Finalmente seguir la factory de Nest para explicar qué implementación se usa realmente.',
     'La prueba de imports detecta una forma de acoplamiento, no garantiza una arquitectura perfecta. El adaptador debe conocer TypeORM y PostgreSQL: eso corresponde a infraestructura. Al cambiar el esquema se revisan adaptadores y migraciones, no solo el contenedor.',
     '“Los casos de uso piden operaciones de negocio mediante puertos; el módulo decide cómo conectarlos con PostgreSQL”.'),
    ('IoC, inyección y composición sobre herencia',
     'IoC traslada el control de ensamblar dependencias fuera del caso de uso. Dependency Injection entrega esos objetos desde el exterior. Composición reúne colaboradores sin hacer que una clase herede de otra con una responsabilidad distinta.',
     'Nest registra adaptadores y useFactory construye los casos. CampaignSections usa repositorios; AdministrativeReview usa uno y una bandera. En frontend CampaignBuilderPage compone editor, portada y revisión; el editor utiliza un hook. No hereda de un “formulario universal”.',
     [('backend/src/campaigns/campaigns.module.ts', 'provide: CampaignSections'), ('src/features/campaigns/CampaignBuilderPage.tsx', 'CampaignSectionsEditor'), ('src/features/campaigns/CampaignSectionsEditor.tsx', 'useCampaignSections(props)')],
     'Seguir el ensamblaje: proveedor concreto > constructor > operación. Cambiar en un test el colaborador inyectado y observar la misma coordinación. Mostrar que actualizar portada no obliga a crear subclases de los demás pasos.',
     'La herencia no está prohibida: DraftFieldError es una especialización válida y algunos DTO comparten campos. Composición se prefiere cuando la relación es “usa/tiene”, no “es un”. Estos conceptos son distintos de Repository y de SOLID, aunque se complementen.',
     '“No hacemos que la revisión sea una base de datos; la revisión usa un repositorio que recibe al construirse”.'),
    ('Boy Scout Rule - mejoras acotadas con regresión',
     'Dejar el área intervenida en mejor estado mediante correcciones pequeñas y justificadas. No convertir una entrega en una reescritura completa ni tocar código correcto para aparentar más trabajo.',
     'En esta revisión se corrigieron la comparación decimal, suma de céntimos, fechas imposibles, NUL en texto persistido, límites técnicos de 5000, respuesta de ronda inválida y límite HTML de contraseñas Unicode. Se añadió edición de notas de partida y se separó el hook; se mantuvieron hash, sesión y arquitectura existentes.',
     [('backend/test/sprint2-quality.test.ts', "test('S2 calidad"), ('tests/sprint2-quality.test.tsx', "test('S2 calidad"), ('src/features/access/AccessComponents.tsx', 'const htmlLimit')],
     'Mostrar antes/problema/después con un caso reproducible: importe válido alto, 31/02, nota NUL o contraseña con emoji. Ejecutar la regresión y explicar qué decisión no cambió. Las notas de presupuesto ya existían en el contrato; se hicieron editables.',
     '5000 es límite técnico de entrada, no aprobación del cliente sobre el tamaño del contenido. No se prometen validaciones perfectas para toda futura funcionalidad ni seguridad absoluta. El límite de contraseñas HTML permite hasta dos unidades UTF-16 por punto; la validación sigue rechazando más de 128 puntos de código.',
     '“Mejoramos fallos observables y su evidencia sin rehacer el proyecto ni inventar reglas pendientes”.'),
]

def method_pages():
    pages = [[Spacer(1, 28), p('BROTAR', 'title'), p('Principios, patrones y defensa técnica\nAplicación en el Sprint 2', 'h1'),
        p('Informe académico para docente y equipo. Ricardo, Alison y Santiago. Corte local 05-10-2026, rama RicardoDev. Se agrupan los ejemplos por concepto para localizar qué se usó, dónde, por qué y cómo defenderlo.'),
        *section('Tesis del informe', 'La calidad se demuestra mediante decisiones concretas, contratos y pruebas, no con una lista de siglas. Se conservó la arquitectura del Sprint 1 y se refactorizó únicamente donde hubo un beneficio verificable. Un patrón no se añade solo para cumplir una rúbrica.'),
        *section('Qué es cada cosa', 'TypeScript es el lenguaje. POO, funciones puras, interfaz declarativa y asincronía son formas de programación utilizadas. SOLID, KISS, DRY, YAGNI y Boy Scout orientan diseño/mantenimiento. Repository y Adapter son patrones; transacciones son mecanismos de consistencia. Scrum/sprints organizan el trabajo, no son patrones de código.'),
        *section('Organización del documento', 'Arquitectura y paradigmas; KISS; DRY; YAGNI; S, O, L, I y D de SOLID; IoC/DI y composición; Boy Scout; patrones Repository/Adapter y consistencia transaccional; validación/seguridad; pruebas, defensa y referencias.'),
        *section('Cautelas', 'Los ejemplos se sostienen en código local y pruebas. Los anclajes de línea se verifican al generar; buscar el símbolo si luego cambia el archivo. No se afirma que todo Brotar sea SOLID perfecto ni que un cambio de base o una nueva regla sea gratis. No hay commit/push de este corte ni aceptación externa.'),
        p('276 pruebas aprobadas (130 frontend, 128 backend, 18 PostgreSQL). Incluyen regresión de Sprint 1; no equivalen a historias cerradas ni a una certificación absoluta de seguridad.', 'small')]]
    pages.append([p('01. Arquitectura y paradigmas en uso', 'h1'),
        table([['Unidad', 'Responsabilidad', 'No debe decidir'], ['Vista React', 'Controles, mensajes, acciones visibles', 'Autorización definitiva / SQL'], ['Hook / cliente', 'Estado, solicitudes y contratos', 'Roles confiados desde formulario'], ['Controlador HTTP', 'DTO, sesión, rol, respuesta', 'Texto SQL del caso de uso'], ['Aplicación', 'Coordinar operación mediante puertos', 'DDL / detalles de Express'], ['Dominio', 'Reglas puras y errores del negocio', 'Conexión de red o base'], ['Adaptador TypeORM', 'Consultas y transacciones', 'Reglas comerciales inventadas']], [105, 193, 201]),
        *section('Programación orientada a objetos', 'Casos como AdministrativeReview y adaptadores reúnen operaciones y colaboradores en clases. No se usa POO por obligación en cada función ni se construyen jerarquías de entidades para representar roles.'),
        *section('Funciones y declaración de interfaz', 'validatePlan, validateFunding y missingForSubmission reciben datos y producen resultados sin red. React declara la interfaz a partir de estado/props. No se afirma programación funcional estricta: el proyecto combina estilos y efectos explícitos.'),
        *section('Asincronía y consistencia', 'async/await espera la API y la base sin bloquear la interfaz. Promise.all carga secciones independientes. Las lecturas administrativas coherentes usan el mismo manager secuencialmente y REPEATABLE READ. Asincronía por sí sola no garantiza atomicidad ni evita carreras.'),
        ref('backend/src/campaigns/infrastructure/typeorm-administrative.repository.ts', "transaction('REPEATABLE READ'"),
        ref('backend/src/campaigns/domain/submission.ts', 'export function missingForSubmission'),
        p('Ejemplo para seguir en la defensa: CampaignSectionsEditor > useCampaignSections > sectionsClient > SectionsController > CampaignSections > TypeormSectionsRepository > PostgreSQL. Una respuesta vuelve por contratos y estado antes de anunciar éxito.', 'small')])
    for index, (title, definition, application, references, demo, limit, answer) in enumerate(METHODS, 2):
        pages.append([p(f'{index:02d}. {title}', 'h1'),
            *section('Concepto y problema que resuelve', definition),
            *section('Dónde y por qué se aplica en Brotar', application),
            p('Ubicación exacta para abrir durante la defensa', 'h2'), *[ref(*r) for r in references],
            *section('Cómo demostrar el beneficio', demo),
            *section('Límite y afirmación que debe evitarse', limit),
            *section('Respuesta breve al docente', answer),
            p('Distinguir conservación y cambio: contratos/capas/transporte ya existían; la extracción del hook y las correcciones de validación se efectuaron en esta revisión. Una guía de principios describe ejemplos representativos, no una certificación de todo el repositorio.', 'small')])
    pages.append([p('12. Patrones adecuados y consistencia', 'h1'),
        *section('Repository: intención de negocio frente a persistencia', 'AdministrativeRepository, SubmissionRepository y PublicCampaignRepository definen operaciones sin SQL. Los adaptadores TypeORM implementan consultas, bloqueos y relaciones. Beneficio: probar coordinación con dobles y concentrar cambios del esquema. TypeORM no sustituye los contratos de negocio; aquí se utilizan además consultas SQL explícitas.'),
        ref('backend/src/campaigns/application/administrative-review.ts', 'export interface AdministrativeRepository'),
        ref('backend/src/campaigns/infrastructure/typeorm-administrative.repository.ts', 'export class TypeormAdministrativeRepository'),
        *section('Adapter: traducir contratos', 'Los repositorios traducen puertos a PostgreSQL; mapPublicCampaign traduce el DTO público a Project usado por tarjetas/detalle, verificando tipos, identidad, importes e imagen. Un 404 o contrato inválido no se rellena con una campaña mock. El adaptador reduce impacto entre formatos distintos.'),
        ref('src/features/public/campaignsApi.ts', 'export function mapPublicCampaign'),
        *section('Transacción y concurrencia: mecanismo, no etiqueta decorativa', 'Una decisión actualiza revisión, observaciones, campaña e historial dentro de una transacción. SELECT FOR UPDATE bloquea campaña y última ronda; expectedRound detecta vista obsoleta. Publicar vuelve a exigir APPROVED y completitud. El trigger oficial produce historial; el repositorio lo enriquece sin duplicarlo.'),
        ref('backend/src/campaigns/infrastructure/typeorm-administrative.repository.ts', 'private async lock'),
        *section('Qué no se presenta como patrón implementado', 'No se afirma Event Sourcing, CQRS completo, máquina de estados genérica ni Unit of Work propio. TypeORM aporta transacciones; separar lecturas/escrituras no prueba por sí solo CQRS. Los parámetros/ports facilitan estrategias de prueba, sin exigir una jerarquía GoF Strategy innecesaria.'),
        p('Prueba de beneficio: dos solicitudes concurrentes producen una transición y un conflicto, no dos rondas/decisiones. Si se desactiva un catálogo antes de aprobar, se rechaza y conserva la revisión pendiente.', 'small')])
    pages.append([p('13. Validaciones y protección verificadas', 'h1'),
        table([['Dato / acción', 'Comportamiento sustentado'], ['Nombres personales', 'Unicode de letras/marcas, separadores permitidos; rechaza números/símbolos no admitidos'], ['Títulos / descripciones', 'Aceptan Ñ, acentos y números; límites por campo; NUL rechazado antes de persistir'], ['Contraseña real', '15-128 puntos de código, no solo espacios; coincidencia exacta; no trim ni normalización'], ['Importes / fechas', 'Positivos, finitos, numeric(14,2), días reales; fecha final coherente'], ['Escrituras privadas', 'Sesión, rol/propiedad, origen/cabecera, UUID/DTO; bloqueos/transacciones'], ['Datos públicos', 'Solo PUBLISHED con imagen pública válida; sin respaldo mock ante error']], [136, 363]),
        *section('Contraseña y sesión: protección existente conservada', 'Scrypt usa sal aleatoria de 16 bytes, N=16384, r=8, p=5 y comparación timingSafeEqual. No se guarda contraseña clara. La sesión es un token opaco aleatorio; su hash queda en la base. Cookie HttpOnly/SameSite Strict; Secure en producción. Caducidad, revocación, límites de solicitudes y origen se verifican en las suites existentes.'),
        ref('backend/src/users/infrastructure/scrypt-password-hasher.ts', 'export class ScryptPasswordHasher'),
        ref('backend/src/auth/infrastructure/http/session-http.ts', 'export function sessionCookieOptions'),
        *section('Unicode no es “corregir la contraseña”', '“Ñ” no se trata como “N”; “é” y “e + acento combinante” no se convierten en la misma contraseña. Los espacios iniciales/finales forman parte del secreto. El hash y el login exactos se probaron. La búsqueda de campañas sí normaliza acentos por conveniencia: no se reutiliza esa normalización para credenciales.'),
        *section('Límites de la protección', 'El medidor de registro informa longitud, no entropía completa. Validación no sustituye autorización y parametrizar SQL no elimina todas las amenazas. Producción necesita HTTPS, secretos/configuración, operación y políticas aprobadas; esta entrega local no se declara auditada integralmente.')])
    pages.append([p('14. Evidencia, defensa y referencias', 'h1'),
        *section('Mapa de pruebas', 'Funciones puras: campañas/secciones/estados y límites. Aplicación: repositorios fake, escritura denegada y bandera. HTTP: DTO anidados, sesión, roles, origen, campos extra y errores. Frontend: transporte, parsers, SSR y paridad de reglas. PostgreSQL: flujo real, rollback, persistencia, carreras, rondas/publicación y migración aislada.'),
        ref('backend/test/architecture.test.ts', "test('BG-58"),
        ref('backend/test/sprint2-quality.test.ts', "test('S2 calidad"),
        ref('tests/sprint2-quality.test.tsx', "test('S2 calidad"),
        *section('Ensayo de defensa: problema > decisión > código > prueba', 'Ejemplo SRP: formulario mezclaba coordinación y marcado > extraer hook > abrir ambos archivos > demostrar carga y guardado. Ejemplo DIP: caso no debe conocer TypeORM > puerto > abrir constructor/factory > prueba con fake. Ejemplo validación: NUL podía provocar fallo de base > rechazo por campo > abrir regla > prueba y conservación de datos.'),
        *section('Preguntas que deben poder contestar', '¿Por qué no se reemplazó fetch por Axios? El transporte común ya satisface el alcance y tiene pruebas; la biblioteca no determina el paradigma ni la calidad. ¿Dónde se ve ISP? Puertos de revisión/envío/catálogo. ¿Dónde se ve LSP? DraftFieldError mantiene status de SessionError. ¿Cambiar de base sería automático? No: se revisan adaptadores, esquema, restricciones y migraciones.'),
        *section('Fuentes conceptuales suministradas', 'SOLID.pdf, DRY.pdf y YAGNI.pdf, Lic. M.Sc. Benjamín H. Buitrago Conde: definiciones y ejemplos de los principios. APUNTES DE PROYECTO DE SISTEMAS II Teams.docx, unidad I, 1.2 y otros principios: KISS, IoC, Boy Scout y composición; apartados de pruebas. Se adaptan los conceptos, no se copia el stack C# del ejemplo.'),
        *section('Fuentes del producto y alcance', 'Tarea Fase 3, módulo de campañas: requisitos, validaciones y exclusiones; README y planificación local; ADR-005; código/tests de los anclajes. La rúbrica suministrada para Sprint 1 orienta la defensa de calidad/SOLID/patrones; no se inventa una nueva ponderación para Sprint 2.'),
        p('Cierre: evidencia técnica local, no aprobación externa ni garantía de ausencia de fallos. La guía de demostración compañera desarrolla las trece tareas y sus checklists. Preparar cuentas autorizadas ficticias; no exponer tokens, .env o datos personales en la presentación.', 'small')])
    return pages

if __name__ == '__main__':
    build('Guia_Demostracion_y_Estudio_Sprint_2_Brotar.pdf', 'Brotar - demostración y estudio del Sprint 2', demonstration_pages())
    build('Informe_Principios_y_Patrones_Sprint_2_Brotar.pdf', 'Brotar - principios, patrones y defensa del Sprint 2', method_pages())
