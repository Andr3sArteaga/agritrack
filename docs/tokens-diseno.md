# Tokens de diseño de AgriTrack

Única fuente: [`apps/web/src/app/tokens.css`](../apps/web/src/app/tokens.css). `globals.css` solo la importa.
Muestra visual (solo en desarrollo): `http://localhost:3000/muestra-componentes`.

**Regla:** en los componentes no se escriben colores, radios ni sombras a mano (`#17211D`, `stone-500`, `rounded-xl`...). Se usan las clases de los tokens. Si falta uno, se agrega aquí y en `tokens.css`, no en la pantalla.

## Colores

Tailwind 4 genera las clases a partir del nombre: `--color-marca` → `bg-marca`, `text-marca`, `border-marca`.

### Marca, texto y superficies

| Token | Valor | Uso | Contraste |
|---|---|---|---|
| `marca` | `#006B4F` | Botón principal, enlaces, elemento activo | 6,5:1 sobre blanco |
| `marca-hover` | `#00553E` | Hover del principal | — |
| `marca-vivo` | `#00A859` | Íconos y acentos. **Nunca para texto** | 3,1:1 (no llega a AA) |
| `marca-suave` | `#E8F5EF` | Fondo de activos y del ícono de `StatCard` | — |
| `marca-oscuro` | `#004B36` | Parte pública: botones y franjas oscuras | 9,6:1 con texto blanco |
| `marca-noche` | `#003B2A` | Parte pública: hover y fondos más oscuros | — |
| `noche` | `#071712` | Fondo oscuro de la parte pública | — |
| `cielo` | `#CFE6F2` | Degradado del hero de la portada | — |
| `cielo-intenso` | `#A7D3EE` | Parte de arriba del fondo de las pantallas de cuenta (ingresar, solicitar acceso, contraseña) | — |
| `hueso` | `#F2F3EC` | Fondos claros de la portada | — |
| `lima` | `#E6F35A` | Único acento de la portada: botón redondo principal, siempre con texto `tinta`. **Nunca para estados** (se confunde con Atención) | 15:1 con `tinta` |

### Tipografías

Dos fuentes, ambas cargadas con `next/font/google` (se sirven desde nuestro servidor):

| Fuente | Clase | Dónde |
|---|---|---|
| **Instrument Serif** (fina, un solo grosor) | `font-titulo` | Títulos grandes de la parte pública (hero, secciones, cierre, números de pasos) y el nombre **AgriTrack** del logo (barra pública y barra lateral del panel) |
| **Inter** | `font-sans` (por defecto) | Todo lo demás: botones, menús, formularios, tarjetas, textos, datos y el panel completo |

Reglas:
- Instrument Serif solo en tamaño grande (24 px o más), salvo el logo. Es muy fina y en tamaño chico se lee mal.
- Nunca en botones, formularios ni datos: ahí va siempre Inter.
- En el panel, la serifa aparece solo en el logo. El resto del panel es una herramienta de trabajo y va en Inter.
- No agregar una tercera fuente.
| `tinta` | `#17211D` | Texto principal | 16:1 |
| `tinta-suave` | `#68736D` | Texto secundario | 4,9:1 sobre blanco, 4,5:1 sobre `fondo` |
| `borde` | `#E4EAE6` | Bordes y divisores | — |
| `superficie` | `#FFFFFF` | Tarjetas | — |
| `fondo` | `#F4F6F5` | Fondo de la app | — |
| `fondo-suave` | `#F8FAF9` | Hover de filas y secciones internas | — |

### Estados

Siempre con **color + ícono + palabra** (`EstadoBadge`). "Sin datos" lleva borde punteado y nunca se muestra como "Bien".

| Estado | Fondo | Borde / ícono | Texto |
|---|---|---|---|
| Bien | `bien-fondo` `#ECFDF5` | `bien-borde` `#047857` | `bien-texto` `#064E3B` |
| Atención | `atencion-fondo` `#FFFBEB` | `atencion-borde` `#B45309` | `atencion-texto` `#78350F` |
| Crítico | `critico-fondo` `#FEF2F2` | `critico-borde` `#B91C1C` | `critico-texto` `#7F1D1D` |
| Sin datos | `sindatos-fondo` `#F1F5F9` | `sindatos-borde` `#475569` | `sindatos-texto` `#1E293B` |
| Pendiente (no es estado) | `pend-fondo` `#EEF2FF` | `pend-borde` `#4338CA` | `pend-texto` `#312E81` |

