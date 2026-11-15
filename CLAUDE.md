# CLAUDE.md — AgriTrack (proyecto de grado, cliente AgroAn)

> Léelo completo antes de tocar código. Si algo de aquí contradice lo que ves en el repo, **avisa a Andrés**; no lo "arregles" en silencio.
> Idioma de trabajo: español casual. Andrés escribe rápido y con typos: interpreta la intención, no pidas aclaraciones triviales.
> Última actualización de este archivo: 2026-11-15.

---

## 1. Qué es esto (y qué NO es)

**AgriTrack** es un sistema web de gestión agrícola para **AgroAn** (empresa agrícola en Pailón Sur, Santa Cruz, Bolivia; cultiva soya, sorgo, trigo y sésamo). Es el **proyecto de grado de Andrés** (Ing. de Sistemas, UNIVALLE).

**Los 5 objetivos del sistema (no te salgas de aquí):**
1. Registro completo y fácil de parcelas, campañas y labores de campo.
2. Integridad de los datos: que lo registrado no sea fácilmente manipulable (hash chain SHA-256, simple, sin blockchain).
3. Estimación de rendimiento (t/ha) por parcela con **Random Forest**, comparado contra una línea base.
4. Costos por campaña (gastado, comprometido, ahorrado, costo/ha).
5. Preventa: comprador/inversionista **solo mira** parcelas habilitadas y datos de contacto. **Sin cuenta, sin transacciones.**

**Fuera de alcance (descartado, no lo propongas ni lo implementes):**
- Blockchain / smart contracts / certificación digital.
- Módulo de alquiler.
- Pagos, transacciones o cuentas de compradores.
- App móvil (es **web-only**, pero debe verse bien a 360 px).
- Asesor agrónomo como usuario: sus funciones las asume el rol JEFE.
- Reglas agronómicas inventadas (rangos de pH, nitrógeno, etc.): nadie las validó. Ver §6.3.
- Microservicios, colas, GraphQL, caché, Kubernetes, y cualquier cosa "por si acaso".

**Fechas:** cierre y entrega final en diciembre de 2026. Prioriza lo que acerca los 5 objetivos al 100 % (§7).

---

## 2. Stack (versiones reales)

| Capa | Tecnología |
|---|---|
| API | NestJS ^12, TypeScript ^6, Swagger en `/docs` |
| Datos | Prisma **^7.10** + `@prisma/adapter-pg`, PostgreSQL 16 (Docker, puerto **5433**) |
| Auth | JWT (passport-jwt) + bcrypt ^6 + guards de rol |
| ML | `ml-random-forest` 2.1.0 (CommonJS, carga bien en Jest), solo dentro de `prediccion/infrastructure` |
| Web | Next.js 16.3.6 (App Router), React 19.2.8, Tailwind 4, Recharts, Axios, lucide-react |
| Mapas | Leaflet + react-leaflet + Geoman, `@turf/turf` (área desde GeoJSON), teselas Esri |

**No actualices a Prisma 8** (da problemas de compatibilidad con NestJS). No cambies de librería ni agregues dependencias sin motivo fuerte y sin decirlo.

Monorepo: `apps/api`, `apps/web`, `docs/`, `docker-compose.yml`, `README.md`. Repo: `github.com/Andr3sArteaga/agritrack`.

`apps/ml` (prototipo Python con scikit-learn) vive **solo en la rama `feat/prediccion-rf`**. No es parte de la plataforma en ejecución; la plataforma reimplementa el método en TypeScript.

---

## 3. Comandos (copiar y usar)

```bash
# DB
docker compose up -d                       # PostgreSQL en localhost:5433 (user/pass/db: agritrack)

# API  (cd apps/api)
cp .env.example .env                       # JWT_SECRET de ejemplo es solo dev
npm install
npx prisma migrate deploy --config prisma7.config.ts
npx prisma generate --config prisma7.config.ts   # el cliente va a src/generated (gitignored): hay que generarlo tras clonar
npx prisma db seed --config prisma7.config.ts
npm run seed:demo                          # datos iniciales del modelo (solo base local; se niega en produccion)
npm run start:dev                          # http://localhost:3001  | Swagger: /docs
npm run test                               # Jest unitarias
npm run test:integration                   # integracion con Postgres real (base agritrack_test, ver §10)
npm run build
npm run lint

# Web  (cd apps/web)
npm install
npm run dev                                # http://localhost:3000
npm run build
npm run lint
```

