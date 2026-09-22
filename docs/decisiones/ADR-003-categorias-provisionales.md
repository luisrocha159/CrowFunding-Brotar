# Categorías provisionales para la demostración

El equipo autorizó reutilizar las cinco categorías de la experiencia pública:
Medio ambiente, Producción sostenible, Economía circular, Educación y Desarrollo comunitario.
Los documentos requieren categorías, pero no fijan un catálogo cerrado de campañas.
Esta decisión permite demostrar el constructor; no supone aprobación definitiva del cliente
ni define requisitos KYC, permisos, parámetros financieros o criterios de publicación.

El script `infra/postgres-v2/seed-categories-demo.sql` inserta las categorías faltantes
por slug sin sobrescribir ni reactivar registros existentes. Puede repetirse.
Con el contenedor de Brotar iniciado, ejecutar desde la raíz del repositorio en PowerShell:

```powershell
Get-Content -Raw -Encoding UTF8 infra/postgres-v2/seed-categories-demo.sql | docker exec -i brotar-provisional-v2-postgres-1 psql -U postgres -d brotar_db -v ON_ERROR_STOP=1
```

Comprobar que las cinco categorías están activas. Si existe un slug desactivado o con otro
nombre, revisar esa diferencia antes de modificarlo. No eliminar categorías utilizadas.
La guía de verificación anterior describe el corte de pruebas previo, cuando el catálogo
estaba vacío; no es evidencia de ejecución de este seed ni de un nuevo recorrido de pantalla.