### Cultivos

Solo para `CropChip`. **Nunca para estados.** Todos los pares tienen contraste de 6,9:1 o más.

| Color | Fondo | Texto | Cultivo fijo |
|---|---|---|---|
| verde | `#E8F5EF` | `#0B5D3B` | Soya |
| amarillo | `#FDF6D8` | `#6B5100` | Trigo |
| naranja | `#FFF0E3` | `#8A3C00` | Sorgo |
| morado | `#F3ECFB` | `#5B2B8C` | Sésamo |
| rojo | `#FDECEC` | `#8F1D1D` | — |
| azul | `#E9F2FD` | `#1D4F8F` | — |

Un cultivo que no está en la lista toma un color estable según su nombre (`estiloCultivo` en `components/ui/crop-chip.tsx`).

## Tipografía

**Inter**, cargada con `next/font/google` en `app/layout.tsx` (variable `--font-inter`). Si no carga, se usa Arial.

| Uso | Tamaño | Peso | Clase |
|---|---|---|---|
| Título de página | 28 px | 600 | `text-[28px] font-semibold` |
| Título de sección | 22 px | 600 | `text-[22px] font-semibold` |
| Subtítulo | 18 px | 600 | `text-lg font-semibold` |
| Cuerpo | 16 px | 400 | `text-base` |
| Secundario | 14 px | 400 / 500 | `text-sm` |
| Etiqueta mínima | 12 px | 500 / 600 | `text-xs` (nada más chico) |

## Radios

| Token | Valor | Clase | Uso |
|---|---|---|---|
| `control` | 10 px | `rounded-control` | Campos, botones, filas, menús |
| `tarjeta` | 16 px | `rounded-tarjeta` | Tarjetas y paneles |
| — | total | `rounded-full` | Chips, insignias, botones redondos |

## Sombras

| Token | Clase | Uso |
|---|---|---|
| `tarjeta` | `shadow-tarjeta` | Tarjetas (casi imperceptible) |
| `flotante` | `shadow-flotante` | Paneles sobre el mapa, menús y modales |

## Espaciado y tamaños

- **Dentro de controles:** 16 px (`px-4`).
- **Dentro de tarjetas:** 20 a 24 px (`p-5` o `p-6`).
- **Entre secciones:** 24 px (`space-y-6`) en el panel y 48 px (`space-y-12`) en páginas largas.
- **Controles y botones:** al menos 44 px de alto (`min-h-11`).
- **Foco con teclado:** contorno azul de 3 px, definido en `globals.css`.

## Componentes base (`apps/web/src/components/ui/`)

| Componente | Archivo | Qué es |
|---|---|---|
| `Card` | `card.tsx` | Tarjeta (normal o flotante) |
| `Button`, `LinkButton` | `button.tsx` | Variantes: principal, secundario, fantasma y peligro |
| `Tag` | `tag.tsx` | Etiqueta que no es estado (neutra o de marca) |
| `CropChip` | `crop-chip.tsx` | Cultivo con ícono y color fijo |
| `StatCard` | `stat-card.tsx` | Valor resumido; sin dato dice "Sin datos" |
| `RangeBar` | `range-bar.tsx` | Escala **neutra** con marcador (sin zonas de color) |
| `SectionGroup` | `section-group.tsx` | Grupo que se expande y se colapsa |
| `ListRow` | `list-row.tsx` | Fila con miniatura, chips y acciones |
| `ParcelThumb` | `parcel-thumb.tsx` | Miniatura del polígono de la parcela |
| `ActionMenu` | `action-menu.tsx` | Menú "⋯" accesible con teclado |
| `Field` + `CLASE_CAMPO` | `field.tsx` | Etiqueta, campo, ayuda y error |
| `ActivityItem` | `activity-item.tsx` | Fila de una actividad registrada |

Siguen en su lugar, con el estilo actual, y se migran pantalla por pantalla: `EstadoBadge`, `ChipRegistrado`, `MarcadorPendiente`, `Advertencia`, `EstadoVacio`, `Modal`, `EncabezadoPagina`, `TarjetaMetrica` (lo reemplaza `StatCard`), `Badge` (lo reemplaza `Tag`) y `EnlaceBoton` (lo reemplaza `LinkButton`).