Usuarios de prueba (seed): `jefe@`, `contabilidad@`, `operativo@agroan.com` (contraseña en el README). **Solo desarrollo**; cambiar antes de cualquier despliegue.

Nueva migración: `npx prisma migrate dev --create-only --name <que_hace> --config prisma7.config.ts`, revisar el SQL, y luego `migrate deploy` en la base local **y** en `agritrack_test`.

---

## 4. Arquitectura y reglas de código

**Clean Architecture por módulo** en `apps/api/src/modules/<modulo>/`:

```
domain/          entidades, reglas (rules/) y puertos (interfaces). Sin Nest, sin Prisma.
application/     servicios/casos de uso y dto/
infrastructure/  implementaciones (repositorio Prisma, adaptadores)
presentation/    controller (HTTP, guards, Swagger)
```

Módulos existentes: `auth, parcelas, cultivos, campanas, actividades, integridad, reportes, prediccion, monitoreo, contactos, costos, public`. Compartido en `src/shared` (`prisma/`, `integridad/canonicalizar-actividad.ts`).

**Reglas (obligatorias):**
1. **Mira un módulo existente y copia su estructura** antes de crear uno nuevo. `monitoreo` es el más simple y reciente; `costos` es el más completo.
2. Las dependencias apuntan hacia adentro: `presentation → application → domain`; `infrastructure` implementa los puertos del dominio. El controller **nunca** usa Prisma directo.
3. Cada endpoint declara `@UseGuards(JwtAuthGuard, RolesGuard)` y `@Roles(...)` explícitos. Lo público vive solo bajo `public/`.
4. DTO con `class-validator` en toda entrada (hay `ValidationPipe` global). Documentar con decoradores de Swagger.
5. **Sin `any`**, sin lógica de negocio en controllers, sin queries sueltas fuera de repositorios, sin código duplicado: si algo se repite 2 veces, extráelo.
6. Nada de abstracciones especulativas. **Una cosa a la vez**: el cambio mínimo que cumple el requerimiento.
7. Nombres de dominio en **español** (`parcela`, `campana`, `actividad`, `rendimiento`), consistentes con el schema.
8. Frontend: páginas en `apps/web/src/app`, componentes en `src/components`, acceso a la API solo vía `src/lib/api.ts`, tipos en `src/lib/types.ts`.
9. Roles en código: `JEFE`, `CONTABILIDAD`, `OPERATIVO`. (En la tesis algunos RF dicen "Administrador" = JEFE.)
10. Las reglas de negocio van en `domain/rules/` como funciones puras con su `.spec.ts` al lado.

**Reglas visuales de la web (ya aplicadas, respétalas):**
- Cuatro estados: Bien, Atención, Crítico y Sin datos. Cada uno se distingue por color **+ ícono + palabra** (`components/estado/estado-badge.tsx`). "Sin datos" lleva borde punteado.
- **Un dato que falta nunca se muestra como "Bien".** Un dato cargado sin regla que lo evalúe se muestra como "Registrado" (`ChipRegistrado`), no como un estado.
- Texto en español simple, frases cortas, botones de al menos 44 px de alto, sin scroll horizontal a 360 px.
- Tokens de color en `app/globals.css` (`bien-*`, `atencion-*`, `critico-*`, `sindatos-*`, `pend-*`). Tailwind necesita las clases completas, no armadas con texto.
- Lógica de presentación en `src/lib` como funciones puras (`resumen-parcela.ts`, `estado.ts`), separada de la carga (`cargar-resumen.ts`).

---

## 5. Integridad de datos — ZONA SENSIBLE

Mecanismo central de la tesis. **No lo modifiques sin que Andrés lo pida explícitamente.**

