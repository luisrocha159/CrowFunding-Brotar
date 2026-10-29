# ADR-016 · Condiciones propias del MVP académico

**Fecha:** 28/10/2026. **Versión:** 1.0. **Responsable de la decisión:** Ricardo, por autorización expresa en esta conversación para resolver S1-11, S2-06 y S2-07 con criterio del equipo. **Estado:** acuerdo interno provisional, implementado y sujeto a sus pruebas de cierre. No se atribuye aprobación al cliente, líderes, abogado, autoridad, banco ni Google.

## Decisión y alcance

Se adopta `mvp-demo-legal-1.0-20261028`: condiciones de participación, aviso de privacidad y requisitos de identidad/organización/destino sintéticos. Publicación completa, consultable sin sesión, con contenido y hash inmutables; textos exportables desde la misma fuente de la API. La aceptación básica comprende TERMS/PRIVACY; enviar un expediente confirma además IDENTITY y la política concreta del caso. No es una aceptación publicitaria ni consentimiento para publicar documentos.

La mayoría de edad se declara al aceptar; no se afirma haber comprobado edad real. Correo y datos básicos propios del participante pueden ser reales y voluntarios. Documentos de identidad, datos institucionales de verificación y destinos son sintéticos; las operaciones económicas son exclusivamente DEMO. Se conserva la matriz de permisos y la separación de interesado, revisor, aprobador y operador. Ninguna aceptación concede roles, verifica identidad, activa una cuenta, publica una campaña o mueve fondos.

El responsable interno del ensayo es el equipo de Proyecto de Sistemas II que figura en los textos. No se inventa sociedad comercial, domicilio, número de registro ni autorización de intermediación financiera. Se mantiene el acceso controlado del ensayo; abrir un servicio comercial exige definir esos datos y revisar sus reglas/textos específicos antes de operar.

## Evidencia y compatibilidad

La migración 40 añade `legal_bundle` y `legal_acceptance` en el esquema de extensiones. Guarda la publicación exacta y su SHA-256, y no crea aceptaciones para usuarios existentes. Cuenta, rol básico y recibo se insertan en la misma transacción del registro. Las cuentas previas leen y aceptan desde Mi cuenta. Cada nuevo envío/reenvío de expediente exige la aceptación general vigente y su confirmación específica, y registra actor, fecha del servidor, caso y versión de política de forma atómica.

No se editan las políticas KYC/KYB sintéticas ni se invalidan sus aprobaciones históricas por publicar este suplemento. Los consentimientos históricos se conservan como históricos, sin presentarlos como aceptación nueva. La app no puede actualizar/eliminar directamente publicaciones o recibos. La eliminación controlada de un usuario/expediente padre elimina sus recibos asociados por integridad referencial; no existe una ruta pública de borrado integral. No es una promesa de conservación perpetua ni un mecanismo de borrado automático.

El campo histórico `app_user.accepted_terms_at` permanece intacto: carece de versión/hash y no se reutiliza para inventar evidencia. El registro versionado es `legal_acceptance`. Los metadatos de creación se auditan sin copiar contraseñas, documentos ni texto del consentimiento al log.

## Requisitos concretos conservados

| Caso | Campos ficticios | Archivos sintéticos obligatorios |
| --- | --- | --- |
| KYC_IDENTITY | Nombre e identificador, prefijo DEMO/PRUEBA y límites de la política | Identidad sintética |
| KYB_LEGAL | Organización y registro ficticios | Registro/constitución y respaldo tributario/no aplicabilidad |
| KYB_REPRESENTATIVE | Representante e identificador ficticios | Autorización de representación |

Hasta 5 MB por PDF/PNG/JPG/WebP, propósito verificación y acceso privado. Los catálogos y la política activa de PostgreSQL determinan los requisitos. La política sintética predeterminada limita los campos a 150 caracteres; no se solicitan número/documento real ni biometría. El representante conserva sus exigencias de vínculo vigente/KYC y aprobación independiente. El destino exige titular/referencia ficticios, moneda compatible, revisión FINANCE, versión e invalidación ante cambios, como en ADR-012/013.

## Privacidad y conservación operativa

Solicitud mediante Mis incidencias/Soporte, categoría Otro, asunto Privacidad, sin datos reales sensibles adjuntos. Para quien no pueda entrar, el responsable de la instalación que lo invitó al ensayo debe tramitarla por el canal del equipo. Se verifica titularidad sin pedir contraseñas y se registra decisión y explicación; no se promete una eliminación instantánea de relaciones o evidencias.

Revisión manual de minimización al menos cada 30 días y al terminar el ensayo; backups privados con revisión/rotación manual de 30 días, salvo incidente justificado. Auditoría detallada: criterio interno existente de 12 meses y retención por casos/obligaciones activos. No se atribuyen esos períodos a una obligación legal ni se anuncia un cron de purga inexistente. El operador debe documentar qué conservó, restringió, anonimizó o eliminó; verificar restaurabilidad y permisos antes de eliminar cualquier copia. La app actual no implementa borrado integral automático.

Gmail procesa únicamente destinatario/contenido operativo cuando está configurado; credencial privada fuera de Git. La preferencia de mensajes opcionales se administra aparte. Avisos internos, envío SMTP, lectura del mensaje y validación del enlace son hechos diferentes.

## Fuentes consultadas y límites

- [Constitución Política del Estado, arts. 21 y 130–131, SENAPI](https://www.senapi.gob.bo/normativas/constitucion-politica-del-estado/constitucion-politica-del-estado-plurinacional-de-bolivia): privacidad y mecanismos relativos a información registrada.
- [DS 1793, art. 56, copia oficial ATT](https://w2.att.gob.bo/sites/default/files/archivos_listados_pdf/2025-09-17/DS%20N%C2%B0%201793%20-%20Reglamento%20a%20la%20Ley%20N%C2%B0%20164%20Desarrollo%20TICs.pdf): información previa, finalidades, consentimiento y medidas para el tratamiento de datos.

Consultadas el 28/10/2026 como referencias para las decisiones internas. Los textos son redacción propia del equipo, no una transcripción legal ni un dictamen sobre todos los requisitos aplicables. Esta decisión sustituye el bloqueo por ausencia de textos externos **para el alcance provisional del MVP de pruebas**. La preparación para una actividad comercial real sigue sin estar aprobada. El cierre técnico de cada tarea depende de su implementación y evidencia, no de escribir este ADR.
