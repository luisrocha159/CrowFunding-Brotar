# Devoluciones: saldo restante, evidencias y navegación

Corte local en RicardoDev, 9 de noviembre de 2026. Implementa la solicitud de Ricardo sobre cancelación, devoluciones previas, presentación y archivos de respaldo. El procesamiento económico sigue siendo interno y simulado; no hay integración bancaria ni se envían transferencias reales. Este ajuste no se ha publicado en GitHub.

## Reglas de negocio

1. Solicitar una cancelación suspende nuevas reservas, pero no devuelve fondos por sí solo. El administrador independiente debe confirmar la cancelación.
2. Al confirmarla, se procesan automáticamente los pagos del proveedor interno con confirmación histórica. También ocurre al finalizar una campaña todo o nada con resultado de meta no alcanzada y obligación de devolver.
3. Por pago se conserva lo ya devuelto, se completan en su mismo registro las solicitudes internas abiertas y se genera únicamente la devolución que falta. Por ejemplo: aporte 100 BOB, 30 completados y 20 solicitados: se completan esos 20 y se crea una devolución adicional de 50; total acumulado 100.
4. Una solicitud rechazada o fallida no descuenta el pago. Una autorización manual reserva el importe; completar confirma la devolución y actualiza el aporte y el pago. Se conservan fecha y referencia de confirmación originales.
5. Cancelación, devolución y auditoría se confirman en una transacción. Los bloqueos global, de campaña, pago y solicitud impiden ejecutar dos veces el mismo saldo. Reintentar con la misma clave devuelve el resultado existente; una clave nueva tampoco permite devolver más de lo pagado.
6. Las disputas/retenciones sin resolver y devoluciones externas abiertas impiden automatizar. Los desembolsos comprometidos deben resolverse primero. Cuando ya se desembolsó dinero, se conserva el escalamiento a Soporte: no se inventan fondos ni se afirma que la campaña esté cancelada y reembolsada.
7. Administración dispone de **Procesar devoluciones restantes**, exclusivamente para una campaña ya cancelada o terminada con obligación de devolución. Permite recuperar registros anteriores a esta funcionalidad. Consultar una pantalla nunca ejecuta un reembolso.
8. En esas campañas no se presentan solicitudes manuales por cancelación ni se permite eludirlo eligiendo «Otro motivo». Las devoluciones manuales siguen disponibles para causas justificadas en pagos propios confirmados, con saldo, sin solicitud activa y con capacidad financiera. «Problema con recompensa» solo corresponde a un aporte con recompensa asociada.

## Experiencia del aportante

Desde **Mis aportes → Detalle del aporte → Solicitar devolución**, el formulario consulta un saldo privado y muestra cuatro tarjetas: aporte original, ya devuelto, en trámite y saldo disponible. Este último descuenta las devoluciones completadas y las reservas del mismo pago; los compromisos de la campaña se validan por separado. No es un saldo bancario.

Se preselecciona el saldo completo. La casilla **Solicitar una devolución parcial** permite indicar otro importe positivo, con hasta dos decimales y sin superar el saldo. El servidor vuelve a comprobarlo bajo bloqueo al enviar. Una solicitud activa muestra un acceso a su seguimiento. **Actualizar saldo** permite recargar sin reenviar una operación incierta.

La lista y el detalle usan importes destacados, estados, etapas y motivos en español. El detalle explica qué falta y presenta el historial por orden. Los identificadores técnicos y la referencia de resultado quedan en un desplegable. No se confunde una solicitud con una devolución completada.

## Archivos privados

- Adjuntos opcionales: hasta 10 archivos; PDF, PNG, JPG o WebP; máximo 5 MB por archivo. Se verifican tamaño, MIME y firma básica del contenido en el backend.
- La interfaz muestra progreso, nombre, tamaño, errores y opción de quitar un adjunto antes de enviar. Una subida fallida no se vincula silenciosamente a la solicitud.
- Se reutiliza el propósito privado SUPPORT_EVIDENCE. La migración **RefundEvidence1794182400001** crea exclusivamente la relación inmutable entre solicitud y archivo, con orden y restricciones. No modifica los importes de devoluciones existentes.
- Al enviar, cada archivo debe existir, pertenecer al solicitante, ser privado, tener el propósito correcto y no estar eliminado. Se rechazan identificadores repetidos, inexistentes o de otras cuentas. Los adjuntos forman parte de la clave de contenido del reintento.
- Solo el propietario de la devolución y las cuentas con permiso vigente finance.read pueden consultar los archivos mediante rutas autorizadas por solicitud. Cada descarga privada registra auditoría READ, usa no-store, nosniff y descarga como adjunto.
- Un archivo vinculado no puede borrarse con el endpoint general. La API no concede UPDATE ni DELETE sobre la relación de evidencias. La evidencia no se vuelve pública ni se elimina automáticamente con esta actualización.
- La comprobación de firma es básica; no equivale a análisis antivirus ni a validar la veracidad de un documento.