- `Actividad` es **inmutable**: nunca `UPDATE`/`DELETE`. Un error se corrige con un **nuevo registro** que apunta al original en `correccionDeId`.
- Hash = SHA-256 sobre el JSON **canónico** (campos en orden fijo, ver `shared/integridad/canonicalizar-actividad.ts`) + `hashAnterior` (cadena).
- La inserción corre en transacción con `pg_advisory_xact_lock(851204)` para serializar la cadena (`actividad.prisma.repository.ts → crearConIntegridad`). La `secuencia` se calcula como `MAX(secuencia)+1` bajo ese lock, **no** con `nextval()`.
- Si agregas un campo a `Actividad`, decide si entra en la canonicalización; **cambiarla invalida los hashes ya guardados** → requiere migración/re-seed consciente.
- **Datos nuevos que no son labores van en tablas propias**, no en `Actividad`. Así se hizo con `registros_cosecha`, `analisis_suelo` y `registros_clima`.
- Todo cambio aquí necesita una prueba (ver §8).

---

## 6. Estado actual (qué existe de verdad)

### 6.1 Modelo de datos: 15 modelos

`Usuario, Parcela, Cultivo, Campana, Actividad, Contacto` · costos: `Insumo, PrecioInsumo, Gasto, Presupuesto` · estimación: `RegistroCosecha, TotalCampana, ModeloIa` · monitoreo: `AnalisisSuelo, RegistroClima`.

Migraciones: `init`, `add_parcela_poligono`, `costos_modelos`, `registros_cosecha_y_totales`, `modelos_ia`, `monitoreo_suelo_clima`, `monitoreo_humedad_suelo`. Todas las posteriores a `costos_modelos` son solo aditivas.

El diseño completo de la tesis tiene 28 tablas: **el schema real es un subconjunto**. No migres a las 28 de golpe: se agregan tablas solo cuando una tarea las necesita.

### 6.2 Hecho (API + web)

- **Auth y roles:** login, JWT, guards. `POST /auth/register`, `POST /auth/login`, `GET /auth/me`.
- **Parcelas:** polígono GeoJSON, área por Turf, aviso de superposición, habilitar preventa, activar/desactivar. Pantalla con lista + mapa (polígonos por estado, leyenda, panel flotante, resaltado cruzado).
- **Cultivos y campañas.**
- **Actividades con cadena de integridad** y pantalla de registro (`app/panel/parcelas/[id]/actividad-form.tsx`), incluidas correcciones.
- **Integridad:** verificación global y por parcela.
- **Costos (RF-26, 27, 29, 30):** insumos con historial de precios (solo API), gastos pagado/comprometido con anulación, presupuesto, resumen en pantalla (`/panel/costos`). La regla está en `costos/domain/rules/calcular-resumen-costos.ts`.
- **Reportes:** histórico, dashboard y reporte por campaña (RF-42) con su pantalla de detalle.
- **Estimación de rendimiento:** ver §6.4.
- **Monitoreo:** suelo (pH, N, P, K, materia orgánica, humedad) y clima diario, con carga manual desde el detalle de la parcela. Ver §6.3.
- **Parte pública:** inicio, catálogo y detalle con mapa grande; login.
- **Rediseño visual** de todo lo anterior (guía en `docs/guia-visual/`).
- **Pruebas:** 221 unitarias (`npm run test`) y 21 de integración con PostgreSQL real. La web no tiene pruebas.

### 6.3 Monitoreo de suelo y clima

- Endpoints: `GET/POST /monitoreo/suelo`, `GET/POST /monitoreo/clima`. Leen los tres roles; escriben JEFE y OPERATIVO.
- Suelo: todos los valores son opcionales, pero hay que mandar al menos uno. N, P y K en ppm; materia orgánica y humedad en %. **Las unidades no están confirmadas con el laboratorio de AgroAn.**
- Clima: una condición por parcela y día (`SOLEADO, NUBLADO, LLUVIA_LIGERA, LLUVIA_FUERTE, HELADA, GRANIZO, VIENTO_FUERTE`) y milímetros opcionales solo si llovió. Anotar el mismo día otra vez reemplaza el registro.
- En pantalla, cada valor de suelo se toma del registro más reciente que lo trae. La humedad también puede venir de una labor `MEDICION_HUMEDAD_SUELO`; gana la más nueva.
- **No hay reglas agronómicas.** Los valores se muestran como "Registrado", sin Bien/Atención/Crítico. No inventes rangos: si Andrés los entrega por cultivo, van en `domain/rules/` con pruebas.
- No hay editar ni borrar.

