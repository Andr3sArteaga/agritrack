# AgriTrack

Plataforma web de gestión agrícola para AgroAn (Pailón Sur, Santa Cruz, Bolivia). Es un proyecto de grado: permite registrar el trabajo de campo de cada parcela, proteger esos registros contra cambios, controlar los costos por campaña, estimar el rendimiento y mostrar a compradores e inversionistas las parcelas disponibles para preventa.

## Qué hace

**Parte pública (sin cuenta)**

- Página de inicio y catálogo de parcelas habilitadas para preventa.
- Detalle de parcela: mapa con el polígono, cultivo actual, línea base de rendimiento, historial de cuidado de la campaña actual, histórico de rendimiento, estado de "registros protegidos contra cambios" y datos de contacto.
- No muestra estimaciones del modelo ni permite transacciones.

**Panel privado (con cuenta y roles JEFE, CONTABILIDAD y OPERATIVO)**

- **Resumen:** estado de cada parcela (Bien, Atención, Crítico o Sin datos) y resumen de la operación.
- **Parcelas:** lista y mapa con polígonos coloreados por estado, alta y edición con dibujo del polígono (el área se calcula sola) y habilitación para preventa.
- **Detalle de parcela:** estado por área (suelo, labores y cosecha, clima), campañas, registro de actividades y estimación de rendimiento.
- **Suelo y clima:** carga manual de análisis de suelo, humedad y clima diario.
- **Costos:** gastos pagados y comprometidos por campaña, presupuesto, ahorro y costo por hectárea.
- **Reportes:** histórico de rendimiento, reporte por campaña y verificación de integridad.
- **Contactos:** compradores, transportistas y proveedores.

## Tecnologías

| Capa | Tecnología |
|---|---|
| API | NestJS 12, TypeScript 6, Swagger en `/docs` |
| Datos | Prisma 7.10 (`@prisma/adapter-pg`), PostgreSQL 16 en Docker |
| Autenticación | JWT (passport-jwt), bcrypt, guards de rol |
| Estimación de rendimiento | `ml-random-forest` 2.1 dentro de la API |
| Web | Next.js 16 (App Router), React 19, Tailwind CSS 4, Recharts, Axios |
| Mapas | Leaflet, react-leaflet, Geoman, Turf |
| Pruebas | Jest (unitarias e integración con PostgreSQL real) |

## Arquitectura

Monorepo con dos aplicaciones y una base de datos:

```
AgriTrack/
├── docker-compose.yml          # PostgreSQL 16 en localhost:5433
├── CLAUDE.md                   # contexto del proyecto y tareas pendientes
├── docs/
│   ├── evidencias/             # salidas de pruebas, build y lint
│   ├── guia-visual/            # guía de estados, colores y textos
│   └── prediccion/             # explicación del componente de estimación
└── apps/
    ├── api/                    # NestJS + Prisma
    │   ├── prisma/
    │   │   ├── schema.prisma
    │   │   ├── migrations/
    │   │   ├── seed.ts         # datos de prueba generales
    │   │   └── seeds/demo/     # datos iniciales del modelo (enmascarados)
    │   ├── src/
    │   │   ├── modules/        # un módulo por tema (ver abajo)
    │   │   └── shared/         # PrismaService y canonicalización de actividades
    │   └── test/integracion/   # pruebas contra PostgreSQL real
    └── web/                    # Next.js (App Router)
        └── src/
            ├── app/            # rutas públicas (/, /parcelas, /login) y privadas (/panel/**)
            ├── components/     # estado, mapa, público, formularios
            └── lib/            # cliente de la API, tipos y lógica de presentación
```

### Capas de cada módulo de la API

Cada módulo de `apps/api/src/modules/` sigue la misma estructura, con las dependencias apuntando hacia adentro:

| Capa | Contenido |
|---|---|
| `domain/` | Entidades, reglas de negocio y puertos (interfaces). No depende de NestJS ni de Prisma. |
| `application/` | Servicios (casos de uso) y DTO. |
| `infrastructure/` | Implementaciones de los puertos: repositorios Prisma y adaptadores. |
| `presentation/` | Controladores HTTP, guards y documentación Swagger. |

### Módulos

