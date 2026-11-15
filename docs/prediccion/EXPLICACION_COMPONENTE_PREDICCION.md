# Componente de estimación de rendimiento

Fecha: 2026-11-14 · Rama: `feat/prediccion-componente` · Cubre RF-31 a RF-34 (parcial) y respeta RF-32 y RF-52.

> Todas las cifras de este documento salen de **datos de demostración enmascarados**. No son rendimientos, superficies ni toneladas reales de AgroAn.

---

# PARTE 1: EXPLICACIÓN TÉCNICA

## 1. Arquitectura

El componente vive en `apps/api/src/modules/prediccion/` y sigue la misma arquitectura por capas del resto de la API. La regla principal es que el dominio no conoce ni Prisma ni la librería de Random Forest.

| Capa | Archivo | Qué hace |
|---|---|---|
| Dominio | `domain/modelo-rendimiento.ts` | Tipos: registro de lote, fila del modelo, métricas, versión de modelo, contexto de estimación. |
| Dominio (puerto) | `domain/ports/predictor.port.ts` | Puerto original de `GET /prediccion`. **No cambió.** |
| Dominio (puerto) | `domain/ports/estimador-rendimiento.port.ts` | Puerto ampliado: respuesta común `{ valor_t_ha, fuente, estado, version_modelo, campañas_usadas, advertencias }`. |
| Dominio (puerto) | `domain/ports/regresor.port.ts` | Algoritmo de regresión: `entrenar`, `cargar`, `predecir`, `serializar`. |
| Dominio (puertos de datos) | `domain/repositories/*.ts` | Lectura de registros y temporadas; versiones del modelo. |
| Dominio (reglas) | `domain/rules/variables.ts` | Variables, días de siembra, `lag_1`, one-hot, imputación y la lista de predictores prohibidos. |
| Dominio (reglas) | `domain/rules/linea-base.ts` | Línea base oficial. |
| Dominio (reglas) | `domain/rules/walk-forward.ts` | Cortes, separación sin fuga y métricas. |
| Dominio (reglas) | `domain/rules/bootstrap.ts` | Intervalos de confianza reproducibles. |
| Dominio (reglas) | `domain/rules/activacion.ts` | Regla de activación automática. |
| Aplicación | `application/entrenamiento.service.ts` | Entrena, evalúa y guarda una versión. |
| Aplicación | `application/estimacion.service.ts` | Arma la respuesta: oficial + experimental. |
| Infraestructura | `infrastructure/linea-base.adapter.ts` | `LineaBaseAdapter`: estimación oficial. |
| Infraestructura | `infrastructure/random-forest.adapter.ts` | `RandomForestAdapter`: estimación del modelo. |
| Infraestructura | `infrastructure/random-forest.regresor.ts` | **Único archivo que importa `ml-random-forest`.** |
| Infraestructura | `infrastructure/*.prisma.repository.ts` | Repositorios Prisma. |
| Presentación | `presentation/prediccion.controller.ts` | Endpoints nuevos (el original sigue igual). |

Parámetros del modelo: `RandomForestRegression` de `ml-random-forest` 2.1.0, 300 árboles, semilla 42, todas las variables en cada árbol y muestreo de filas con reemplazo. Se serializa con `toJSON()` y se carga con `RandomForestRegression.load()`.

## 2. Modelo de datos

Tres tablas nuevas, en dos migraciones que solo crean tablas.

**`registros_cosecha`** (migración `20261114152450_registros_cosecha_y_totales`). Una fila por campaña, y como una campaña ya es "una parcela en una temporada", equivale a una fila por parcela y campaña.

| Campo | Uso |
|---|---|
| `campanaId` (único) | A qué campaña pertenece. |
| `variedad`, `fechaSiembra`, `haSembradas` | Datos conocidos a la siembra: los predictores. |
| `fechaCosecha`, `haCosechadas`, `toneladas` | Datos de cosecha: solo sirven para calcular el objetivo. |
| `origen` | `demo_enmascarado` o `real`. |

**`totales_campana`** (misma migración). Rendimiento total de un cultivo en una temporada. `rendimientoTotalTnHa` nulo significa "superficie total desconocida": esa campaña no entra en la línea base.

**`modelos_ia`** (migración `20261114152451_modelos_ia`). Una fila por versión entrenada: cultivo, número de versión, fecha, origen de datos, campañas usadas, hash SHA-256 del conjunto de entrenamiento, predictores, categorías de variedad, mediana de días de siembra, métricas, modelo serializado (JSON) y estado (`experimental`, `activo` o `archivado`).