### 6.4 Estimación de rendimiento

- **Línea base oficial:** promedio de los rendimientos totales por campaña de las campañas anteriores del cultivo (`TotalCampana`). Una campaña con total nulo no entra. Sin total registrado, se calcula con la suma de los lotes.
- **Random Forest experimental:** 300 árboles, semilla 42. Predictores: superficie sembrada, variedad (one-hot) y días desde el 1 de octubre a la siembra. Se entrena la variante A; la B (con `lag_1`) solo se evalúa.
- **Prohibido** usar datos posteriores a la siembra como predictores. `verificarPredictores` falla si entran y hay pruebas que lo cubren.
- **Validación:** walk-forward, bootstrap por lote (1000 repeticiones, semilla 12345).
- **Activación:** solo con datos reales, ≥ 3 campañas, mejor que la línea base en el global y no peor en la última campaña (intervalos que excluyen 0). Si no, `experimental`.
- **Datos iniciales:** `prisma/seeds/demo/` (5 campañas de soya, 42 lotes, **enmascarados**). Origen interno `demo_enmascarado`; en pantalla se llaman **"Datos iniciales (V1)"**. Nunca activan un modelo. Las 42 parcelas se ocultan por defecto en el panel (filtro "Mostrar datos iniciales (V1)").
- **Nunca copies nada de `Datos_AgroAn/privado/` ni datos reales al repo.**
- Endpoints: `GET /prediccion/estimacion`, `POST /prediccion/entrenar`, `GET /prediccion/modelos`, `GET /prediccion/datos-demo`. `GET /prediccion` (la estimación anterior) **no cambió** y la siguen usando el Resumen y la parte pública.
- Explicación completa: `docs/prediccion/EXPLICACION_COMPONENTE_PREDICCION.md`.

### 6.5 Ramas

| Rama | Contenido |
|---|---|
| `main` | Hasta el incremento de integridad y sus pruebas. |
| `feat/costos`, `feat/reportes` | Costos y reporte por campaña. |
| `feat/rediseno-visual` | Rediseño visual. |
| `feat/prediccion-componente` | Componente de estimación (sale de la anterior). |
| `feat/suelo-clima` | Monitoreo de suelo y clima (sale de la anterior). **Es la más avanzada.** |
| `feat/prediccion-rf` | Prototipo Python en `apps/ml`. |

Cada rama contiene a la anterior de la lista (salvo `feat/prediccion-rf`). Falta integrar todo a `main`: eso lo decide Andrés.

---

## 7. Lo que falta para llegar al 100 % de los 5 objetivos

Sigue el orden por objetivo salvo que Andrés diga otro. Antes de empezar una tarea: confirma el RF en el documento de la tesis, **no inventes alcance**, y verifica contra el código que de verdad falta.

Cada tarea trae: **qué hay**, **qué falta**, **dónde tocar**, **pasos** y **cuándo está terminada**.

### Objetivo 1 — Registro de parcelas, campañas y labores (≈ 85 %)

