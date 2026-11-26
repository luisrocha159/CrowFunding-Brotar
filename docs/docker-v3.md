# Brotar en tres contenedores locales

Este recorrido instala la edición académica en un clon nuevo y deja el sitio, la API y la base en contenedores independientes. La primera preparación usa en el anfitrión las mismas herramientas que la instalación de revisión, para ejecutar las migraciones, cargar los archivos y crear las cuentas de práctica. Una vez preparado el entorno, Docker ejecuta los tres servicios.

## Preparar y encender

Se necesitan Git, Node.js 24 (24.13.0 o posterior dentro de la serie 24), Bun 1.4.2, Corepack con pnpm 11.19.0 y Docker Desktop con el motor Linux activo. Docker Compose debe admitir `up --wait`. Reserve tres puertos libres para esta copia. Los comandos se ejecutan en la raíz del clon en PowerShell.

```powershell
git clone --branch main --single-branch https://github.com/luisrocha159/CrowFunding-Brotar.git Brotar-contenedores
cd Brotar-contenedores
node scripts/setup-review.mjs --project=brotar-revision-v3docker --db-port=15597 --api-port=3097 --web-port=5297
node scripts/docker-review.mjs up --build -d --wait
node scripts/docker-review.mjs ps
```

Continúe al siguiente paso únicamente si el anterior termina correctamente. El preparador genera contraseñas de base privadas en la copia local, un volumen para PostgreSQL y los escenarios de evaluación. El comando siguiente utiliza los puertos y el nombre de proyecto guardados por ese preparador. Si cambia puertos o proyecto, hágalo en la primera preparación de una carpeta nueva. En esta modalidad los contenedores arrancan la API y el frontend; deje libres esos dos puertos en el anfitrión.

| Servicio | Tecnología y acceso desde el equipo | Qué verificar |
| --- | --- | --- |
| `frontend` | React compilado y Nginx en [127.0.0.1:5297](http://127.0.0.1:5297) | Abra [/explorar](http://127.0.0.1:5297/explorar) y recargue la página. El catálogo debe volver a aparecer. |
| `backend` | NestJS y Node.js 24; entrada HTTP por Nginx en [127.0.0.1:3097/api/health/ready](http://127.0.0.1:3097/api/health/ready) | La respuesta debe indicar `status: ok` y `database: connected`. |
| `postgres` | PostgreSQL 18.6; cliente local en `127.0.0.1:15597`, base `brotar_db` | `docker-review.mjs ps` debe mostrar el servicio saludable. |

Para probar el inicio de sesión use [las cuentas académicas por rol](revision-lideres/Credenciales_Revision.csv). Antes de avanzar por los casos, ejecute el verificador desde la raíz:

```powershell
node backend/scripts/verify-review.mjs
```

En una copia inicial debe informar 140 comprobaciones, 36 archivos íntegros, 18 cuentas y 20 escenarios. Crea sesiones de prueba y verifica la autorización, el catálogo y el estado inicial de las campañas. Si el equipo ya avanzó un caso, su estado puede diferir del inicial.

## Qué construye Compose

[El archivo Compose](../compose.yaml) amplía el servicio PostgreSQL usado por el preparador. El [Dockerfile de la API](../infra/docker/backend.Dockerfile) instala las dependencias congeladas, compila TypeScript y arranca NestJS con el usuario del sistema `node`. El [Dockerfile del frontend](../infra/docker/frontend.Dockerfile) compila con Bun y Vite y entrega los recursos estáticos a Nginx. La [configuración web](../infra/docker/nginx.conf) permite recargar rutas internas y conserva el prefijo `/api`.

Los tres procesos comparten el espacio de red del contenedor PostgreSQL. Desde la API, la base responde en `127.0.0.1:5432`. Nginx reenvía las peticiones a la API en `127.0.0.1:3000`. Los contenedores conservan ciclos de vida, imágenes y comprobaciones de salud propios. Esta disposición permite conservar las restricciones del simulador, del buzón de revisión y de la conexión de base local. Los puertos publicados se enlazan exclusivamente al bucle local del anfitrión.

El volumen de datos pertenece al proyecto Compose. Los adjuntos y el buzón de revisión se montan desde las carpetas privadas de la instalación. No se copian usuarios de otra base, contraseñas SMTP o datos personales en las imágenes. En un anfitrión Linux, el UID del proceso de la API (1000) debe poder leer y escribir en `backend/private/review-files` y `backend/private/review-mail`; provisionar permisos solo en esas carpetas. Las contraseñas de acceso a PostgreSQL se generan por instalación. La cuenta de la API es `brotar_app`.

## Detener y volver a abrir

```powershell
node scripts/docker-review.mjs logs --tail 50 backend
node scripts/docker-review.mjs down
node scripts/docker-review.mjs up -d --wait
```

El comando `down` indicado conserva el volumen, y las carpetas de adjuntos y correo permanecen en el clon. Para repetir casos desde su estado inicial, cree una copia con otro proyecto y puertos. En una red Docker con el conjunto automático de subredes agotado, asigne a ese proyecto una subred privada libre acordada con el responsable del equipo. En caso de conflicto de puertos, identifique primero el proceso que los ocupa.

## Alcance

Esta configuración permite evaluar el producto con credenciales de práctica y pagos simulados desde un solo equipo. Para alojar un servicio público se deben aplicar los requisitos del manual técnico, entre ellos TLS, políticas de privacidad definitivas, credenciales propias y servicios externos autorizados.

## Evidencia de instalación

El 26 de noviembre de 2026 se instaló esta configuración en una copia aislada de Windows con Docker Compose v5.6.1. Los tres servicios alcanzaron el estado `healthy`. La ruta `/explorar`, el logotipo, los estilos y el JavaScript respondieron con HTTP 200. La API confirmó conexión con PostgreSQL tanto por el puerto web como por el puerto de la API. El verificador del paquete completó 140 comprobaciones con 36 archivos íntegros, 18 cuentas y 20 escenarios.

En el equipo utilizado, Docker había agotado sus subredes automáticas. Para esa instalación se creó previamente la red del proyecto con una subred disponible. Si se presenta el mismo error, seleccione una subred que no coincida con otra red de Docker, del equipo o de la VPN. El siguiente comando muestra la red concreta usada durante esta validación:

```powershell
docker network create --driver bridge --subnet 10.246.147.0/28 --label com.docker.compose.project=brotar-revision-v3docker --label com.docker.compose.network=default brotar-revision-v3docker_default
```

Para pausar esta instalación conservando la red asignada, ejecute `node scripts/docker-review.mjs stop`. Reanude con `node scripts/docker-review.mjs start` y consulte `ps` hasta que los tres servicios estén saludables. Si se retiró la red con `down` y los rangos automáticos siguen agotados, vuelva a crearla antes de ejecutar `up`.
