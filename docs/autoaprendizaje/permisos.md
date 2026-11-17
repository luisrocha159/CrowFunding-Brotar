# Autenticación, autorización y permisos del equipo

La consulta autenticada de colaboradores de Brotar del 17/11/2026 devolvió los siguientes permisos. Se documenta la configuración observada; no se cambiaron roles ni se atribuyen nombres personales a cuentas cuya identidad no se ha confirmado.

## Matriz de permisos reales

| Cuenta GitHub | Rol devuelto | Leer | Crear ramas y subir commits | Revisar PR de otro autor | Administrar permisos |
| --- | --- | --- | --- | --- | --- |
| luisrocha159 | admin | Sí | Sí | Sí | Sí |
| ricardoNP0 | write | Sí | Sí | Sí | No |
| AlisonPizarro1 | write | Sí | Sí | Sí | No |
| heriiiiiii | write | Sí | Sí | Sí | No |
| JayLoKing | write | Sí | Sí | Sí | No |

Como el repositorio es público, otras personas pueden leer su contenido público sin ser colaboradores. La escritura directa corresponde a los accesos listados. El autor de un PR no sustituye la revisión independiente de otra persona.

En el repositorio del curso `BenjaminBuitragoC/PROYECTO-DE-SISTEMAS-II-A`, la cuenta `ricardoNP0` tiene lectura (`pull=true`) y no escritura (`push=false`), administración ni mantenimiento. Por ese motivo se utiliza el repositorio del proyecto para las contribuciones de la actividad.

## Privilegios mínimos propuestos

| Función | Acceso necesario | Comparación y propuesta |
| --- | --- | --- |
| Propietario/administrador del repositorio | Configuración y administración de accesos | Conservar la administración en el propietario; no distribuirla por conveniencia. |
| Coordinador e integrantes que desarrollan | Lectura, ramas, commits y revisión | El acceso de escritura observado permite estas tareas sin conceder administración. Confirmar con el propietario que los cuatro accesos siguen siendo necesarios. |
| Revisor externo o docente | Lectura y comentarios/revisión según su participación | No requiere escritura si solo inspecciona. No se asigna un rol real al docente en Brotar sin comprobarlo. |

Los permisos observados son suficientes para publicar una rama y revisar cambios, pero no sustituyen las protecciones de ramas. No se propone dar administración a Ricardo para realizar esta tarea.

## Protección de la cuenta con MFA

Cada integrante debería usar su propia cuenta y configurar un segundo factor mediante una aplicación TOTP o llave de seguridad compatible; conservar los códigos de recuperación en un lugar privado y seguro. No incluir códigos, QR, contraseñas ni tokens en el informe. La configuración se realiza personalmente desde las opciones de seguridad de GitHub. Esta actividad explica la medida y no afirma haber configurado ni verificado el MFA de otros integrantes.

## Respuestas justificadas

**¿En qué se diferencian autenticación y autorización?** La autenticación demuestra quién inicia sesión, por ejemplo mediante credenciales y MFA. La autorización determina qué puede hacer esa cuenta: Ricardo puede subir cambios a Brotar, pero no administrar permisos; en el repositorio del curso solo puede leer.

**¿Por qué no todos deberían administrar el repositorio?** La administración permite acciones sensibles como cambiar accesos y configuración. Dar esos privilegios a quien solo necesita desarrollar aumenta el alcance de errores o del compromiso de una cuenta.

**¿Qué problema ocasiona compartir una cuenta?** Los commits, revisiones y acciones administrativas dejan de identificar claramente a la persona responsable. También se dificulta retirar el acceso de un solo integrante y proteger los factores de autenticación. Se recomiendan cuentas individuales.

## Fuentes

- [Consulta resumida de la configuración](evidencias/resultados.json).
- [MFA en GitHub](https://docs.github.com/en/authentication/securing-your-account-with-two-factor-authentication-2fa/about-two-factor-authentication).
- [Referencia de roles para repositorios de organizaciones](https://docs.github.com/en/organizations/managing-user-access-to-your-organizations-repositories/managing-repository-roles/repository-roles-for-an-organization). Esta referencia explica el principio de privilegios mínimos; la matriz de Brotar se basa en su respuesta API real, no en suponer que el repositorio pertenece a una organización.