## Separación de navegación

En **Administración → Devoluciones**, el enlace de la barra es **Panel de finanzas**, que dirige a /administracion/finanzas. No dirige a aportes personales. En **Mis devoluciones**, el acceso **Mis aportes** se conserva. Este cambio no concede ni revoca roles y mantiene las restricciones de operación propia, permiso vigente y Auditor de solo lectura.

## Actualizar una instalación existente

Desde la raíz del repositorio:

```powershell
bun install --frozen-lockfile
cd backend
corepack pnpm install --frozen-lockfile
corepack pnpm run build
node scripts/migrate.mjs up
node scripts/migrate.mjs status
corepack pnpm run dev
```

En otra terminal, desde la raíz:

```powershell
bun run dev
```

Requiere el PostgreSQL de infra/postgres-v2 operativo y las configuraciones privadas ya descritas en el README. El inventario actual es de **42 migraciones y 218 rutas HTTP**. No se requiere una nueva variable de correo ni una clave bancaria. Para una instalación nueva se sigue el README desde el inicio; su migración automática incluye esta tabla.

La migración no ejecuta devoluciones sobre datos anteriores. Su recuperación requiere una decisión administrativa explícita mediante el ciclo de campaña. No se ofrece una reversión automática que elimine evidencias financieras.

## Recorrido manual sugerido

1. En una cuenta aportante, abrir un aporte confirmado sin solicitudes activas. Comprobar el importe original, lo devuelto, lo reservado y el saldo.
2. Verificar que el importe total venga seleccionado y que solo se pueda editar al elegir parcial. Probar cero, importe superior, texto, exponentes y más de dos decimales.
3. Seleccionar una causa y escribir una explicación de 20–500 caracteres. No se acepta solo espacios ni caracteres de control invisibles.
4. Adjuntar un PDF o imagen válido, quitarlo o conservarlo y confirmar. Comprobar el estado Solicitada y la descarga privada del archivo. Usar datos de prueba propios, nunca documentación personal real.
5. Con FINANCE independiente, entrar a Administración → Devoluciones. Confirmar que Panel de finanzas lleva al panel laboral. Abrir la solicitud, revisar motivo y evidencia y autorizar. Aún no debe figurar como devuelta.
6. Completar desde Finanzas, actualizar la cuenta aportante y comprobar que se descuenta exactamente ese importe. Una devolución parcial deja disponible únicamente la diferencia.
7. En una campaña distinta con pagos confirmados, solicitar cancelación como creador. No debe devolver por la mera solicitud. Confirmarla con ADMIN independiente; comprobar devolución automática, pago/aporte actualizados e historial.
8. Repetir con una devolución previa y otra abierta. Verificar que no se duplican ni se excede el importe original. Repetir el procesamiento administrativo y comprobar que el total permanece igual.
9. Probar una disputa pendiente o un desembolso comprometido. La operación debe bloquearse o escalar según el caso, sin registrar fondos como devueltos indebidamente.
10. Comprobar como otra cuenta que el saldo, solicitud y evidencias ajenas no son accesibles. El navegador sin sesión tampoco puede consultarlos.

## Evidencia técnica

Se amplían las pruebas de refunds.integration.test.ts y campaign-cycle-disbursements.integration.test.ts con HTTP real y PostgreSQL aislado: saldo y reservas, privacidad, archivos, borrado bloqueado, importes parciales, recuperación histórica, reintentos concurrentes y cancelación atómica ante disputas. Se ejecutan además las regresiones de disputas y migraciones, los controles completos de frontend/backend y el inventario de contratos HTTP. Las operaciones económicas de estas pruebas no se ejecutan sobre la base que Ricardo utiliza para su revisión manual.


### Resultado del corte local

| Comprobación | Resultado |
| --- | --- |
| Frontend: lint, tipos, pruebas y build | Correcto; 275 pruebas |
| Backend: lint, tipos, pruebas y build | Correcto; 245 pruebas y 8 del administrador local |
| Integración PostgreSQL/HTTP aislada | 6 pruebas correctas: ciclo/desembolsos, devoluciones/evidencias, disputas y migraciones |
| Contratos HTTP | 218 rutas, sin duplicados y con autorización declarada |
| Instalación actual | 42 migraciones aplicadas; ninguna pendiente |
| Interfaz de devolución y detalle administrativo | Revisados a 1440 px y 390 px; sin desbordamiento horizontal |
| Accesibilidad automática de las vistas revisadas | Sin infracciones detectadas de WCAG A/AA/2.1 AA; no sustituye evaluación manual integral |
| Servicios originales | PostgreSQL saludable; API y frontend responden HTTP 200 |
| Publicación de esta modificación | Pendiente; cambios locales en RicardoDev |

El build de frontend conserva el aviso de tamaño de bundle superior a 500 kB; no impidió compilar. Los fallos de operación se presentan como errores y nunca se sustituyen por una confirmación ficticia. Se conserva el entorno económico simulado.
