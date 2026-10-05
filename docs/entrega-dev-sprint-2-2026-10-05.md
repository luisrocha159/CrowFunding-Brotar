# Entrega integrada del Sprint 2 a DEV

## Alcance

Código integrado de las 13 tareas de campañas, validaciones/refactorización, SQL oficial V2 y permisos/migración, tres guías PDF, README e instrucciones de instalación. `main`, las ramas remotas personales y Trello quedan fuera de esta publicación. Los documentos de corte local anteriores se conservan como evidencia histórica; no expresan la aceptación final del cliente.

## Método de verificación de la publicación

Se prepara una copia Git limpia, sin `node_modules`, compilados, `.env`, usuarios ni archivos privados de esta computadora. Dependencias se instalan con lockfiles congelados. Una instancia Compose exclusiva con puerto alternativo se usa para ensayar el procedimiento del README sin tocar el volumen habitual de desarrollo. Instalar, migrar, conceder permisos y activar son pasos distintos.

Esta nota se completará con el resultado de la comprobación antes de publicar la entrega. El incremento todavía requiere revisión/aceptación de los líderes; pruebas aprobadas no constituyen garantía absoluta de ausencia de errores.

## Lo que cada computadora debe generar

- Docker Desktop operativo; infraestructura vigente `infra/postgres-v2`.
- Credenciales locales de PostgreSQL y `backend/.env` mediante `install` y `activate`, nunca copiados del equipo de Ricardo.
- Archivos/subidas y buzón de recuperación locales; no se descargan por Git.
- Para ensayo manual de envío/administración, cuentas ficticias con CREATOR/ADMIN concedidos por el responsable. No hay contraseña administrativa compartida; las pruebas automáticas usan fixtures efímeros aislados.

La publicación por ADMIN continúa bajo D05 provisional. Correo real, textos legales, KYC/KYB, pagos y provisión definitiva de roles D06 no se presentan como resueltos.

## Guías incluidas

- [Tareas, checklists y demostraciones](../output/pdf/Guia_Demostracion_y_Estudio_Sprint_2_Brotar.pdf).
- [Principios, patrones y defensa técnica](../output/pdf/Informe_Principios_y_Patrones_Sprint_2_Brotar.pdf).
- [Tutorial de siete flujos de inicio a fin](../output/pdf/Tutorial_Paso_a_Paso_Flujos_Sprint_2_Brotar.pdf).

Para una instalación normal se sigue el README desde su sección 3. El ensayo aislado usa un puerto diferente exclusivamente para no interferir con una base preexistente; no se debe adoptar ese puerto en una instalación normal nueva.
