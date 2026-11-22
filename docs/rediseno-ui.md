# Rediseño de la interfaz (propuesta)

Referencia: "Agritech SaaS Platform" (5 imágenes en `Interfaz mejora/`). Alcance: solo `apps/web`, solo cambios visuales. Sin tablas nuevas, sin cambios de API, sin librerías nuevas, sin datos inventados.

---

## 1. Lo que tenemos hoy (Fase 1)

### Pantallas

| Pantalla | Ruta | Qué muestra | De dónde salen los datos |
|---|---|---|---|
| Inicio público | `/` | Portada, beneficios, parcelas en preventa, mapa oscuro | `GET /public/parcelas` |
| Catálogo público | `/parcelas` | Tarjetas de parcelas en preventa | `GET /public/parcelas` |
| Detalle público | `/parcelas/[id]` | Mapa, cultivo, línea base, fotos, historial, contacto | `GET /public/parcelas/:id` |
| Login, solicitar acceso, recuperar y restablecer | `/login`, `/solicitar-acceso`, `/recuperar-password`, `/restablecer-password` | Formularios de cuenta | `/auth/*` |
| Resumen | `/panel/dashboard` | Contador de estados, selector de parcelas, información general, gráfico de salud operativa | `useResumenesParcelas`, `GET /reportes/dashboard` |
| Parcelas | `/panel/parcelas` | Lista + mapa con polígonos por estado, panel flotante, tabla de gestión | `/parcelas`, `/campanas`, `/cultivos`, resúmenes |
| Detalle de parcela | `/panel/parcelas/[id]` | Estado por área, suelo, clima, campañas, actividades, cosecha, fotos, estimación | `/parcelas/:id`, `/campanas`, `/monitoreo/*`, `/reportes/campanas/:id`, `/prediccion/*` |
| Costos | `/panel/costos` | Resumen RF-30, gastos, presupuesto | `/gastos`, `/presupuestos`, `/reportes/campanas/:id/costos` |
| Reportes | `/panel/reportes` | Histórico, verificación de integridad | `/reportes/historico`, `/integridad/global` |
| Reporte de campaña | `/panel/reportes/campanas/[id]` | Detalle, descarga PDF y Excel | `/reportes/campanas/:id` |
| Contactos | `/panel/contactos` | Lista y formulario | `/contactos` |
| Solicitudes | `/panel/solicitudes` | Aprobar o rechazar accesos (JEFE) | `/auth/solicitudes` |
| Perfil | `/panel/perfil` | Datos del usuario | `/auth/perfil` |

**Librerías que ya se usan:** Tailwind 4, lucide-react (íconos), Recharts (gráficos), Leaflet + react-leaflet + Geoman (mapas), Turf. No hay kit de UI.

### Problemas visuales encontrados

1. **Dos paletas a la vez.**
   - Paleta nueva: hay unos 1.200 colores escritos a mano (`#17211D`, `#006B4F`, `#68736D`, `#E4EAE6`, `#00a859`...) que no son tokens.
   - Paleta vieja: unas 20 pantallas siguen con `stone-*`, `emerald-*`, `red-*` y `amber-*` (formularios de parcela, costos, contactos, reportes y reporte de campaña).
2. **Seis radios distintos:** `md`, `lg`, `xl`, `2xl`, `3xl` y `[2rem]`. Los tamaños de texto se escriben a mano (`text-[11px]`, `[15px]`, `[17px]`).
3. **Estados con cuatro componentes distintos:** `Badge` (tonos verde, ámbar, gris y rojo), `EstadoBadge`, `ChipRegistrado` y `MarcadorPendiente`. Hay "verdes" que no son "Bien": por ejemplo, el `Badge` verde de "En preventa".
4. **Tipografía Arial.** La referencia usa una sans geométrica, más limpia.
5. **Archivos enormes que mezclan todo:** `estimacion-componente.tsx` (1.180 líneas), `dashboard/page.tsx` (1.197) y `parcelas/[id]/page.tsx` (1.284). Ahí se repiten tarjetas, encabezados y chips con estilos distintos.
6. **Formularios viejos:** texto pequeño (`text-sm`), campos de altura variable y botones de 36 px.
7. **Modo oscuro a medias:** `globals.css` cambia el fondo con `prefers-color-scheme`, pero `body` fuerza `bg-stone-50`.

---

