# Ensayo final local del Sprint 1

Corte: 21 de septiembre de 2026. Complementa la guía anterior y su Word; no constituye
certificación externa ni aceptación definitiva del cliente. No se publicó código ni se cambió Trello.

## Resultado comprobado

- Docker y PostgreSQL V2 funcionando; `/api/health/ready` confirma conexión.
- Cinco categorías provisionales cargadas y visibles en Información general.
- Verificación automatizada: 93 pruebas frontend, 93 backend y 14 integraciones (200 casos).
- Lint, tipos y compilación de frontend y backend aprobados. Tras cambiar la ubicación
  del buzón se repitieron compilación y los tres casos afectados (dos unitarios y una integración).
- El ensayo visual cubrió registro ficticio, login, rechazo de nombre numérico, actualización
  de perfil, organización en borrador, campaña en donación, información general, historia,
  indicador, carga de portada, revisión y recuperación del contenido/paso al recargar.
- Donación omite recompensas. Plan/presupuesto y financiamiento se identifican como etapas
  de sprints posteriores. No hay publicación, cobros ni aprobación de campañas en este ensayo.
- Cierre de sesión confirmado; entrar sin sesión al constructor redirige al login.
- Solicitud de recuperación comprobada desde el navegador y archivo generado localmente.
  El cambio de contraseña, rechazo de reutilización, caducidad y revocación de sesión se
  comprobaron por integración automatizada con cuentas temporales, no por cambio manual en navegador.

## Demostrar recuperación sin correo externo

No es un servicio de correo: el adaptador local guarda el mensaje que se utilizaría para la prueba.
Solo funciona con `NODE_ENV=development`, `HOST` local, `PUBLIC_WEB_ORIGIN` local
y `PASSWORD_RESET_LOCAL_FILE=true`. La API no devuelve el token y producción no habilita
este canal. Se retiró de la composición de la aplicación la exposición antigua mediante
`PASSWORD_RESET_LOCAL_LINK`.

1. Iniciar PostgreSQL, backend y frontend según el README.
2. Registrar una cuenta ficticia y comprobar su acceso. No usar contraseñas personales.
3. Abrir `http://127.0.0.1:5173/recuperar-contrasena` y enviar el correo de esa cuenta.
4. Abrir en el Explorador `%LOCALAPPDATA%\Brotar\recovery-mail`.
   En esta computadora: `C:\Users\rnune\AppData\Local\Brotar\recovery-mail`.
5. Abrir el `.txt` más reciente correspondiente a la cuenta. Copiar su enlace al navegador local.
6. El expositor ingresa una nueva contraseña de prueba y su confirmación; guarda y vuelve a entrar.
7. Mostrar que el enlace usado no vuelve a permitir el restablecimiento y que la contraseña anterior
   deja de servir. El enlace vence en una hora. Pedir uno nuevo si se prepara la exposición otro día.

Los enlaces son credenciales temporales: no compartirlos, proyectarlos innecesariamente ni subirlos
a Git. Los archivos no se eliminan automáticamente al vencer; borrar los mensajes de ensayo después
de la presentación. En Windows están fuera del repositorio y de su carpeta OneDrive. En entornos sin
LOCALAPPDATA se usa `backend/private/recovery-mail`, excluido de Git. Los permisos de archivo dependen
también de la protección de la cuenta del sistema operativo; no es una solución multiusuario de producción.
Una cuenta inexistente recibe la misma respuesta pública y no genera mensaje.

## Datos ficticios conservados

- Cuenta: `ensayo-final-s1-20260921@example.invalid` (sin contraseña en esta guía).
- Organización: Fundación Ensayo Local / Ensayo Brotar, en borrador.
- Campaña: Huerto de ensayo Sprint 1, categoría Medio ambiente, Cochabamba.
- Meta de impacto: diez parcelas; no representa resultados logrados.
- Portada: imagen de huertos del proyecto, con texto alternativo.

Las pruebas automatizadas retiran sus propias cuentas y mensajes temporales. El ensayo visual se
conserva para estudiar y demostrar; terminó con sesión cerrada.

## Pendientes explícitos

Correo y remitente reales, textos legales definitivos, reglas KYC/KYB y matriz definitiva de permisos
siguen pendientes de confirmación. El acceso básico inmediato no equivale a verificación.
Las cinco categorías tienen autorización provisional del equipo, no aprobación final del cliente.
La entrega local no requiere configurar hosting o dominio. No marcar estos criterios de negocio
como aprobados ni cerrar todas las historias automáticamente por haber pasado pruebas.

Para exponer: primero acceso y perfil, luego organización, después borrador hasta revisión y finalmente
recuperación local. Complementar con la guía de tareas y el informe de calidad para defender las decisiones
de programación. El Word previo conserva el corte anterior de pruebas: usar este complemento para los
cambios de categorías, el buzón y el total actualizado.
