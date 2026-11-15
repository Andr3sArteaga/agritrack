# Vulnerabilidades de `npm audit` en `apps/api` (2026-11-02)

Inventario de las **36 vulnerabilidades preexistentes** que reporta `npm audit` en `apps/api`. **No se corrigió ninguna en este paso**: este documento solo las clasifica.

- Rama: `prueba/deps-reportes` (desde `feat/costos`), commit `627209f`. Node v22.18.0.
- Las dependencias nuevas del módulo de reportes (`pdfmake` 0.3.13, `write-excel-file` 4.1.1, `@types/pdfmake` 0.3.3) **no agregan ninguna**: el total era 36 antes y después de instalarlas.
- Salidas completas: `docs/evidencias/2026-11-02/audit-api.txt` (todo) y `audit-api-produccion.txt` (`npm audit --omit=dev`).
- La clasificación producción/desarrollo sale de `npm audit --omit=dev` y `npm ls <paquete> --omit=dev`, no de suposiciones.

## Resumen

| Grupo | Crítica | Alta | Moderada | Baja | Total |
|---|---|---|---|---|---|
| Producción | 0 | 7 | 2 | 0 | **9** |
| Desarrollo | 1 | 2 | 18 | 6 | **27** |
| **Total** | 1 | 9 | 20 | 6 | **36** |

Producción incluye más que `body-parser`, `multer`, `qs` y `fast-uri`. `@prisma/client` 7.10.0 trae la CLI `prisma` como dependencia de producción, y con ella `mysql2`, `deepmerge-ts`, `@prisma/config` y `fast-uri`. **`fast-uri` llega por Prisma (`@prisma/dev` → `ajv`), no por Express.**

## 1. Producción (9)