## 2. Lo que trae la referencia (Fase 2)

- **Layout:** barra lateral angosta solo con íconos (oscura) + panel de contenido blanco + mapa satelital a la derecha, ocupando todo el alto. Tarjetas con esquinas muy redondeadas sobre un fondo gris claro.
- **Paleta:**
  - verde principal saturado (`≈ #22B35E`) para el botón principal y lo activo;
  - fondo `#F4F6F5`;
  - texto casi negro (`#17211D`) y texto secundario gris verdoso (`#68736D`);
  - bordes muy suaves;
  - acentos por cultivo (rojo, morado, amarillo, naranja) en chips claros.
- **Tipografía:** sans geométrica, títulos de 24 a 28 px en semibold y cuerpo de 14 a 15 px. Mucho aire y pocas líneas por fila.
- **Radios y sombras:** tarjetas de 16 a 20 px, botones y chips redondeados por completo, y sombra apenas visible.
- **Patrones:**
  - lista agrupada que se expande y se colapsa (finca → parcelas), con la miniatura del polígono, el nombre, las hectáreas y un chip del cultivo;
  - menú de "⋯" por fila y botón "centrar en el mapa";
  - acciones masivas sobre varias filas a la vez;
  - tareas agrupadas por estado (Fijadas, Sin empezar, En progreso, Completadas) con etiquetas y fechas;
  - indicadores de salud: barras de rango con marcador, medidor circular y porcentaje;
  - leyenda de colores sobre el mapa;
  - widget de clima y pronóstico, y tarjetas flotantes sobre el mapa.

---

## 3. Propuesta

### 3.1 Qué se aplica en cada pantalla

| Pantalla | Patrón de la referencia | Qué cambia | Qué se queda igual |
|---|---|---|---|
| **Layout del panel** | Barra de íconos + panel + mapa | Barra lateral más angosta (íconos con texto, colapsable a solo íconos en pantallas medianas), fondo gris claro, contenido en tarjetas blancas. | Mismas rutas, permisos por rol y menú en celular. |
| **Parcelas** | "My Fields" (lo más parecido) | Cada fila con la miniatura del polígono (SVG hecho con el GeoJSON que ya existe), nombre, hectáreas, chip del cultivo y estado. Botón "centrar en mapa" y menú "⋯" con las acciones que ya existen (ver, editar, preventa, desactivar). Leyenda y tarjeta flotante con el estilo nuevo. | La tabla de gestión pasa al menú "⋯" (mismas acciones). Mapa, resaltado cruzado y panel flotante. |
| **Detalle de parcela** | Soil Health + tarjetas | Encabezado limpio con chips (cultivo, hectáreas, estado). Suelo con `RangeBar` neutra (ver 3.2). Clima como lista de días anotados. Actividades en filas tipo "tarea" agrupadas por campaña y tipo, que se pueden colapsar. | Formularios, campañas, cosecha, fotos y estimación: mismo contenido, solo cambia el estilo. |
| **Resumen** | Tarjetas + estados | `StatCard` unificadas. Contador de estados como 4 tarjetas iguales. Lista de parcelas agrupada por estado (Crítico → Atención → Sin datos → Bien) que se puede colapsar. | Datos y gráfico (solo se le cambian los colores a los tokens). |
| **Costos** | Tarjetas | `StatCard` para gastado, comprometido, presupuesto, ahorro y costo por hectárea. Tabla de gastos con filas limpias y chips de estado. | Cálculo (API), formularios y anulación. |
| **Reportes y reporte de campaña** | Tarjetas + grupos | Secciones con `SectionGroup`. Integridad con `StatusBadge`. Botones de descarga con estilo nuevo. | PDF, Excel y filtros. |
| **Contactos, Solicitudes y Perfil** | Lista agrupada | Contactos agrupados por tipo y colapsables. Solicitudes como filas con acciones. | Formularios y permisos. |
| **Público (inicio, catálogo y detalle)** | Tarjetas + mapa | Mismos tokens y componentes. Chip del cultivo y miniatura del polígono en las tarjetas. | Reglas de RF-52: sin estimación del modelo y textos aprobados. |
| **Login y cuenta** | — | Tokens, campos de 44 px y una sola tarjeta centrada. | Flujos. |

### 3.2 Qué NO conviene copiar

