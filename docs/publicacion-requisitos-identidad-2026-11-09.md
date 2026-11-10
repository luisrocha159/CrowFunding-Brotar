# Publicación: diagnóstico de requisitos de identidad

Actualización local de RicardoDev, 9 de noviembre de 2026.

## Problema y corrección

Una campaña podía estar aprobada y completa, pero no tener una identidad vigente aprobada para su titular. La API respondía con un error de validación y la interfaz mostraba «Revisa el motivo y las observaciones», aunque la operación solicitada era publicar.

Ahora el requisito de identidad o representación incumplido responde HTTP 409 con el código `PUBLICATION_REQUIREMENTS` y un mensaje público que explica qué falta. La interfaz muestra ese motivo. Los errores de revisión y publicación se distinguen; los errores internos inesperados conservan una respuesta genérica y no se exponen literalmente.

No cambian los permisos ni los requisitos. Una publicación rechazada conserva la campaña aprobada y privada; no crea una publicación ni un historial de publicación. No requiere migraciones ni variables nuevas.

## Cómo resolver el requisito

1. Identificar la cuenta creadora en el detalle administrativo de la campaña.
2. Con esa cuenta, completar y enviar la verificación de identidad desde Mi cuenta. Consultar y aceptar las condiciones aplicables y adjuntar los documentos requeridos para este entorno.
3. Con una cuenta autorizada e independiente del titular, revisar el expediente de identidad y aprobarlo si cumple los requisitos. Aprobar la campaña no sustituye esta revisión.
4. Para una campaña de organización también deben estar vigentes las verificaciones de la organización y su representante y su representación activa, sin solicitudes pendientes.
5. Volver a la campaña con el permiso de publicación, pulsar **Actualizar revisión**, **Publicar campaña** y confirmar.

## Comprobación

- Regresión frontend: el motivo de identidad aparece como tal; los errores 400 de publicación no hablan de observaciones; un error 500 no expone su contenido interno.
- Contrato del controlador: requisitos personales, de organización y representación se traducen en conflictos 409 identificables.
- Integración PostgreSQL aislada: una campaña aprobada con identidad caducada queda privada, mantiene su aprobación y no crea historial de publicación. Al restablecer la vigencia de la identidad de la cuenta efímera, la publicación funciona y dos intentos concurrentes producen una sola publicación.
- Verificación visual: respuesta de publicación interceptada únicamente en una pestaña de comprobación para revisar el mensaje sin publicar la campaña real del usuario.

La verificación del entorno de pruebas no equivale a una validación de identidad comercial ni habilita cobros reales.

Resultado del corte: `bun run check` correcto (280 pruebas frontend); `corepack pnpm run check` correcto (248 pruebas backend y 8 del aprovisionamiento local); recorrido de integración PostgreSQL completo correcto (1 prueba con aprobación, bloqueo por identidad caducada, publicación concurrente y persistencia tras reiniciar). Backend y frontend originales responden HTTP 200 y su contenedor PostgreSQL permanece saludable. La base aislada de comprobación quedó detenida.