| Módulo | Qué resuelve |
|---|---|
| `auth` | Inicio de sesión, JWT y roles. |
| `parcelas` | Parcelas con polígono GeoJSON y habilitación para preventa. |
| `cultivos` | Catálogo de cultivos. |
| `campanas` | Campañas por parcela y cultivo. |
| `actividades` | Labores de campo inmutables, con cadena de integridad. |
| `integridad` | Verificación de la cadena, global y por parcela. |
| `costos` | Insumos con historial de precios, gastos y presupuesto por campaña. |
| `reportes` | Histórico, resumen y reporte por campaña. |
| `prediccion` | Estimación de rendimiento: línea base y Random Forest. |
| `monitoreo` | Análisis de suelo, humedad y clima cargados a mano. |
| `contactos` | Agenda de contactos. |
| `public` | Catálogo y detalle públicos, sin autenticación. |

### Integridad de los registros

Las actividades no se editan ni se borran: un error se corrige con un registro nuevo que apunta al original. Cada actividad guarda un hash SHA-256 de su contenido canónico más el hash del registro anterior, formando una cadena. La inserción se serializa con `pg_advisory_xact_lock`, y la verificación recalcula la cadena y avisa si algún registro cambió. No usa blockchain.

## Estimación de rendimiento (aprendizaje automático)

El componente compara dos formas de estimar las toneladas por hectárea de un lote antes de sembrar:

- **Línea base (estimación oficial):** promedio de los rendimientos totales de las campañas anteriores del mismo cultivo.
- **Random Forest (estimación experimental):** modelo entrenado con datos por lote y campaña.

### Cómo está construido

- **Puertos:** `EstimadorRendimientoPort` (respuesta común de ambos estimadores) y `RegresorPort` (el algoritmo). El dominio no conoce la librería; solo `infrastructure/random-forest.regresor.ts` importa `ml-random-forest`.
- **Adaptadores:** `LineaBaseAdapter` y `RandomForestAdapter`.
- **Modelo:** 300 árboles, semilla fija 42. Se guarda serializado en la base de datos.
- **Predictores (solo lo conocido a la siembra):** superficie sembrada, variedad (one-hot) y días desde el 1 de octubre hasta la siembra. Hay una prueba que falla si un dato posterior a la siembra entra al modelo.
- **Validación walk-forward:** para cada campaña desde la segunda, se entrena solo con las anteriores y se prueba en ella.
- **Métricas:** error absoluto medio (MAE) del modelo y de la línea base, y su diferencia con intervalo de confianza por bootstrap sobre lotes (1000 repeticiones, semilla 12345).
- **Versiones:** cada entrenamiento crea una versión en `modelos_ia` con sus métricas, las campañas usadas y un hash de los datos.

### Cuándo manda el modelo

Un modelo pasa a `activo`, y su estimación a ser la oficial, solo si cumple todo esto:

1. Hay al menos 3 campañas del cultivo.
2. Supera a la línea base en el resultado global, con un intervalo que excluye 0.
3. No es peor que la línea base en la última campaña.
4. Está entrenado con datos reales.

Si no, queda `experimental` y se muestra aparte, con esa etiqueta. Hoy el modelo está en ese estado: con los datos iniciales gana en dos campañas y pierde en la más reciente.

### Datos

- **Tablas:** `registros_cosecha` (siembra y cosecha por parcela y campaña), `totales_campana` (rendimiento total por cultivo y temporada) y `modelos_ia`.
- **Datos iniciales:** `prisma/seeds/demo/` trae 5 campañas de soya en 42 lotes. Están enmascarados: no son los valores reales de la empresa. En pantalla aparecen como "Datos iniciales (V1)" y están ocultos por defecto en las listas.
- **Datos reales:** se usarán cuando existan registros de cosecha propios. Reales e iniciales nunca se mezclan en un mismo entrenamiento.

### Endpoints

| Método y ruta | Rol | Qué hace |
|---|---|---|
| `GET /prediccion/estimacion?lote=&campana=` | Cualquiera con sesión | Estimación oficial y experimental de un lote. |
| `POST /prediccion/entrenar?cultivo=` | JEFE | Entrena, evalúa y guarda una versión. |
| `GET /prediccion/modelos?cultivo=` | JEFE | Versiones con estado y métricas. |
| `GET /prediccion/datos-demo` | Cualquiera con sesión | Parcelas de datos iniciales, para el filtro del panel. |
| `GET /prediccion` | Cualquiera con sesión | Estimación anterior (promedio de cosechas), que aún usan el Resumen y la parte pública. |

