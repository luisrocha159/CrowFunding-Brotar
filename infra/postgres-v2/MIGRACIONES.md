# Control de cambios de PostgreSQL

## Línea base registrada

`baseline.json` identifica por SHA-256 el SQL oficial instalado, el inventario esperado y el ajuste de permisos E07. La API conserva `synchronize=false`, `dropSchema=false` y `migrationsRun=false`. El instalador solo acepta una base vacía; nunca aplicar el SQL inicial sobre datos existentes.

El proyecto todavía no ha aplicado migraciones de esquema propias. Adoptar V2 fue una restauración nueva aislada, no una migración ni un traslado de los datos de V1. El archivo original y los backups con datos se reciben y conservan fuera de Git.

Comprobación de solo lectura, desde `backend`: `node scripts/verify-provisional-v2.mjs`. Comprueba inventario, mapeo relevante, default de usuario y privilegios limitados; no certifica todas las definiciones del esquema ni migra nada.

## Procedimiento antes de cada cambio futuro

1. Identificar la versión de origen, el cambio solicitado, su aprobación y los criterios que lo requieren. Comparar definiciones, no solo cantidad de tablas.
2. Respaldar la base y ensayar su restauración en una base aislada. No usar datos personales sin autorización; sanitizar cuando sea necesario. No sobrescribir el volumen de trabajo.
3. Preparar una migración incremental con identificador y checksum, precondiciones, pasos y procedimiento de recuperación. La API usa un rol limitado; la migración se ejecuta como operación administrativa separada y revisada.
4. Probarla en la copia aislada. Revisar datos antes/después, restricciones, secuencias, vistas, triggers, funciones, roles y privilegios. Usar transacción si las operaciones lo admiten y documentar las que no.
5. Ejecutar las suites de integración contra la copia; ensayar recuperación y registrar comandos, resultados y evidencia sin secretos. No suponer que `down` puede recuperar datos eliminados.
6. Solo con revisión y autorización, programar la aplicación al entorno de trabajo. Registrar la versión efectiva y comprobar compatibilidad de frontend/API. No actualizar el manifiesto únicamente para silenciar un fallo de verificación.

## Pendiente de BG-59

Este procedimiento y la línea base ya están documentados. Falta implementar y ensayar el mecanismo de migraciones incrementales y recuperación sobre una copia aislada antes de cerrar la historia completa. No se inventa un cambio de esquema solo para marcarla terminada. Las pruebas actuales acreditan restauración, lectura, escritura, rollback y reconexión, no ese ensayo de migración.