**T1.1 Registro de siembra y cosecha real por campaña (RF-22 a RF-24).** *Es la tarea más importante: desbloquea el objetivo 3 con datos reales.*
- Qué hay: la tabla `registros_cosecha` y su lectura en `prediccion/infrastructure/datos-rendimiento.prisma.repository.ts`. Solo se llena con el seed.
- Qué falta: endpoint y formulario para que JEFE/OPERATIVO carguen, por campaña, la siembra (variedad, fecha, ha sembradas) y luego la cosecha (fecha, ha cosechadas, toneladas), con `origen = "real"`.
- Dónde: API en el módulo `prediccion` (o uno nuevo `cosechas` copiando `monitoreo`); web en `app/panel/parcelas/[id]/` junto a `campana-form.tsx`.
- Pasos: (1) puerto y repositorio con `guardarSiembra` y `guardarCosecha` (upsert por `campanaId`); (2) reglas puras: ha cosechadas ≤ ha sembradas, toneladas ≥ 0, fecha de cosecha posterior a la siembra, no futura; (3) `PUT /campanas/:id/registro-cosecha` con roles JEFE y OPERATIVO; (4) dos formularios cortos en el detalle de la campaña; (5) pruebas unitarias de las reglas e integración del upsert.
- Terminada cuando: una campaña real con siembra cargada devuelve estimación experimental en `GET /prediccion/estimacion`, y con 2 campañas cosechadas se puede entrenar con origen `real`.
- Cuidado: no escribir en `Actividad`. La labor de COSECHA sigue existiendo aparte; decide con Andrés si el formulario crea ambas o solo el registro.

**T1.2 Total de campaña por cultivo.**
- Qué falta: cargar `totales_campana` con datos reales (toneladas totales / ha cosechadas totales). Hoy, sin total, se usa la suma de los lotes y se avisa.
- Pasos: decidir con Andrés si se calcula solo al cerrar la campaña (T2.1) o se ingresa a mano. Si es automático, hacerlo dentro de T2.1.

**T1.3 Cierre de campaña y solo lectura (RF-14, RF-57).**
- Qué hay: `EstadoCampana` = PLANIFICADA, EN_CURSO, COSECHADA. `campanaPermiteGastos` en `costos/domain/rules/` preparada pero siempre devuelve true.
- Qué falta: estado `CERRADA` (migración que agrega el valor al enum), acción "Cerrar campaña" solo para JEFE, y bloqueo de nuevas actividades y gastos en campañas cerradas.
- Dónde: `campanas` (service + controller), `actividades` (validación antes de crear; **no** tocar `crearConIntegridad`), `costos/domain/rules/campana-permite-gastos.ts`, web en el detalle de parcela.
- Terminada cuando: una campaña cerrada rechaza actividades y gastos con un mensaje claro, y hay pruebas de las reglas.

**T1.4 Importar campañas pasadas desde plantilla (RF-35).**
- Qué hay: `write-excel-file` instalado y sin usar. El lector de CSV del seed (`prisma/seeds/demo/datos-demo.ts`) sirve de referencia para el formato.
- Qué falta: `POST` con archivo CSV que valide fila por fila y cree campañas + registros de cosecha con origen `real`; plantilla descargable; pantalla con vista previa de errores antes de confirmar.
- Cuidado: no crear actividades (no meter datos históricos en la cadena de hashes). Advertir si quedan menos de 3 campañas (RF-32).

**T1.5 Gestión de usuarios (RF-03, RF-05) y sesión (RF-02).**
- Qué falta: listar, crear, cambiar rol y desactivar usuarios (solo JEFE), y cierre de sesión por inactividad en la web.
- Dónde: módulo `auth` (hoy solo `register`, `login`, `me`); nueva pantalla `/panel/usuarios`; temporizador en `lib/auth-context`.

**T1.6 Planificación de labores (RF-21) y filtros (RF-08, RF-48, RF-54).** Prioridad baja. Confirmar alcance en la tesis antes de empezar.

**T1.7 Pantallas pendientes del rediseño:** formulario de crear/editar parcela (`parcela-form.tsx`), reportes y contactos siguen con el estilo anterior. Aplicar la guía visual (§4).

**T1.8 Editar y borrar en monitoreo.** Hoy un análisis de suelo mal cargado no se puede corregir. Agregar edición o anulación con motivo, como en gastos.

### Objetivo 2 — Integridad de los datos (≈ 80 %)

