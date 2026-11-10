# Paquete reproducible para revisión de líderes

Solicitud y destino: 9 de noviembre de 2026, autorización expresa para publicar en DEV después de comprobar. Conservar el trabajo de RicardoDev y los datos originales. No exportar la base personal ni credenciales SMTP.

## Resultado requerido

- Instalador de revisión desde una copia nueva, con Docker PostgreSQL V2, dependencias, esquema, migraciones y cinco categorías.
- Dataset sintético explícito separado de las migraciones del esquema: todos los roles, cuentas de organización y estados negativos, campañas y operaciones utilizables.
- Credenciales públicas exclusivas de prueba, dominio brotar.test; contraseña identificable con sufijo 1234567890 y longitud válida.
- Sembrado en una instalación dedicada y local; comprobación de proyecto/puerto/versión. No alterar usuarios existentes o roles en una instalación ordinaria.
- Ejecución repetida de la preparación completada sin duplicación ni restablecimiento de avances. Fallo o carga incompleta deben explicarse y no presentarse como éxito.
- Correo en buzón privado de revisión para tokens y avisos de cuentas sintéticas, opt-in y denegado en producción. No enviar a Gmail ni incluir su contraseña.
- Campañas separadas para borrador, revisión, aprobación/publicación, donación/recompensa/preventa, vencimiento, cancelación, ejecución/desembolso, rendición/cierre; aportes con distintos estados; soporte, disputas, devoluciones y conciliación.
- Manual PDF y editable con instalación, cuentas, escenario inicial, rutas y acciones exactas, resultados y validaciones negativas. Visitante significa sin sesión, sin credencial inventada.
- Verificación desde copia limpia, migraciones, datos, archivos, sesiones, permisos, integraciones y UI. No declarar certificación de producción.
- Publicación de código y documentación comprobados en DEV, sin force push y sin datos privados; confirmar el commit remoto final.

## Decisiones de implementación

Usar los casos de uso y HTTP existentes para crear estados operativos; los permisos iniciales de cuentas sintéticas y ajustes de fechas históricos se aprovisionan explícitamente como fixtures. El manifiesto identifica cada preparación. La interfaz de uso y la seguridad ordinaria se conservan. El instalador y las pruebas usan un proyecto Docker separado de la presentación original.

## Estado

Preparación en curso. Este plan no constituye evidencia de pruebas aprobadas ni de publicación.


## Resultado de ejecución

- Implementados preparador dedicado, datos sintéticos idempotentes y buzón privado de revisión.
- Última copia sin configuración previa: setup completo con 43 migraciones, 18 cuentas y 20 escenarios. Segunda ejecución conservó datos sin duplicación.
- Verificación HTTP/PG: 139 comprobaciones y 35 archivos íntegros. Canal de correo: 13 comprobaciones HTTP, tokens de un uso y revocación.
- Manual de 27 páginas en PDF y DOCX, fuente Markdown y CSV de credenciales públicas.
- Checks frontend y backend aprobados. La batería de integración adicional no quedó íntegramente en verde; detalles y limitaciones en docs/revision-lideres/Comprobaciones.md.
- Publicación a DEV autorizada expresamente por Ricardo. La revisión humana de líderes no se da por realizada.