| Paquete | Severidad | Llega por | Problema | Exposición real en AgriTrack | Fix según npm |
|---|---|---|---|---|---|
| `body-parser` 2.3.0 | alta | `@nestjs/platform-express` → `express` 5.2.1 | DoS con bytes sobrantes tras un cuerpo comprimido ([GHSA-27r3-jxmh-p828](https://github.com/advisories/GHSA-27r3-jxmh-p828)) | **Sí**: procesa cada petición JSON de la API | `npm audit fix` |
| `multer` 2.4.0 | alta | `@nestjs/platform-express` | DoS con un `fileFilter` asíncrono pendiente al cortar la petición ([GHSA-q7qp-rjg7-q26m](https://github.com/advisories/GHSA-q7qp-rjg7-q26m)) | Baja hoy: solo se activa en rutas con subida de archivos y no hay ninguna (la importación de Excel quedó fuera) | `npm audit fix` |
| `@nestjs/platform-express` 12.1.0 | alta | directa | Solo por depender de `multer` vulnerable | Igual que `multer` | `npm audit fix` |
| `qs` 6.16.0 | moderada | `express`, `body-parser` | `qs.stringify` con `arrayFormat: 'comma'` lanza un TypeError, posible DoS ([GHSA-6pq8-jhm2-2vcw](https://github.com/advisories/GHSA-6pq8-jhm2-2vcw)) | Baja: Express usa `qs.parse` para leer la query; el código no llama a `stringify` | `npm audit fix` |
| `fast-uri` 3.1.8 | moderada | `@prisma/client` → `prisma` → `@prisma/dev` → `@prisma/streams-local` → `ajv` | 4 avisos de normalización/suplantación de URI ([GHSA-w74x-v6f9-j3xg](https://github.com/advisories/GHSA-w74x-v6f9-j3xg), [GHSA-xhq7-xmqj-769h](https://github.com/advisories/GHSA-xhq7-xmqj-769h), [GHSA-wjr9-j795-jxcr](https://github.com/advisories/GHSA-wjr9-j795-jxcr), [GHSA-333x-w4r6-6crp](https://github.com/advisories/GHSA-333x-w4r6-6crp)) | Baja: lo usa el servidor de desarrollo local de Prisma, no las peticiones de la API | `npm audit fix` |
| `mysql2` 3.15.3 | alta | `@prisma/client` → `prisma` | Filtra la contraseña al degradar el plugin de autenticación; bomba de descompresión ([GHSA-3f6p-5ww8-9rcr](https://github.com/advisories/GHSA-3f6p-5ww8-9rcr), [GHSA-rgwj-5xj2-c3m3](https://github.com/advisories/GHSA-rgwj-5xj2-c3m3)) | Ninguna práctica: es el driver de MySQL; AgriTrack usa PostgreSQL con `@prisma/adapter-pg` | `npm audit fix` |
| `deepmerge-ts` 7.1.5 | alta | `@prisma/client` → `prisma` → `@prisma/config` | Agotamiento de pila al fusionar objetos recursivos ([GHSA-ggr8-5vv4-36mx](https://github.com/advisories/GHSA-ggr8-5vv4-36mx)) | Baja: se usa al cargar la configuración de la CLI, no con datos de usuario | `npm audit fix` |
| `@prisma/config` 7.10.0 | alta | `prisma` | Solo por depender de `deepmerge-ts` | Igual que `deepmerge-ts` | `npm audit fix` |
| `prisma` 7.10.0 | alta | `@prisma/client` | Solo por `@prisma/config` y `mysql2` | Igual que las anteriores | `npm audit fix` ⚠️ |

⚠️ Antes de aplicar cualquier fix sobre `prisma`, hay que verificar que **no suba a Prisma 8**: CLAUDE.md lo prohíbe por incompatibilidad con NestJS. Solo se acepta un parche dentro de 7.10.x.

**Prioridad sugerida:** `body-parser` primero (expuesto en cada petición), después `multer`, `@nestjs/platform-express` y `qs` (mismo `npm audit fix`, sin cambios de versión mayor según npm). El grupo de Prisma se revisa aparte con la restricción de no pasar a Prisma 8.

## 2. Desarrollo (27)

Ninguna llega al servidor en producción. Vienen de Jest, `ts-jest`, `@nestjs/cli` y `@nestjs/mau` (herramientas de compilación, pruebas y CLI).

| Paquete | Severidad | Llega por | Problema | Fix según npm |
|---|---|---|---|---|
| `handlebars` 4.7.9 | **crítica** | `ts-jest` 29.4.14 | 3 avisos de inyección de JavaScript al compilar plantillas ([GHSA-xw65-4hp5-5hc7](https://github.com/advisories/GHSA-xw65-4hp5-5hc7), [GHSA-8r5x-fm3f-whwj](https://github.com/advisories/GHSA-8r5x-fm3f-whwj), [GHSA-p8wg-vrv2-v86f](https://github.com/advisories/GHSA-p8wg-vrv2-v86f)) | `npm audit fix` |
| `tmp` 0.0.33 | alta | `@nestjs/mau` → `inquirer` → `external-editor` | Escritura arbitraria vía enlace simbólico; path traversal ([GHSA-52f5-9888-hmc6](https://github.com/advisories/GHSA-52f5-9888-hmc6), [GHSA-ph9p-34f9-6g65](https://github.com/advisories/GHSA-ph9p-34f9-6g65)) | `--force` → `@nestjs/mau@0.0.6` (rompe) |
| `undici` 6.20.1 | alta | `@nestjs/mau` | 21 avisos (DoS, request smuggling, inyección CRLF, bypass de validación TLS, etc.); ver `audit-api.txt` | `--force` → `@nestjs/mau@0.0.6` (rompe) |
| `glob` | moderada | Jest (`@jest/reporters`, `jest-runtime`, `test-exclude`) | Saltarse la cancelación con AbortSignal ([GHSA-3g3m-2fjr-6pw4](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4)) | `--force` → `jest@25.1.0` (rompe) |
| `minimatch` | moderada | `@nestjs/cli`, `glob` | DoS por amplificación de patrones ([GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249)) | `--force` → `@nestjs/cli@11.0.24` (rompe) |
| `@nestjs/cli` | moderada | directa (dev) | Por `minimatch` | `--force` → `@nestjs/cli@11.0.24` (rompe) |
| `@nestjs/mau` | moderada | directa (dev) | Por `inquirer` y `undici` | `--force` → `@nestjs/mau@0.0.6` (rompe) |
| `@jest/core`, `@jest/reporters`, `@jest/transform`, `babel-jest`, `babel-plugin-istanbul`, `jest-config`, `test-exclude` | moderada | cadena de Jest 30 | Por `glob`, `minimatch` y `deepmerge` | `--force` → `jest@25.1.0` (rompe) |
| `@jest/expect`, `@jest/globals`, `jest-circus`, `jest-resolve-dependencies`, `jest-runner`, `jest-runtime`, `jest-snapshot` | moderada | cadena de Jest 30 | Por la cadena de arriba | `npm audit fix` |
| `deepmerge` | baja | `jest-config` | Prototype poisoning en `mergeObject()` ([GHSA-gcqx-w48m-w2h4](https://github.com/advisories/GHSA-gcqx-w48m-w2h4)) | `--force` → `jest@25.1.0` (rompe) |
| `external-editor`, `inquirer` | baja | `@nestjs/mau` | Por `tmp` | `--force` → `@nestjs/mau@0.0.6` (rompe) |
| `jest`, `ts-jest` | baja | directas (dev) | Por la cadena de Jest | `--force` → `jest@25.1.0` / `ts-jest@25.5.1` (rompe) |
| `jest-cli` | baja | `jest` | Por `@jest/core` y `jest-config` | `npm audit fix` |

**No aplicar ningún `--force`.** Los "fixes" que propone (`jest@25.1.0`, `ts-jest@25.5.1`, `@nestjs/cli@11.0.24`, `@nestjs/mau@0.0.6`) son **bajadas de versión mayor** que romperían las pruebas (ver CLAUDE.md §10: Jest + Nest 12) o la CLI. Lo razonable es esperar versiones nuevas de esas herramientas o aceptar el riesgo, porque no se ejecutan en el servidor.

## Próximo paso (fuera de este paso)

En una rama aparte:
1. Aplicar `npm audit fix` sin `--force`.
2. Confirmar que `prisma` y `@prisma/client` siguen en 7.x.
3. Correr `test`, `test:integration`, `lint` y `build`.
4. Repetir el audit y comparar contra este documento.
