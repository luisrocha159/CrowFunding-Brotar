# Publicación administrativa provisional de campañas

Fecha: 05/10/2026. Estado: autorizado provisionalmente por Ricardo para esta entrega local; pendiente de confirmación definitiva de líderes/cliente. Decisión relacionada: D05. La provisión de roles D06 permanece separada.

## Contexto

La tarea oficial de Fase 3 exige revisión administrativa y estados distintos de aprobada/publicada, con acceso público solo a publicaciones. No identifica quién inicia la publicación. No se debe interpretar aprobar como publicar automáticamente ni conceder privilegios por el registro público.

## Decisión autorizada

El responsable confirmó «Sí, administrador provisionalmente» a la propuesta de que solo ADMIN publique una campaña aprobada, en una acción separada. Se habilita este comportamiento para la demostración del Sprint 2, sin presentarlo como regla definitiva del producto.

La API requiere sesión y rol ADMIN vigentes, aprobación de la última ronda, campaña completa, `expectedRound` coincidente y confirmación explícita. La publicación registra actor/fecha e historial bajo transacción y hace visible la campaña en la API pública. CREATOR no publica; APPROVED permanece privada. No hay nueva asignación de roles ni bypass de verificación.

## Configuración

`CAMPAIGN_ADMIN_PUBLICATION_ENABLED=true` habilita la acción. Ausencia o `false` la bloquean; otros valores se rechazan. La instalación nueva genera true conforme a esta decisión, conservando una configuración previa explícita. Una instalación existente debe añadir/ajustar solo esa variable en `backend/.env` y reiniciar, sin sobrescribir credenciales ni restituir la base. `.env` no se versiona.

## Alternativas y consecuencias

No se eligió publicación automática al aprobar porque ocultaría la distinción de estados. Publicación por creador requiere acuerdo futuro y cambios coordinados de permisos/UI, por lo que no se habilita implícitamente. El interruptor permite detener nuevas publicaciones sin borrar las ya publicadas; no es una operación de despublicación.

Los líderes deben confirmar el actor definitivo, condiciones adicionales y provisión de roles. Cambiar esta decisión requerirá revisar contratos, permisos y pruebas; no justifica cerrar D05 definitivamente ni D06. Se verificaron configuración deshabilitada, permisos, ronda obsoleta, concurrencia, aprobación privada, publicación y consulta anónima. Ver [evidencia del Sprint 2](../cierre-tecnico-sprint-2-2026-10-05.md).
