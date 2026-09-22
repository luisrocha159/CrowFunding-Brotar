# ADR-002 · Acceso básico independiente de la verificación

Fecha: 16/09/2026. Estado: aprobado por el responsable de esta implementación en la conversación. No se atribuye a coordinación ni al cliente como regla global definitiva.

## Evidencia y corrección

La guía general, secciones 5.4 y 6.2, contempla niveles de confianza y registro/acceso, pero no impone verificar antes del primer login. La sección 6.4 sí exige las verificaciones aplicables antes de publicar una campaña. El documento de experiencia pública, páginas 5–6, contempla confirmación de cuenta creada y paso al inicio o login, sin definir activación por enlace, código o administrador. La tarea de integración exige registro, login, perfil y organizaciones sin añadir esa activación.

El SQL provisional crea cuentas `PENDING_VERIFICATION` y contiene campos/tokens de verificación. Esto no constituye una política de bloqueo del login. El bloqueo ACTIVE-only de E05–E08 fue una precaución local, no una exigencia documental; esta decisión lo sustituye.

## Política implementada

- `ACTIVE` y `PENDING_VERIFICATION` admiten sesión básica con credenciales válidas.
- Cuentas suspendidas, cerradas, eliminadas o temporalmente bloqueadas no pueden iniciar ni mantener acceso. Estados desconocidos tampoco se admiten.
- No se cambia el estado del usuario al iniciar sesión, editar su perfil o registrar una organización. No se rellenan fechas de verificación ni se modifican el SQL oficial o sus valores por defecto.
- Acceso básico incluye perfil propio, roles vigentes y organizaciones propias en borrador con `REGISTERED_USER` vigente. La sesión no concede roles, verificaciones ni permisos adicionales.
- El perfil de uso elegido en el registro público (Usuario, Creador u Organización) orienta el recorrido inicial y el texto mostrado. No se envía como rol interno ni sustituye requisitos futuros de revisión, KYC o KYB.
- La pantalla de cuenta indica el estado pendiente; registro ofrece ir al login, sin iniciar sesión automáticamente ni afirmar que se envió un correo.
- La recuperación de contraseña puede emitir y consumir tokens `PASSWORD_RESET` de un solo uso para cuentas con acceso básico. Mientras no exista remitente de correo autorizado, la interfaz no afirma envíos; el enlace local solo puede exponerse en desarrollo/pruebas con `PASSWORD_RESET_LOCAL_LINK=true`.
- No se habilitan campañas, aportes ni pagos. Sus requisitos deben comprobarse por operación cuando se implementen. No debe reutilizarse esta política de acceso básico como permiso de publicación o pago. El requisito de verificación para donar sigue por confirmar.

## Verificación y límites

Pruebas unitarias de los dos estados admitidos y estados excluidos; contrato frontend que conserva el estado pendiente; pruebas reales de registro → login → rol básico → organización DRAFT sin activación manual; lectura/edición del perfil pendiente; persistencia sin marcar correo/teléfono verificados; controles existentes de cierre, expiración, aislamiento y roles conservados.

No se migran ni activan cuentas existentes. Las cuentas antiguas sin rol básico siguen necesitando regularización revisada, no asignación silenciosa. El flujo definitivo de correo/teléfono, KYC/KYB y recuperación real queda para su etapa correspondiente. No bloquea el acceso básico de esta entrega.