El detalle técnico y una explicación sencilla están en [docs/prediccion/EXPLICACION_COMPONENTE_PREDICCION.md](docs/prediccion/EXPLICACION_COMPONENTE_PREDICCION.md).

### Prototipo en Python

El prototipo con scikit-learn que sirvió de referencia vive en la rama `feat/prediccion-rf`, en `apps/ml/`. No forma parte de la plataforma en ejecución. La plataforma reproduce sus conclusiones corte por corte; los números difieren en el segundo decimal porque son librerías distintas.

## Requisitos previos

- Node.js 22 o superior
- npm
- Docker

## Instalación y ejecución

### 1. Levantar la base de datos

```bash
docker compose up -d
```

PostgreSQL queda en `localhost:5433` (usuario, contraseña y base: `agritrack`).

### 2. Variables de entorno

En `apps/api`:

```bash
cp .env.example .env
```

En `apps/web`, crea `.env.local` con:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 3. Dependencias

```bash
cd apps/api && npm install
cd ../web && npm install
```

### 4. Migraciones y cliente de Prisma

Desde `apps/api`:

```bash
npx prisma migrate deploy --config prisma7.config.ts
npx prisma generate --config prisma7.config.ts
```

### 5. Datos de prueba

```bash
npx prisma db seed --config prisma7.config.ts
```

Crea 3 usuarios (uno por rol), cultivos, parcelas, campañas con actividades y cosechas, costos y contactos.

Opcional, para probar la estimación de rendimiento:

```bash
npm run seed:demo
```

Carga los datos iniciales del modelo. Solo corre contra una base local y se niega con `NODE_ENV=production`. Después hay que entrenar con `POST /prediccion/entrenar?cultivo=<id de Soya>` como JEFE.

### 6. Correr la API y la web

Desde `apps/api`:

```bash
npm run start:dev
```

En otra terminal, desde `apps/web`:

```bash
npm run dev
```

## URLs locales

| Servicio | URL |
|---|---|
| Web | http://localhost:3000 |
| API | http://localhost:3001 |
| Swagger | http://localhost:3001/docs |

## Usuarios de prueba

Solo para desarrollo. Hay que cambiarlos antes de cualquier despliegue.

| Rol | Correo | Contraseña |
|---|---|---|
| JEFE | jefe@agroan.com | Agroan2025! |
| CONTABILIDAD | contabilidad@agroan.com | Agroan2025! |
| OPERATIVO | operativo@agroan.com | Agroan2025! |

## Pruebas

Desde `apps/api`:

```bash
npm run test
```

```bash
npm run test:integration
```

Las de integración usan la base `agritrack_test`, nunca la de desarrollo. Se crea una vez:

```bash
docker exec agritrack-db psql -U agritrack -d postgres -c "CREATE DATABASE agritrack_test"
```

```bash
DATABASE_URL=postgresql://agritrack:agritrack@localhost:5433/agritrack_test?schema=public npx prisma migrate deploy --config prisma7.config.ts
```

Resultado actual: 221 pruebas unitarias y 21 de integración pasan. La web no tiene pruebas automáticas todavía.

## Estado del proyecto

**Hecho**

- Autenticación y roles.
- Parcelas con mapa, campañas y actividades con cadena de integridad.
- Verificación de integridad global y por parcela.
- Costos por campaña: gastos, presupuesto, ahorro y costo por hectárea.
- Reportes: histórico, resumen y reporte por campaña.
- Estimación de rendimiento con línea base oficial y Random Forest experimental.
- Carga manual de suelo, humedad y clima.
- Parte pública de preventa y contactos.
- Rediseño visual con estados claros y accesibles.

**Pendiente**

- Registrar siembra y cosecha reales por campaña, e importar campañas pasadas desde una plantilla.
- Cierre de campaña con huella de integridad y bitácora general.
- Costo automático de los insumos aplicados en las labores.
- Exportar reportes a PDF y Excel, y alertas.
- Gestión completa de usuarios.
- Integración continua, despliegue y manuales.

La lista detallada, con los pasos de cada tarea, está en [CLAUDE.md](CLAUDE.md).
