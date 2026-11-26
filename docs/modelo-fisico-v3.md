# Modelo físico de Brotar

[Descargar el atlas físico de PostgreSQL (PDF vectorial)](Modelo_fisico_Brotar.pdf) · [Abrir el plano general de las relaciones (PNG)](entregables/defensa-final/Plano_completo_120_tablas.png)

El plano general reúne **120 tablas y 262 claves foráneas**. Sus nodos muestran nombres de tablas. Para identificar campos, tipos, nulabilidad o cardinalidades, abra el **atlas** y seleccione un dominio. Cada entidad tiene una ficha propia. Las referencias de la derecha son enlaces a las fichas de las entidades de destino. Se puede recorrer una relación compuesta sin perder el orden de sus columnas.

## Índice de dominios del atlas

Los dominios organizan la lectura. El nombre calificado de cada tabla conserva su esquema físico real.

| Dominio | Tablas | Campos | Claves foráneas salientes | Página del índice |
| --- | ---: | ---: | ---: | ---: |
| Acceso e identidad | 20 | 158 | 34 | 2 |
| Organizaciones y territorio | 9 | 86 | 24 | 23 |
| Diseño y publicación de campañas | 15 | 132 | 30 | 33 |
| Aportes y operación financiera | 24 | 259 | 67 | 49 |
| Ejecución y rendición | 27 | 211 | 62 | 74 |
| Soporte y comunicación | 17 | 131 | 40 | 102 |
| Configuración, auditoría y revisión | 8 | 50 | 5 | 120 |
| **Total** | **120** | **1.027** | **262** | |

## Cómo interpretar las cardinalidades

Cada FK enlaza una fila de origen con un destino. En una FK obligatoria las columnas de origen están declaradas `NOT NULL` y el destino tiene multiplicidad **1**. En una FK opcional, **0..1**, PostgreSQL admite una fila sin esa referencia. Si la clave es compuesta, se conserva la correspondencia entre cada posición de origen y de destino.

Un destino puede tener **0..N** filas de origen. La ficha muestra **0..1** cuando una PK o una clave única sobre las columnas de origen limita la relación a una sola fila. Se consideran los índices únicos aplicables a toda referencia que coincida. Las restricciones parciales sobre estados concretos, como un único pago confirmado por aporte, restringen un subconjunto de filas y se consultan en el diccionario del manual técnico.

Por ejemplo, `public.contribution` referencia a `public.campaign` con `(campaign_id, currency_code)`. Un aporte solo puede asociarse con una campaña en esa misma moneda. La referencia `(reward_id, campaign_id)` apunta a una recompensa de esa campaña y admite un aporte sin recompensa. En `public.payment`, la FK compuesta obliga a conservar la moneda del aporte en cada intento. La existencia de varios intentos es compatible con la unicidad condicional del pago confirmado.

## Comprobación de integridad

El **26 de noviembre de 2026** se cotejó en modo de solo lectura el catálogo de la instalación académica preparada con las tablas, campos, tipos, nulabilidad, restricciones nombradas e índices únicos utilizados para elaborar el atlas. Se compararon ambas columnas y el orden de todos los pares de cada FK con el inventario del plano. Se validaron las 120 fichas exportadas, los nombres y tipos de los 1.027 campos y sus 262 enlaces a los destinos del PDF.

Para contrastar los recuentos en otra copia, conecte un cliente SQL a la base preparada y ejecute esta consulta de lectura. Una instalación que aún no ha cargado los escenarios de revisión puede carecer de `brotar_review.dataset`.

```sql
WITH entidades AS (
    SELECT n.nspname AS esquema, t.oid
    FROM pg_class AS t
    JOIN pg_namespace AS n ON n.oid = t.relnamespace
    WHERE t.relkind IN ('r', 'p')
      AND n.nspname IN ('public', 'brotar_extension',
                        'brotar_review', 'brotar_migration')
), inventario AS (
    SELECT e.esquema,
           (SELECT count(*) FROM pg_attribute a
            WHERE a.attrelid = e.oid AND a.attnum > 0
              AND NOT a.attisdropped) AS campos,
           (SELECT count(*) FROM pg_constraint c
            WHERE c.conrelid = e.oid AND c.contype = 'f') AS fk
    FROM entidades AS e
)
SELECT coalesce(esquema, 'TOTAL') AS esquema,
       count(*) AS tablas, sum(campos) AS campos, sum(fk) AS claves_foraneas
FROM inventario
GROUP BY GROUPING SETS ((esquema), ())
ORDER BY GROUPING(esquema), esquema;
```