**Por qué no se tocaron `Campana`, `Actividad` ni la cadena de hashes**

- `Actividad` es inmutable y cada registro entra en la cadena SHA-256. Cargar 179 cosechas de demostración ahí habría escrito datos falsos en el mecanismo de integridad.
- `Actividad` tampoco tiene dónde guardar variedad, superficie cosechada ni toneladas, y agregar campos cambia la canonicalización e invalida los hashes existentes.
- En `schema.prisma` se agregó solo la relación inversa en `Campana` y `Cultivo`. No genera SQL sobre esas tablas: las claves foráneas viven en las tablas nuevas.
- Comprobado tras cargar la demo: la verificación global de integridad sigue válida con los mismos 35 registros.

## 3. Flujo de entrenamiento

**Variables.** Unidad: lote por campaña. Objetivo: `toneladas / hectáreas cosechadas`.

| Predictor | Detalle |
|---|---|
| `ha_sembradas` | Superficie sembrada. |
| `dias_siembra` | Días desde el 1 de octubre del inicio de la campaña hasta la siembra. |
| `variedad=…` | One-hot. La lista de categorías se guarda con el modelo. |
| `lag_1` | Rendimiento del mismo lote en la campaña anterior. Solo en la variante B. |

Está prohibido usar como predictor cualquier dato posterior a la siembra (hectáreas cosechadas, fechas de cosecha, toneladas, clima, fumigaciones, costos). `verificarPredictores` lanza un error si una columna así entra al vector, y hay pruebas que lo comprueban.

**Fecha de siembra faltante.** Se imputa con la mediana de días del entrenamiento de cada corte y la fila queda marcada como imputada.

**Walk-forward.** Para cada campaña desde la segunda, se entrena solo con las anteriores y se prueba en ella. La codificación de variedad y la mediana de imputación también salen solo del entrenamiento.

**Métricas.** Por corte y global: MAE del modelo, MAE de la línea base y su diferencia (negativa = el modelo es mejor), con intervalo de confianza al 95 % por bootstrap sobre lotes (1000 repeticiones, generador mulberry32 con semilla 12345). En el global un lote aparece en varios cortes, así que se remuestrea el lote entero.

**Modelo final.** Después de evaluar se entrena con todas las campañas (variante A) y se guarda como versión nueva.

**Regla de activación.** El modelo pasa a `activo` solo si cumple todo:

1. RF-32: al menos 3 campañas del cultivo.
2. Supera a la línea base en el global con un intervalo que excluye 0.
3. No es peor que la línea base en la última campaña con un intervalo que excluye 0.

Si no, queda `experimental`. Al activarse uno nuevo, el activo anterior pasa a `archivado`. Un modelo entrenado con `demo_enmascarado` nunca se activa.

**Disparadores.** Hoy solo el endpoint manual. `EntrenamientoService.entrenarAlCerrarCampana(cultivoId)` está listo, pero nadie lo llama porque el cierre de campaña (RF-14) todavía no existe.

## 4. Endpoints nuevos

`GET /prediccion` no cambió. Todos los nuevos piden sesión.

| Método y ruta | Roles | Qué hace |
|---|---|---|
| `GET /prediccion/estimacion?lote=&campana=` | JEFE, CONTABILIDAD, OPERATIVO | Estimación de un lote en una campaña. |
| `POST /prediccion/entrenar?cultivo=` | JEFE | Entrena, evalúa y guarda una versión. |
| `GET /prediccion/modelos?cultivo=` | JEFE | Versiones con estado y métricas (sin el modelo serializado). |
| `GET /prediccion/datos-demo` | JEFE, CONTABILIDAD, OPERATIVO | Ids de las parcelas de demostración, para el filtro del panel. |

Ejemplo real de `GET /prediccion/estimacion` (lote de demostración, campaña 2025-2026):

```json
{
  "oficial": {
    "valor_t_ha": 1.68,
    "fuente": "linea_base",
    "estado": "oficial",
    "version_modelo": null,
    "campañas_usadas": 3,
    "advertencias": []
  },
  "experimental": {
    "valor_t_ha": 1.95,
    "fuente": "modelo",
    "estado": "experimental",
    "version_modelo": "v1",
    "campañas_usadas": 5,
    "advertencias": ["Modelo entrenado con datos de demostración (enmascarados): no es una estimación real."]
  },
  "referencia_linea_base": null,
  "origen_datos": "demo_enmascarado",
  "etiqueta_datos": "Datos de demostración (enmascarados)"
}
```