| De la referencia | Por qué no |
|---|---|
| **Fincas que agrupan parcelas** | No existe la entidad "finca": habría que crear una tabla. En su lugar se agrupa por algo que ya existe: estado, cultivo actual, o preventa / no preventa. |
| **Tareas con estado** (Sin empezar, En progreso, Completada, Fijadas) | Las actividades son registros inmutables de algo ya hecho. No hay tareas planificadas (RF-21 está pendiente). Copiarlo inventaría estados. Se usa solo el aspecto de la fila (ícono, título, fecha, etiquetas), agrupando por tipo y campaña. |
| **Acciones masivas** (mover, agrupar, borrar varias) | No existen y "borrar" choca con la integridad. Fuera de alcance. |
| **Barras de pH con zonas de color y "Good condition", medidor de cal, contenido de agua con zonas** | No hay rangos agronómicos validados: pintar zonas rojo-verde sería emitir un juicio inventado. Se usa una `RangeBar` **neutra**: escala gris con el marcador del valor real y su fecha, sin veredicto. Si falta el dato, "Sin datos". |
| **"TOP 10% nationally" y comparaciones nacionales** | No hay esos datos. |
| **Pronóstico de 8 días** | No hay servicio de clima (RF-36 manual). Se muestra el clima **anotado** de los últimos días; nunca un pronóstico. |
| **Buscador de direcciones en el mapa** | Requiere un servicio externo de geocodificación. Fuera de alcance. |
| **"Crear zonas de manejo"** | Funcionalidad nueva. Fuera de alcance. |
| **Modo oscuro** | Duplica el trabajo de colores y contrastes. Fuera de alcance; se quita el fondo oscuro a medias de `globals.css`. |
| **Avatares por tarea** | No hay fotos de usuario. Se pueden usar iniciales del responsable, si el dato ya viene. |
| **Emojis de cultivo** | Dependen del sistema operativo y no siempre se ven igual. Se usan íconos de lucide + color por cultivo. |

### 3.3 Design tokens (en `globals.css`, con `@theme`)

La paleta "nueva" ya se usa unas 1.200 veces escrita a mano. Se convierte en tokens con los **mismos valores**, así el cambio no altera lo que ya se ve bien.

| Token | Valor | Uso |
|---|---|---|
| `--color-marca` | `#006B4F` | Botón principal, enlaces y elemento activo (contraste 6,5:1 sobre blanco) |
| `--color-marca-hover` | `#00553E` | Hover del principal |
| `--color-marca-vivo` | `#00A859` | Acentos, íconos e indicadores. **Nunca para texto**: su contraste sobre blanco es 3,1:1, menos que el mínimo AA de 4,5:1 |
| `--color-marca-suave` | `#E8F5EF` | Fondo de elementos activos y chips de marca |
| `--color-tinta` | `#17211D` | Texto principal |
| `--color-tinta-suave` | `#68736D` | Texto secundario (contraste 4,9:1 sobre blanco y 4,5:1 sobre el fondo gris) |
| `--color-borde` | `#E4EAE6` | Bordes y divisores |
| `--color-superficie` | `#FFFFFF` | Tarjetas |
| `--color-fondo` | `#F4F6F5` | Fondo de la app (como en la referencia) |
| `--color-fondo-suave` | `#F8FAF9` | Filas alternas y secciones internas |
| Estados | los actuales `bien-*`, `atencion-*`, `critico-*`, `sindatos-*`, `pend-*` | Sin cambios: ya cumplen WCAG AA |
| Cultivos | 6 pares fondo / texto (verde, amarillo, naranja, morado, rojo, azul) | Solo para `CropChip`. Nunca se usan para estados. |

- **Tipografía:** Inter vía `next/font/google`, que viene incluido en Next: no es una librería nueva. Escala:
  - 12 px (etiqueta mínima; se elimina el de 11);
  - 14 px (secundario);
  - 16 px (cuerpo);
  - 18 y 22 px (títulos de sección);
  - 28 px (título de página).
  - Pesos 400, 500 y 600.
- **Radios:** 3 en total.
  - `--radius-control` 10 px (campos y botones cuadrados);
  - `--radius-tarjeta` 16 px;
  - `full` (chips, insignias y botones redondos).
