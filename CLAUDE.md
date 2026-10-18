# CLAUDE.md — AgriTrack (proyecto de grado, cliente AgroAn)

> Léelo completo antes de tocar código. Si algo de aquí contradice lo que ves en el repo, **avisa a Andrés**; no lo "arregles" en silencio.
> Idioma de trabajo: español casual. Andrés escribe rápido y con typos: interpreta la intención, no pidas aclaraciones triviales.

---

## 1. Qué es esto (y qué NO es)

**AgriTrack** es un sistema web de gestión agrícola para **AgroAn** (empresa agrícola en Pailón Sur, Santa Cruz, Bolivia; cultiva soya, sorgo, trigo y sésamo). Es el **proyecto de grado de Andrés** (Ing. de Sistemas, UNIVALLE). El código y la tesis deben mantenerse coherentes entre sí.

**Objetivos del sistema (no te salgas de aquí):**
1. Registro completo y fácil de parcelas, campañas y labores de campo.
2. Integridad de los datos: que lo registrado no sea fácilmente manipulable (hash chain SHA-256, simple, sin blockchain).
3. Estimación de rendimiento (t/ha) por parcela con **Random Forest** (hoy hay solo una línea base).
4. Costos por campaña (gastado, comprometido, ahorrado, costo/ha).
5. Preventa: comprador/inversionista **solo mira** parcelas habilitadas y datos de contacto. **Sin cuenta, sin transacciones.**

**Fuera de alcance (descartado, no lo propongas ni lo implementes):**
- Blockchain / smart contracts / certificación digital.
- Módulo de alquiler.
- Pagos, transacciones o cuentas de compradores.
- App móvil (es **web-only**).
- Asesor agrónomo como usuario: sus funciones (reglas de recomendación) las asume el rol JEFE.
- Microservicios, colas, GraphQL, caché, Kubernetes, y cualquier cosa "por si acaso".

**Fechas clave:** el docente pide ~**80 % del desarrollo hacia el 6 de nov 2026**. Cierre/entrega final: diciembre 2026. Prioriza lo que mueve el porcentaje y lo que la tesis ya promete.

---

## 2. Stack (versiones reales)

| Capa | Tecnología |
|---|---|
| API | NestJS ^12, TypeScript ^6, Swagger en `/docs` |
| Datos | Prisma **^7.10** + `@prisma/adapter-pg`, PostgreSQL 16 (Docker, puerto **5433**) |
| Auth | JWT (passport-jwt) + bcrypt ^6 + guards de rol |
| Web | Next.js 16.3.6 (App Router), React 19.2.8, Tailwind 4, Recharts, Axios |
| Mapas | Leaflet + react-leaflet + Geoman, `@turf/turf` (área desde GeoJSON), teselas Esri |

**No actualices a Prisma 8** (da problemas de compatibilidad con NestJS). No cambies de librería sin motivo fuerte.

Monorepo: `apps/api`, `apps/web`, `docker-compose.yml`, `README.md`. Repo: `github.com/Andr3sArteaga/agritrack`.

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
npm run start:dev                          # http://localhost:3001  | Swagger: /docs
npm run test                               # Jest (pruebas de integridad, etc.)
npm run build