Si un modelo llega a estar `activo`, su estimación pasa a `oficial`, `experimental` queda nulo y la línea base se devuelve en `referencia_linea_base`.

Respuesta de `POST /prediccion/entrenar` (resumida):

```json
{
  "version": "v1",
  "origenDatos": "demo_enmascarado",
  "estado": "experimental",
  "campanasUsadas": ["2021-2022", "2022-2023", "2023-2024", "2024-2025", "2025-2026"],
  "predictores": ["ha_sembradas", "dias_siembra", "variedad=6410", "variedad=MUNASQA", "variedad=MUNASQA Y 6410"],
  "metricas": {
    "activacion": {
      "estado": "experimental",
      "motivos": [
        "Entrenado con datos de demostración (enmascarados): nunca se activa.",
        "Es peor que la línea base oficial en la última campaña (2025-2026) con un intervalo que excluye 0."
      ]
    }
  }
}
```

Códigos comprobados por HTTP: 401 sin sesión, 403 para OPERATIVO en `entrenar` y `modelos`, 400 sin `cultivo`, 404 si la campaña no es de ese lote.

## 5. Seed de demostración

- Archivos: `apps/api/prisma/seeds/demo/lotes_5_campanas_enmascarado.csv` y `totales_enmascarado.csv`. Se copiaron solo esos dos, desde `Datos_AgroAn/enmascarado/`. No se copió nada de `privado/` ni datos reales.
- Se ejecuta con `npm run seed:demo`. No forma parte de `prisma db seed`.
- Carga 42 parcelas (`Lote demo L01`…), 179 campañas, 179 registros de cosecha y 5 totales, todo con origen `demo_enmascarado`. Las parcelas nunca van a preventa y no se crean actividades.
- Es idempotente: si ya hay registros de demostración, no hace nada.

**Cómo se impide que corra en producción** (`impedirProduccion` en `datos-demo.ts`):

1. Si `NODE_ENV=production`, falla antes de conectarse.
2. Si la base no es local (`localhost`, `127.0.0.1`), falla, salvo que se declare `PERMITIR_SEED_DEMO_REMOTO=si` a propósito.
3. La función que carga los datos repite el candado, así que tampoco se puede saltar llamándola desde otro script.

Comprobado: con `NODE_ENV=production` el comando termina con "El seed de demostración no corre en producción".

**En la interfaz.** Las parcelas de demostración no se ven por defecto en Parcelas ni en Resumen; aparecen al marcar "Mostrar datos de demostración", con la etiqueta "Datos de demostración (enmascarados)". En Reportes y Costos se ocultan siempre.

## 6. Pruebas

| Conjunto | Resultado |
|---|---|
| Unitarias de la API (`npm run test`) | 210 pasan, de las cuales 82 son nuevas. |
| Integración con PostgreSQL (`npm run test:integration`) | 21 pasan, de las cuales 7 son nuevas. |
| Build y lint de la API | Sin errores. |
| Build y lint de la web | Sin errores. |

Qué cubren las pruebas nuevas:

- **Línea base:** con campañas anteriores, sin ellas ("sin datos"), exclusión de la campaña sin total, y cálculo desde lotes cuando falta el total.
- **Variables:** días de siembra, `lag_1` (mismo lote, campaña inmediata anterior), one-hot, variedad desconocida e imputación marcada.
- **Predictores prohibidos:** 14 nombres de columna más toda la lista de prohibidos hacen fallar la verificación.
- **Walk-forward sin fuga:** un regresor espía confirma que en cada corte el modelo solo recibe filas de campañas anteriores, y que categorías y mediana salen del entrenamiento.
- **Bootstrap:** misma semilla, mismo intervalo.
- **Activación:** cada condición por separado y el bloqueo para `demo_enmascarado`.
- **Componente completo en memoria:** entrenamiento, estimación con etiqueta experimental, guardar y cargar el modelo, y paso a oficial solo si está activo.
- **Integración:** seed de demo, entrenamiento y consulta llamando a los métodos del controller contra PostgreSQL.
- **Seed:** los candados de producción y de base remota.

La prueba de integración llama a los métodos del controller, no levanta el servidor HTTP (por la limitación conocida de Jest con Nest 12). Los endpoints reales por HTTP se probaron aparte, a mano, con la API levantada.

## 7. Paridad con Python