- **Sombras:** 2 en total. `--shadow-tarjeta` (muy suave, para tarjetas) y `--shadow-flotante` (paneles sobre el mapa y menús).
- **Espaciado:** la escala de Tailwind, con 3 medidas fijas:
  - 16 px dentro de controles;
  - 20 a 24 px dentro de tarjetas;
  - 24 px entre secciones.
- **Tamaños mínimos:** controles de 44 px de alto y foco azul visible (ya existe).

### 3.4 Componentes base (en `src/components/ui/`)

Se reutiliza lo que ya existe, se le cambia el estilo y no se duplica.

| Componente | Origen | Qué hace |
|---|---|---|
| `Card` | nuevo (reemplaza ~40 `div` con borde copiados) | Tarjeta blanca con radio y sombra de token. Variantes: normal y flotante. |
| `StatusBadge` | `EstadoBadge` (se renombra o se mantiene) | Los 4 estados con color, ícono y palabra. Se absorben `ChipRegistrado` y `MarcadorPendiente` como variantes "Registrado" y "Pendiente". |
| `Tag` | `Badge` (se reduce) | Etiquetas que **no** son estado (En preventa, tipo de contacto, Pagado). Siempre neutras o de marca, nunca con los colores de estado. |
| `CropChip` | nuevo | Ícono + nombre del cultivo, con un color fijo por cultivo según su nombre. |
| `StatCard` | `TarjetaMetrica` | Ícono, etiqueta, valor y nota. Si no hay valor, "Sin datos". |
| `RangeBar` | nuevo | Escala neutra con marcador y valor. Sin zonas de color mientras no haya reglas. |
| `SectionGroup` | nuevo (con `<details>`, sin librería) | Grupo que se expande y se colapsa, con título, contador y acciones. |
| `ListRow` | nuevo | Fila con miniatura, título, metadatos, chips y acciones a la derecha (botón + menú "⋯"). |
| `ParcelThumb` | nuevo | Miniatura SVG del polígono, hecha con el GeoJSON que ya existe (sin librería). |
| `ActionMenu` | nuevo | Menú "⋯" accesible por teclado, con las acciones existentes. |
| `ActivityItem` | `IconoActividad` + fila | Fila de actividad: ícono, tipo, fecha, descripción y responsable. Estilo de "tarea", sin estados inventados. |
| `EmptyState` | `EstadoVacio` | Mismo componente con estilo nuevo. |
| `Alert` | `Advertencia` | Mismo componente con estilo nuevo. |
| `PageHeader` | `EncabezadoPagina` | Título de 28 px, descripción y acciones. |
| `Button` y `LinkButton` | `EnlaceBoton` + botones sueltos | Variantes: principal, secundario, fantasma y peligro. 44 px. |
| `Field` | nuevo | Etiqueta + campo + ayuda + error, para unificar todos los formularios. |
| `Modal` | `Modal` | Mismo componente con estilo nuevo. |

**Gauge:** no se construye por ahora. Ningún dato real lo necesita sin rangos.

### 3.5 Orden de implementación

Al terminar cada paso me detengo para que revises y hagas commit. En cada uno compruebo lint, build, datos reales, datos vacíos ("Sin datos") y el ancho de 360 px.

1. **Base:** tokens en `globals.css`, fuente Inter, y quitar el modo oscuro a medias.
2. **Componentes base** (3.4), sin tocar pantallas todavía, más una página interna de muestra solo en desarrollo, si la quieres.
3. **Layout del panel y barra lateral.**
4. **Parcelas** (lista + mapa).
5. **Detalle de parcela.** Es la más grande: se parte en secciones y se reemplazan los estilos sueltos.
6. **Resumen.**
7. **Costos.**
8. **Reportes y reporte de campaña.**
9. **Contactos, Solicitudes y Perfil.**
10. **Público:** inicio, catálogo y detalle.
11. **Login y pantallas de cuenta.**

Al final de cada pantalla se reemplazan sus colores escritos a mano por tokens. La meta es que no quede ningún `#xxxxxx` ni `stone-*` fuera de `globals.css`.

---

## 4. Decisiones que necesito

1. **Fuente:** ¿Inter con `next/font/google`, o mantener Arial? Inter necesita internet en el build, porque la descarga Next.
2. **Agrupación de la lista de parcelas, en lugar de "fincas":** ¿por estado (recomendado), por cultivo actual o por preventa?
3. **Página de muestra de componentes** (solo en desarrollo, para revisarlos juntos): ¿la hago o no?