**T2.1 Huella SHA-256 al cierre de campaña (RF-58).**
- Qué hay: hash por actividad y verificación global/por parcela.
- Qué falta: al cerrar (T1.3), calcular y guardar una huella de la campaña: SHA-256 de los hashes de sus actividades vigentes en orden de secuencia, más los totales de cosecha. Mostrarla en el reporte por campaña y permitir re-verificarla.
- Dónde: tabla nueva `cierres_campana` (campanaId único, huella, fecha, usuario); regla pura en `integridad/domain/rules/`; no tocar la canonicalización.
- Terminada cuando: alterar una actividad de una campaña cerrada hace fallar la verificación de su huella, con prueba de integración.

**T2.2 Bitácora general (RF-55, RF-59).**
- Diseño ya aprobado por Andrés: extensión de Prisma (`$extends`, Prisma 7 no tiene `$use`) + `AsyncLocalStorage` para saber qué usuario hizo cada cambio; un helper `transaccion(fn)`; `NULLIF` en el trigger; y una prueba de arquitectura que exija que `.$transaction(` solo aparezca en los archivos permitidos.
- **Trampa conocida:** el `await` debe quedar DENTRO del contexto (§10).
- Ojo: `modelo-ia.prisma.repository.ts` ya usa `$transaction`; inclúyelo en la lista de permitidos o pásalo al helper.
- Terminada cuando: crear, editar o anular un registro deja una fila en la bitácora con usuario, fecha y tabla, y hay una pantalla de consulta para JEFE.

**T2.3 Límite conocido:** borrar el último registro de la cadena no se detecta. `verificarPorParcela` solo valida cada registro contra su propio `hashAnterior`. Documentado; la huella de T2.1 lo mitiga para campañas cerradas.

**T2.4 Parte pública con cero registros:** `registrosVerificados` devuelve true aunque no haya ningún registro, y se ve "Bien". Hay que devolver también la cantidad y mostrar "Sin datos" si es 0 (`public` + `app/parcelas/[id]/page.tsx`).

### Objetivo 3 — Estimación de rendimiento (≈ 75 %)

**T3.1 Datos reales:** depende de T1.1 (y T1.4 para el historial). Sin eso, el modelo solo funciona con los datos iniciales.

**T3.2 Entrenamiento automático al cerrar campaña (RF-34).** `EntrenamientoService.entrenarAlCerrarCampana(cultivoId)` ya existe y nadie lo llama. Llamarlo desde el cierre (T1.3), sin que un fallo del entrenamiento impida cerrar.

**T3.3 Pantalla de modelos para JEFE.** Lista de versiones con estado, campañas usadas y métricas por corte (ya las devuelve `GET /prediccion/modelos`), y botón "Entrenar ahora". Nueva ruta `/panel/prediccion` o sección dentro de reportes.

**T3.4 Unificar las dos líneas base.** `GET /prediccion` (promedio de actividades COSECHA) y la oficial nueva conviven. Cuando haya datos reales en `registros_cosecha`, migrar el Resumen, `components/estado/estimacion-rendimiento.tsx` y la parte pública a la nueva, y retirar `PromedioHistoricoPredictor`. **Cambia contratos existentes: pedir permiso antes.**

**T3.5 Parte pública (RF-52):** no mostrar nunca la estimación del modelo. Opcional: "Referencia histórica" con rango, detrás de un ajuste apagado por defecto. La advertencia de RF-32 (`MENOS_DE_TRES_CAMPANAS` en `lib/textos.ts`) está oculta hasta que Andrés la apruebe: cambiar su `estado` a `DADO_POR_EQUIPO` la publica.

**T3.6 Que desaparezca "Datos iniciales (V1)".** Ya ocurre solo: la etiqueta depende de `origen_datos`. Cuando el cultivo tenga registros reales, el entrenamiento usa esos y la etiqueta deja de salir. Verificarlo con una prueba cuando exista T1.1.

**T3.7 Pendientes menores:** el modelo serializado vive en la base como JSON (mover a archivos si crece); la paridad con Python compara conclusiones, no números.

### Objetivo 4 — Costos por campaña (≈ 85 %)