Referencia: `Experimentos/pipeline_rf/prototipo_enmascarado/reporte.md`, variante A, línea base (a). Mismos datos (SHA-256 `9bae0b2f…ad2cb5`).

| Corte | MAE modelo Python | MAE modelo plataforma | MAE línea base (ambos) | Diferencia Python [IC] | Diferencia plataforma [IC] | Conclusión Python | Conclusión plataforma |
|---|---|---|---|---|---|---|---|
| 2022-2023 | 0,216 | 0,223 | no aplica | no aplica | no aplica | sin base (a) | sin base (a) |
| 2023-2024 | 0,773 | 0,778 | 1,116 | −0,343 [−0,354, −0,332] | −0,338 [−0,348, −0,327] | gana | gana |
| 2024-2025 | 0,403 | 0,395 | 0,700 | −0,297 [−0,355, −0,239] | −0,305 [−0,359, −0,241] | gana | gana |
| 2025-2026 | 0,330 | 0,320 | 0,161 | +0,169 [+0,086, +0,252] | +0,159 [+0,070, +0,241] | pierde | pierde |
| Global | 0,506 | 0,502 | 0,671 | −0,165 [−0,199, −0,132] | −0,169 [−0,203, −0,135] | gana | gana |

- **Las conclusiones coinciden en los cuatro cortes y en el global.**
- La línea base da exactamente lo mismo (es un cálculo determinista).
- El MAE del modelo difiere en 0,01 como máximo: scikit-learn y `ml-random-forest` construyen los árboles y sortean las muestras de forma distinta.
- Los intervalos difieren en el tercer decimal porque el generador aleatorio del bootstrap no es el de numpy.
- Variante B (informativa): también coincide en conclusiones (gana, gana, pierde; global gana). El MAE difiere más, hasta 0,04 en 2024-2025.

**Estado del modelo entrenado con la demo:** `experimental`. Además del bloqueo por ser demostración, es peor que la línea base en la última campaña, así que tampoco se activaría con datos reales iguales (hay una prueba que lo comprueba).

## 8. Decisiones tomadas

1. **Tabla nueva `registros_cosecha`,** una fila por parcela y campaña, con `origen`. Evita tocar `Campana` y `Actividad`.
2. **42 parcelas de demostración,** inactivas para preventa, etiquetadas y ocultas por defecto con el filtro "Mostrar datos de demostración".
3. **`GET /prediccion` intacto.** Los endpoints nuevos usan un puerto ampliado, para no romper el panel ni la parte pública.
4. **Línea base oficial = versión (a),** sin 2021-2022, porque su superficie total no se conoce. La versión (b) depende de un supuesto y no se usa.
5. **Imputación con la mediana del entrenamiento de cada corte,** con las filas marcadas, igual que el prototipo de Python.
6. **Solo disparador manual.** El método para el cierre de campaña queda listo; no se tocó `CampanasService`.
7. **Rama `feat/prediccion-componente`,** creada por Andrés desde el rediseño ya commiteado.

Decisiones adicionales que no estaban en el pedido:

- **Tabla `totales_campana`.** La línea base usa el rendimiento total de la campaña, que no coincide con la suma de los lotes (1,992 contra 2,019 en 2022-2023), y hay que poder marcar una campaña como "superficie total desconocida".
- **Si una campaña no tiene total registrado,** se calcula con toneladas totales / hectáreas totales de sus lotes y se avisa en `advertencias`.
- **La plataforma entrena la variante A.** La B se evalúa y se guarda en las métricas, pero no produce estimaciones: necesita `lag_1` y no todos los lotes lo tienen.
- **Datos reales y de demostración nunca se mezclan.** Si hay registros reales del cultivo se entrena con esos; si no, con la demo.
- **`GET /prediccion/datos-demo`** se agregó para que el panel pueda ocultar las parcelas de demostración sin cambiar `GET /parcelas`.
- **"Hectáreas totales" del Resumen** ahora se suma en la web con las parcelas visibles. El endpoint de reportes contaba también las de demostración (2.134 ha en vez de 90 ha).

## 9. Limitaciones y pendientes

