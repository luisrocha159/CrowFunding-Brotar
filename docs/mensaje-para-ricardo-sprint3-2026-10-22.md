# Mensaje para Ricardo — definiciones pendientes de Sprint 3

Hola, Ricardo. Ya completamos todo el alcance técnico que podía implementarse sin cerrar las reglas de negocio pendientes. Para terminar las **11 tareas parciales** y la **1 bloqueada** de los Sprint 2 y 3 asignadas a Santiago y Alison, necesitamos que nos confirmes o entregues lo siguiente:

## 1. KYC, KYB y texto legal

Relacionado con **S1-11 (bloqueada)** y con las tareas parciales **S2-06, S2-07, S2-09, S3-12, S3-13 y S3-14**.

- Texto legal aprobado para personas y organizaciones.
- Versión, fecha de vigencia y responsable de aprobación de cada texto.
- Campos y documentos obligatorios para KYC y KYB, diferenciados por tipo de perfil y país si corresponde.
- Metadatos que deben conservarse por documento: tipo, emisor, fecha de emisión, vencimiento y cualquier otro dato requerido.
- Forma de registrar el consentimiento y la aceptación del texto legal.
- Política de acceso, conservación y eliminación de documentos.
- Datos requeridos para las cuentas de destino y reglas de validación, cifrado y acceso.

El sistema ya permite configurar tipos de documentos y capturar solicitudes, pero no podemos convertir ejemplos en reglas definitivas sin esta aprobación.

## 2. Representación, miembros y administración

Relacionado con **S2-06, S2-07, S2-09, S3-12, S3-13 y S3-14**.

- Quién puede invitar o retirar miembros de una organización.
- Quién puede cambiar al representante legal.
- Qué perfiles pueden modificar datos de otras personas u organizaciones.
- Quién puede restringir o rehabilitar una cuenta y bajo qué causales.
- Qué combinaciones de roles están permitidas.
- Qué ocurre con una verificación ya aprobada cuando cambia el representante, un miembro o un dato sensible.
- Contratos funcionales para integrar las tareas generales **S2-08, S3-16 y S3-26** con estos flujos.

## 3. Apoyos, pagos y recompensas

Relacionado con **S2-18** y con la integración necesaria para cerrar los flujos financieros.

- Proveedor de pagos y entorno que se utilizará.
- Moneda o monedas, costos y montos mínimos.
- Reglas de cupos, reserva y liberación de recompensas.
- Modalidades de aporte admitidas.
- Estados y transiciones del pago, incluidos rechazo, vencimiento, devolución y contracargo.
- Fuente oficial que confirma cada pago: webhook, conciliación u otro mecanismo.
- Contratos de integración de **S2-19, S3-01 y S3-02**.

La simulación actual está aislada y sirve para pruebas; debe mantenerse separada del dinero real hasta recibir estas definiciones.

## 4. Avances, ejecución y rendición

Relacionado con **S3-24** y con las reglas que condicionan el cierre operativo del sprint.

- Estados de cumplimiento de recompensas.
- Quién puede publicar, corregir y aprobar avances.
- Tipos de gastos admitidos y evidencias requeridas.
- Períodos de rendición y flujo de aprobación o rechazo.
- Tratamiento de variaciones de presupuesto.
- Reglas de cierre y cancelación de campañas.
- Datos requeridos para registrar y autorizar desembolsos.
- Definición de las pantallas de captura y aprobación solicitadas en **BG52**.

## 5. Soporte, casos y alertas

Relacionado con **S3-10 y S3-25**.

- Si una persona sin aporte puede reportar una campaña y en qué situaciones.
- Categorías oficiales de casos e incidencias.
- Plazos de atención y reglas de escalamiento.
- Responsables que pueden consultar, asignar y resolver cada tipo de caso.
- Eventos que generan alertas, destinatarios, prioridad y canales.
- Contrato de integración con **S3-11**.

## 6. Parámetros del sistema

Relacionado con **S3-17**.

- Lista aprobada de claves de configuración.
- Valor inicial y tipo de dato de cada clave.
- Límites y validaciones permitidas.
- Roles autorizados para consultar o modificar cada parámetro.

La lista `AGREED_SETTINGS` se dejó vacía de forma intencional hasta recibir esta aprobación.

Para cada decisión necesitamos, por favor, la **fuente o documento de respaldo, responsable, versión/fecha y criterio de aceptación**. Con eso podremos sustituir las reglas provisionales, completar las integraciones y cerrar formalmente las 12 tarjetas.

El detalle técnico y el estado de cada tarjeta están en `docs/entrega-sprint3-santiago-alison-2026-10-22.md`.