# Web  (cd apps/web)
npm install
npm run dev                                # http://localhost:3000
npm run build
```

Usuarios de prueba (seed): `jefe@`, `contabilidad@`, `operativo@agroan.com` (contraseña en el README). **Solo desarrollo**; cambiar antes de cualquier despliegue.

---

## 4. Arquitectura y reglas de código

**Clean Architecture por módulo** en `apps/api/src/modules/<modulo>/`:

```
domain/          entidades y puertos (interfaces de repositorio). Sin Nest, sin Prisma.
application/     servicios/casos de uso y dto/
infrastructure/  implementaciones (repositorio Prisma, etc.)
presentation/    controller (HTTP, guards, Swagger)
```

Módulos existentes: `auth, parcelas, cultivos, campanas, actividades, integridad, reportes, prediccion, contactos, public`. Compartido en `src/shared` (`prisma/`, `integridad/canonicalizar-actividad.ts`).

**Reglas (obligatorias):**
1. **Mira un módulo existente (ej. `parcelas`) y copia su estructura** antes de crear uno nuevo. No inventes otro estilo.
2. Las dependencias apuntan hacia adentro: `presentation → application → domain`; `infrastructure` implementa los puertos del dominio. El controller **nunca** usa Prisma directo.
3. Cada endpoint declara `@UseGuards(JwtAuthGuard, RolesGuard)` y `@Roles(...)` explícitos. Lo público vive solo bajo `public/`.
4. DTO con `class-validator` en toda entrada (hay `ValidationPipe` global). Documentar con decoradores de Swagger.
5. **Sin `any`**, sin lógica de negocio en controllers, sin queries sueltas fuera de repositorios, sin código duplicado: si algo se repite 2 veces, extráelo.
6. Nada de abstracciones especulativas. **Una cosa a la vez**: el cambio mínimo que cumple el requerimiento.
7. Nombres de dominio en **español** (`parcela`, `campana`, `actividad`, `rendimiento`), consistentes con el schema. Código/identificadores técnicos pueden ir en inglés si ya es la convención del archivo.
8. Frontend: páginas en `apps/web/src/app`, componentes en `src/components`, acceso a la API solo vía `src/lib/api.ts`, tipos en `src/lib/types.ts`. Mantener el estilo visual ya existente (verde AgriTrack, tarjetas simples).
9. Roles en código: `JEFE`, `CONTABILIDAD`, `OPERATIVO`. (En la tesis algunos RF dicen "Administrador" = JEFE.)

---

## 5. Integridad de datos — ZONA SENSIBLE

Mecanismo central de la tesis. **No lo modifiques sin que Andrés lo pida explícitamente.**

- `Actividad` es **inmutable**: nunca `UPDATE`/`DELETE`. Un error se corrige con un **nuevo registro** que apunta al original en `correccionDeId`.
- Hash = SHA-256 sobre el JSON **canónico** (campos en orden fijo, ver `shared/integridad/canonicalizar-actividad.ts`) + `hashAnterior` (cadena).
- La inserción corre en transacción con `pg_advisory_xact_lock(851204)` para serializar la cadena (`actividad.prisma.repository.ts → crearConIntegridad`).
- Si agregas un campo a `Actividad`, decide si entra en la canonicalización; **cambiarla invalida los hashes ya guardados** → requiere migración/re-seed consciente.
- Todo cambio aquí necesita una prueba (ver §8).

---

## 6. Estado actual (qué existe de verdad)

**Hecho (API + web):** auth + roles; parcelas (con polígono GeoJSON, área por Turf, aviso de superposición, habilitar preventa); cultivos; campañas; actividades con cadena de integridad; verificación de integridad (global y por parcela); reportes (histórico y dashboard); predicción **línea base** (promedio histórico detrás de `PredictorPort`); contactos; parte pública (landing, catálogo, detalle); panel privado (dashboard, parcelas con editor de mapa, reportes, contactos); seed con datos de demo.

**Modelo Prisma actual: solo 6 modelos** (`Usuario, Parcela, Cultivo, Campana, Actividad, Contacto`). El diseño completo de la tesis tiene 28 tablas (DBML en `agritrack_v5_28tablas.dbml`): **el schema real es un subconjunto**. No migres a las 28 de golpe: se agregan tablas solo cuando un RF las necesita.

**Pendiente (por RF de la tesis; verificar contra el código antes de afirmar):**
- Costos RF-26 a RF-30 (insumos con precio, gastos, presupuesto, ahorro, costo/ha) — **no existe**.
- Cosecha y rendimiento real RF-22 a RF-24 (hoy el rendimiento viene del seed/campañas).
- Random Forest + importación histórica CSV/Excel RF-31 a RF-35 — **no existe** (solo línea base).
- Clima RF-36; recomendaciones de riego/abono RF-37 a RF-40; planificación de labores RF-21.
- Cierre de campaña y solo-lectura RF-14, RF-57; huella SHA-256 al cierre RF-58 (hoy el hash es por actividad); bitácora general RF-55, RF-59.
- Alertas RF-45; reporte por campaña RF-42/43; exportar PDF/Excel RF-44.
- Gestión completa de usuarios RF-03/RF-05; cierre de sesión por inactividad RF-02; filtros RF-08/RF-54/RF-48.
- **Pantalla web para registrar actividades** (hoy solo vía API/Swagger).
- Tests: Jest **ya corre** en `apps/api` (`npm run test`, 45 pruebas). Cubre canonicalización, hash SHA-256, encadenamiento con `hashAnterior` y detección de alteraciones (`IntegridadService`). **Falta**: prueba de concurrencia de la cadena (necesita Postgres real), pruebas de los demás módulos y tests en `apps/web`.
- CI (GitHub Actions) y despliegue: no existen.

---

## 7. Roadmap priorizado (sigue este orden salvo que Andrés diga otro)

1. ~~Arreglar Jest + pruebas de canonicalización, hash y encadenamiento~~ (hecho). **Pendiente de este ítem:** prueba de concurrencia de la cadena contra Postgres real (`crearConIntegridad` + `pg_advisory_xact_lock`).
2. **Costos** (RF-26–30): modelos `Insumo`, `Gasto`, `Presupuesto`; endpoints para JEFE/CONTABILIDAD; vista en panel.
3. **Cosecha y rendimiento real** (RF-22–24) + cierre de campaña con huella (RF-14, RF-57, RF-58).
4. **Pantalla web de registro de actividades** (rol OPERATIVO).
5. **Random Forest** detrás de `PredictorPort` + importación de datos históricos (RF-31–35). Mantener el contrato del puerto; no tocar controllers/frontend. Advertir si hay < 3 campañas.
6. Reportes por campaña + exportar PDF/Excel; alertas.
7. Clima y recomendaciones (si da el tiempo; son "Debería/Podría").
8. CI + despliegue + manuales.

Antes de empezar cualquier ítem: confirma el RF exacto en el documento de la tesis, **no inventes alcance**.

---

## 8. Cómo trabajar (flujo para cada sesión)

1. **No releas todo el repo.** Usa este archivo + el módulo que vas a tocar + `schema.prisma`.
2. Resume en 3 líneas qué vas a hacer y qué RF cubre; luego hazlo. Sin planes largos.
3. Cambios **pequeños y completos**: backend + frontend + (si aplica) seed + prueba del mismo RF. No dejes medias implementaciones.
4. Antes de dar algo por terminado: `npm run test` y `npm run build` en api, `npm run build` en web, linters sin errores nuevos, y probar el flujo real (login → acción → resultado). Si no pudiste probarlo, dilo.
5. Si necesitas cambiar `schema.prisma`: nueva migración (`prisma migrate dev --name <que_hace>`), actualizar seed y `.dbml` si cambia el diseño. Nunca editar migraciones ya aplicadas.
6. Si algo no está claro o choca con la tesis: **pregunta una vez, corta y concreta**.
7. No agregues dependencias nuevas sin decir por qué.
8. Nunca commitees `.env`, credenciales ni `src/generated`.

**Git:** commits en **Conventional Commits**, scope `api` o `web` (`feat(api): ...`, `fix(web): ...`, `docs: ...`, `chore: ...`). **Un incremento/RF = commits propios** (no mezclar todo en uno) y etiquetas de versión por incremento (v0.1.0 … v0.4.0 …). Rama principal protegida de basura: nada de WIP en `main`.

---

## 9. Relación con la tesis (para no desincronizarse)

- El documento tiene **59 RF (RF-01…RF-59) en 12 módulos y 18 RNF**. Cap. IV (construcción) documenta lo que se implementa: si cambias algo relevante, dile a Andrés qué actualizar en el Cap. IV.
- Moneda de la tesis: **Bs** (la factibilidad usa Bs 55.800 de inversión, VAN Bs 45.077, TIR 55,1 %, B/C 1,50). El DBML maneja USD: aclarar si lo tocas.
- Rendimiento siempre en **t/ha** (no toneladas totales) y mostrar histórico al productor.
- Metodología: Scrum con 4 incrementos (1 auth/parcelas/cultivos; 2 campañas/actividades/integridad; 3 reportes/predicción/panel; 4 público/contactos/seed).
- Pendientes de documento (no son tuyos salvo que se pidan): figuras/anexos del tutor, cronograma horizontal, manual técnico y de usuario.

---

## 10. Trampas conocidas

- **Jest + Nest 12:** los paquetes `@nestjs/*` son ESM-only (usan `import.meta`) y Jest corre en CJS; con Node < 24.9 no pueden cargarse (`Must use import to load ES Module`). No sirve `transformIgnorePatterns` ni `--experimental-vm-modules`. En los specs **no uses `@nestjs/testing`**: mockea los decoradores con `jest.mock('@nestjs/common', () => ({ Injectable: () => () => undefined, Inject: () => () => undefined, ... }))` (agrega los que use la clase) e instancia con `new`. Ver `integridad.service.spec.ts`. Si se sube a Node ≥ 24.9, esto se puede simplificar.
- Jest necesita el cliente Prisma generado (`src/generated`) porque ts-jest verifica tipos: corre `prisma generate` tras clonar. El `rootDir: "."` de `tsconfig.json` es obligatorio con TypeScript 6 (sin él, TS5011); `tsconfig.build.json` lo sobrescribe con `./src`.
- Los specs de integridad usan `test/helpers/cadena-integridad.ts` (replica `crearConIntegridad` sin BD con las funciones reales). Los valores *golden* de `canonicalizar-actividad.spec.ts` fijan el formato: si fallan, cambió la canonicalización y los hashes guardados dejan de verificar (ver §5); no "arreglar" el test sin migración consciente.
- `verificarPorParcela` solo valida cada registro contra su propio `hashAnterior` (no la continuidad global): un re-hash del propio registro solo lo detecta `verificarGlobal`. Es por diseño; tenerlo presente al hablarlo en la tesis.
- Prisma 7 CLI: usa siempre `--config prisma7.config.ts`; exporta `DATABASE_URL` si el seed dice "DatabaseNotReachable".
- Si `prisma generate` no puede bajar engines (red restringida), la API no compila: avisar, no parchear el código.
- Las teselas del mapa necesitan internet; sin conexión se ve el polígono sobre gris (normal).
- CORS está abierto en desarrollo; **cerrarlo** en producción.
- `JWT_SECRET` de `.env.example` y las contraseñas del seed son solo de desarrollo.
- Los datos de demo son ficticios (3 parcelas, 83,35 ha); no presentarlos como datos reales de AgroAn.