**T4.1 Endpoint de resumen (parte D).** Crear `GET /costos/campanas/:id/resumen` que use `calcular-resumen-costos.ts`, y reemplazar el cálculo temporal de `apps/web/src/lib/costos.ts`.

**T4.2 Costo automático de insumos aplicados (RF-28).** `Actividad.insumo` es texto libre, sin relación con `Insumo`. Opciones: (a) tabla puente `aplicaciones_insumo` (actividadId, insumoId, cantidad) fuera de la cadena, recomendada; (b) agregar campos a `Actividad`, que toca la zona sensible (§5). **Decidir con Andrés antes.** Costo = cantidad × precio vigente a la fecha (ya existe en `insumo.prisma.repository.ts`).

**T4.3 Pantalla del catálogo de insumos** con historial de precios (la API ya está).

**T4.4 Costo por tonelada.** Hoy es null sin producción real; con T1.1 se puede calcular con las toneladas de `registros_cosecha`.

### Objetivo 5 — Preventa (≈ 95 %)

**T5.1** T2.4 (registros con cero actividades) y T3.5 (texto de RF-32).
**T5.2** Revisar los textos nuevos de la parte pública con Andrés (`lib/textos.ts` marca cuáles están pendientes de revisión).

### Transversales

- **Reportes:** exportar a PDF y Excel (RF-44; `pdfmake` y `write-excel-file` ya instalados), reporte por campaña completo (RF-43) y alertas (RF-45).
- **Recomendaciones de riego y abono (RF-37 a RF-40):** dependen de reglas agronómicas que nadie entregó. No implementar sin ellas.
- **Clima automático (RF-36):** hoy es manual. Solo se conoce la coordenada de la finca (-17.73902, -62.57987).
- **Pruebas de la web:** no hay. No agregar un runner sin permiso (es una dependencia nueva).
- **CI (GitHub Actions), despliegue y manuales:** no existen. En producción: cerrar CORS, cambiar `JWT_SECRET` y contraseñas, no correr `seed:demo`.
- **Integrar las ramas a `main`** y etiquetar versiones.

---

## 8. Cómo trabajar (flujo para cada sesión)

1. **No releas todo el repo.** Usa este archivo + el módulo que vas a tocar + `schema.prisma`.
2. Di en qué rama estás. Resume en 3 líneas qué vas a hacer y qué tarea de §7 cubre; luego hazlo. Sin planes largos.
3. Cambios **pequeños y completos**: backend + frontend + (si aplica) seed + prueba de la misma tarea. No dejes medias implementaciones.
4. Antes de dar algo por terminado: `npm run test`, `npm run test:integration`, `npm run build` y `npm run lint` en api; `npm run build` y `npm run lint` en web; y probar el flujo real en el navegador (login → acción → resultado), también a 360 px. Si no pudiste probarlo, dilo.
5. Si necesitas cambiar `schema.prisma`: nueva migración, nunca editar una ya aplicada, y aplicarla también en `agritrack_test`.
6. **Detente y pregunta** antes de: modificar o borrar columnas de tablas existentes, tocar la cadena de hashes, hacer una migración destructiva o cambiar el contrato de un endpoint existente. Lo que solo agrega cosas nuevas puede seguir.
7. Si algo no está claro: **pregunta una vez, corta y concreta**, con tu recomendación.
8. No agregues dependencias nuevas sin decir por qué.
9. Nunca commitees `.env`, credenciales, `src/generated` ni datos reales de la empresa.
10. **No actualices el documento de la tesis ni propongas qué anotar en sus capítulos**, salvo que Andrés lo pida.

**Git:**
- **No hagas commit, push ni cambies de rama sin permiso explícito de Andrés** en esa sesión.
- Commits en **Conventional Commits**, scope `api` o `web` (`feat(api): ...`, `fix(web): ...`, `docs: ...`, `chore: ...`). Una tarea = commits propios.
- **Sin línea `Co-Authored-By`** ni ninguna mención a herramientas de IA en commits o PR. El historial se reescribió una vez para quitarlas; no las vuelvas a agregar.
- Nada de WIP en `main`. No uses `--force` sin permiso explícito.

