# Plantilla de revisión de un cambio

Copiar el contenido de esta plantilla en el Pull Request o en el registro de revisión del proyecto. Sustituir los campos entre corchetes y eliminar las instrucciones que no apliquen. No incluir contraseñas, tokens ni datos personales de prueba.

## Problema y resultado

- Problema observado: [situación concreta antes del cambio].
- Resultado esperado: [comportamiento o documentación después del cambio].
- Requisito o incidencia: [enlace o identificador, si existe].

## Alcance

- Rama de origen: [rama de trabajo].
- Rama de destino: [rama de integración del equipo].
- Archivos principales: [rutas].
- Decisiones pendientes: [decisiones reales o ninguna].

## Verificación

| Comando o recorrido | Resultado esperado | Resultado obtenido | Evidencia |
| --- | --- | --- | --- |
| [comando reproducible] | [expectativa] | [resultado real o no ejecutado] | [enlace o registro] |

Si hay cambios de código, añadir un caso normal y al menos un caso límite pertinente. Para documentación, comprobar los enlaces locales y la coherencia de instrucciones y versiones.

## Seguridad y compatibilidad

- ¿Se revisó el diff para evitar publicar secretos? [resultado y alcance].
- ¿Cambia configuración, dependencias o datos? [explicación].
- ¿Qué pasos necesita quien actualice el proyecto? [pasos o no aplica].

## Revisión humana

- Autor: [cuenta del autor].
- Revisor solicitado: [cuenta distinta del autor].
- Observaciones recibidas: [enlace y resumen; pendiente si no existe revisión].
- Correcciones: [commit y explicación; pendiente si corresponde].
- Decisión de integración: [pendiente, cambios solicitados o aprobación real].

Solicitar revisión no equivale a recibirla. No marcar como aprobada una revisión que todavía no ocurrió.