- **Conviven dos líneas base.** `GET /prediccion` (la anterior) promedia las cosechas registradas como actividades; la oficial nueva usa los totales por campaña. Para las parcelas reales la nueva responde "sin datos", porque todavía no tienen registros de cosecha. Falta decidir cuándo se retira la anterior.
- **No hay pantalla para registrar siembra y cosecha** en `registros_cosecha`. Hoy solo entra por el seed. Corresponde a RF-22 a RF-24 y a la importación RF-35.
- **El endpoint de reportes sigue contando la demo** en `hectareasTotales`. Se corrigió en la web, no en la API. En producción no hay demo, así que no afecta.
- **Parte pública:** no se implementó la "Referencia histórica" opcional. La parte pública no muestra nada del modelo.
- **Entrenamiento automático al cerrar campaña:** depende de RF-14.
- **No hay pantalla para entrenar ni para ver las versiones;** se hace por Swagger o por la API.
- **El modelo serializado se guarda en la base** como JSON (300 árboles). Con muchos cultivos o versiones convendría moverlo a archivos.
- **Paridad:** se comparan conclusiones, no números idénticos.
- **Cap. IV de la tesis:** falta documentar este componente, las tres tablas nuevas y la decisión de la línea base (a).

---

# PARTE 2: EXPLICACIÓN SENCILLA

## Qué hace este componente

Antes de sembrar, calcula cuántas toneladas por hectárea se puede esperar de cada lote. Da dos números: uno oficial, que es el que vale, y uno de prueba, que todavía está a examen.

## De dónde saca los datos

Usa lo que se anotó en campañas pasadas de cada lote: cuántas hectáreas se sembraron, qué variedad, en qué fecha, y al final cuántas toneladas salieron.

Hoy el sistema trabaja con **datos de demostración enmascarados**. "Enmascarado" quiere decir que los números se cambiaron a propósito: los nombres de los lotes, las fechas y las cantidades no son los verdaderos, pero se comportan parecido. Se usan por dos razones: para no exponer la información real de la empresa mientras se construye el sistema, y para poder mostrarlo en una presentación sin riesgo. En la pantalla siempre llevan el cartel "Datos de demostración (enmascarados)" y están ocultos salvo que se pida verlos.

## Cómo "aprende" el modelo y cómo se comprueba

El modelo es un programa que busca relaciones en los datos pasados. Por ejemplo: "los lotes sembrados tarde con tal variedad rindieron menos".

Para saber si de verdad aprendió, se le toma un examen con campañas que ya pasaron, tapándole la respuesta:

1. Se le muestran solo las campañas 2021-2022 y 2022-2023.
2. Se le pide que adivine el rendimiento de cada lote en 2023-2024, sin ver ese resultado.
3. Se compara lo que dijo con lo que realmente salió.
4. Se repite con la campaña siguiente, y con la siguiente.

Es como evaluar a alguien que pronostica el clima: no se le cree porque explique bien el clima de ayer, sino porque acertó días que todavía no había visto.

Con los datos de demostración, el modelo acertó mejor que el promedio en dos campañas, y peor en la más reciente.

## Qué es la estimación oficial y qué es la experimental

- **Estimación oficial:** es el promedio de lo que rindió el cultivo en las campañas anteriores. Es simple y difícil de engañar. Ejemplo: si en tres campañas el cultivo rindió 2,0, 0,9 y 2,2 toneladas por hectárea, la estimación oficial es 1,7.
- **Estimación experimental:** es la que da el modelo. Aparece debajo, con un cartel que dice "Experimental".

Hoy manda la oficial porque el modelo todavía no demostró ser mejor de forma constante: falló justo en la última campaña. Un método que a veces gana y a veces pierde no es confiable para decidir una venta o una inversión.

## Cuándo el modelo podría pasar a ser el oficial

Tienen que cumplirse todas estas condiciones:

- Que esté entrenado con datos reales, no de demostración.
- Que haya al menos tres campañas del cultivo.
- Que en el conjunto de los exámenes le gane al promedio con claridad, no por suerte.
- Que en la última campaña no haya sido claramente peor que el promedio.

El sistema revisa esto solo cada vez que se entrena. Si se cumple, el modelo pasa a ser el oficial y el anterior queda guardado. Si no, sigue como experimental.

## Qué tiene que registrar el usuario para que el sistema mejore

En cada lote y cada campaña:

- **Al sembrar:** las hectáreas sembradas, la variedad y la fecha de siembra.
- **Al cosechar:** las hectáreas cosechadas y las toneladas que salieron.
- **Al cerrar la campaña:** el total de toneladas y de hectáreas cosechadas del cultivo.

Importa que se anote siempre y en todos los lotes. Una fecha de siembra que falta obliga al sistema a suponerla, y cada suposición lo hace menos preciso. Con cada campaña bien registrada el modelo tiene un examen más, y eso es lo que permite saber si ya se puede confiar en él.