---

## 9. Relación con la tesis

- El documento tiene **59 RF (RF-01…RF-59) en 12 módulos y 18 RNF**. Los números de RF de este archivo salen de ahí; si dudas de qué pide un RF, pregúntale a Andrés.
- Moneda: **Bs**. Rendimiento siempre en **t/ha**.
- Los datos de demo del seed general son ficticios, y los datos iniciales del modelo están enmascarados: **no presentarlos como datos reales de AgroAn**.
- La tesis la escribe Andrés. Ver regla 10 de §8.

---

## 10. Trampas conocidas

- **Jest + Nest 12:** los paquetes `@nestjs/*` son ESM-only y Jest corre en CJS; con Node < 24.9 no pueden cargarse. En los specs **no uses `@nestjs/testing`**: mockea los decoradores con `jest.mock('@nestjs/common', () => ({ Injectable: () => () => undefined, Inject: () => () => undefined, ... }))` (agrega los que use la clase, incluidas las excepciones como `ConflictException`) e instancia con `new`. Ejemplos: `integridad.service.spec.ts`, `prediccion/application/componente-prediccion.spec.ts`.
- **Probar un controller en integración:** hay que mockear también `@nestjs/swagger`, los guards y `roles.decorator`. Ver `test/integracion/prediccion-componente.integration-spec.ts`. No levanta HTTP: los códigos 401/403/400 se prueban a mano con la API corriendo.
- Jest necesita el cliente Prisma generado (`src/generated`): corre `prisma generate` tras clonar. El `rootDir: "."` de `tsconfig.json` es obligatorio con TypeScript 6.
- Los specs de integridad usan `test/helpers/cadena-integridad.ts`. Los valores *golden* de `canonicalizar-actividad.spec.ts` fijan el formato: si fallan, cambió la canonicalización (§5); no "arreglar" el test.
- **Pruebas de integración:** usan `agritrack_test` (nunca la de desarrollo). Crearla una vez: `docker exec agritrack-db psql -U agritrack -d postgres -c "CREATE DATABASE agritrack_test"` y aplicar las migraciones con `DATABASE_URL=...agritrack_test...`. El script usa `--experimental-vm-modules`.
- **Extensión de Prisma + `AsyncLocalStorage` (bitácora): el `await` va DENTRO del contexto.** Las consultas de Prisma son perezosas: se ejecutan al hacer `await`. `contexto.run(ctx, () => cliente.x.create(...))` sin `await` adentro registra `usuario = null`. Lo correcto: `contexto.run(ctx, async () => { await cliente.x.create(...) })`. Prueba de referencia en `docs/evidencias/2026-11-02/pruebas-temporales/`.
- Prisma 7 CLI: usa siempre `--config prisma7.config.ts`. `migrate dev --create-only` funciona sin modo interactivo.
- **Scripts por consola con comillas y tildes fallan** en este entorno (heredoc con `'`, `«»`). Escribe los archivos con la herramienta de edición, no con `cat <<EOF`.
- **Web:** tras cambios grandes, si el navegador muestra algo viejo, detén el servidor y borra `apps/web/.next`.
- **Datos iniciales en el panel:** `GET /reportes/dashboard` cuenta también las 42 parcelas de datos iniciales en `hectareasTotales`. La web lo evita sumando solo las parcelas visibles; no uses ese campo directo.
- **Carga del resumen:** `lib/cargar-resumen.ts` hace varias peticiones por parcela. Filtra las parcelas de datos iniciales **antes** de cargarlas (ya lo hace) o serán cientos de peticiones.
- Roles y endpoints: `/actividades` solo JEFE y OPERATIVO; `/integridad` y `/reportes` solo JEFE y CONTABILIDAD. `cargar-resumen.ts` ya lo contempla.
- Las teselas del mapa necesitan internet; sin conexión se ve el polígono sobre gris (normal).
- CORS está abierto en desarrollo; **cerrarlo** en producción. `JWT_SECRET` de `.env.example` y las contraseñas del seed son solo de desarrollo.
