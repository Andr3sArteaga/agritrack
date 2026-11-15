"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Compass,
  Expand,
  MapPin,
  Maximize2,
  Ruler,
  Sprout,
  TrendingUp,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Modal } from "@/components/modal";
import type { CatalogoParcela, PoligonoGeoJson } from "@/lib/types";
import type { ParcelaMapaItem } from "./mapa-preventa-oscura";

const MapaPreventaOscura = dynamic(
  () => import("./mapa-preventa-oscura").then((m) => m.MapaPreventaOscura),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-full min-h-[380px] place-items-center bg-[#071712] text-sm font-medium text-emerald-300/80">
        Cargando mapa geoespacial...
      </div>
    ),
  },
);

const FILTROS_CULTIVO = ["Todos", "Soya", "Maíz", "Trigo", "Sésamo"] as const;

interface TarjetaParcelaVista {
  id: string;
  nombre: string;
  cultivo: string;
  temporada: string;
  ubicacion: string;
  hectareas: number;
  rendimientoTnHa: number | null;
  estadoLabel: string;
  fotoPortada: string | null;
  poligono: PoligonoGeoJson | null;
  hrefDetalle: string;
  esReferencia: boolean;
}

/** Poligonos referenciales en Pailon Sur cuando aun no hay lotes habilitados o dibujados en la BD. */
const POLIGONO_REF_1: PoligonoGeoJson = {
  type: "Polygon",
  coordinates: [
    [
      [-62.592, -17.734],
      [-62.581, -17.734],
      [-62.581, -17.743],
      [-62.592, -17.743],
      [-62.592, -17.734],
    ],
  ],
};

const POLIGONO_REF_2: PoligonoGeoJson = {
  type: "Polygon",
  coordinates: [
    [
      [-62.579, -17.732],
      [-62.567, -17.732],
      [-62.567, -17.741],
      [-62.579, -17.741],
      [-62.579, -17.732],
    ],
  ],
};

const POLIGONO_REF_3: PoligonoGeoJson = {
  type: "Polygon",
  coordinates: [
    [
      [-62.59, -17.745],
      [-62.578, -17.745],
      [-62.578, -17.754],
      [-62.59, -17.754],
      [-62.59, -17.745],
    ],
  ],
};

const POLIGONO_REF_4: PoligonoGeoJson = {
  type: "Polygon",
  coordinates: [
    [
      [-62.576, -17.743],
      [-62.565, -17.743],
      [-62.565, -17.752],
      [-62.576, -17.752],
      [-62.576, -17.743],
    ],
  ],
};

const PARCELAS_DEMO_SHOWCASE: TarjetaParcelaVista[] = [
  {
    id: "ref-norte-a",
    nombre: "Lote Norte A — Pailón",
    cultivo: "Soya",
    temporada: "Campaña de Verano",
    ubicacion: "Pailón Sur, Santa Cruz",
    hectareas: 120,
    rendimientoTnHa: 3.4,
    estadoLabel: "Disponible · En curso",
    fotoPortada: "/assets/hero-1.jpg",
    poligono: POLIGONO_REF_1,
    hrefDetalle: "/parcelas",
    esReferencia: true,
  },
  {
    id: "ref-san-juan",
    nombre: "Lote San Juan B",
    cultivo: "Maíz",
    temporada: "Campaña de Verano",
    ubicacion: "Pailón Sur, Santa Cruz",
    hectareas: 85,
    rendimientoTnHa: 5.8,
    estadoLabel: "Disponible · Monitoreada",
    fotoPortada: "/assets/hero-2.jpg",
    poligono: POLIGONO_REF_2,
    hrefDetalle: "/parcelas",
    esReferencia: true,
  },
  {
    id: "ref-trigo-sur",
    nombre: "Parcela Sur — Brecha 8",
    cultivo: "Trigo",
    temporada: "Campaña de Invierno",
    ubicacion: "Pailón Sur, Santa Cruz",
    hectareas: 95,
    rendimientoTnHa: 2.7,
    estadoLabel: "Disponible · Planificada",
    fotoPortada: "/assets/banner-field.jpg",
    poligono: POLIGONO_REF_3,
    hrefDetalle: "/parcelas",
    esReferencia: true,
  },
  {
    id: "ref-sesamo-este",
    nombre: "Sector Este — Las Piedras",
    cultivo: "Sésamo",
    temporada: "Campaña de Invierno",
    ubicacion: "Pailón Sur, Santa Cruz",
    hectareas: 64,
    rendimientoTnHa: 1.2,
    estadoLabel: "Disponible · Trazable",
    fotoPortada: "/assets/hero-crop.jpg",
    poligono: POLIGONO_REF_4,
    hrefDetalle: "/parcelas",
    esReferencia: true,
  },
];

function normalizarTexto(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase();
}

function convertirCatalogoATarjeta(p: CatalogoParcela): TarjetaParcelaVista {
  const rendimiento =
    p.rendimientoEstimadoTnHa ??
    (p.produccionEstimadaTn !== null && p.hectareas > 0
      ? Math.round((p.produccionEstimadaTn / p.hectareas) * 100) / 100
      : null);

  return {
    id: p.id,
    nombre: p.nombre,
    cultivo: p.cultivoActual ?? "Cultivo activo",
    temporada: p.temporadaActual ?? "Campaña en curso",
    ubicacion: p.ubicacionTexto ?? "Pailón Sur, Santa Cruz",
    hectareas: p.hectareas,
    rendimientoTnHa: rendimiento,
    estadoLabel: "Disponible para preventa",
    fotoPortada: p.fotoPortada ?? null,
    poligono: p.poligono ?? null,
    hrefDetalle: `/parcelas/${p.id}`,
    esReferencia: false,
  };
}

export function LandingPreventaSeccion({
  parcelasReales,
}: {
  parcelasReales: CatalogoParcela[];
}) {
  const hayReales = parcelasReales.length > 0;
  const baseParcelas = useMemo<TarjetaParcelaVista[]>(() => {
    if (hayReales) {
      return parcelasReales.map(convertirCatalogoATarjeta);
    }
    return PARCELAS_DEMO_SHOWCASE;
  }, [hayReales, parcelasReales]);

  const [filtroCultivo, setFiltroCultivo] =
    useState<(typeof FILTROS_CULTIVO)[number]>("Todos");
  const [seleccionadaId, setSeleccionadaId] = useState<string | null>(null);
  const [mapaCompletoAbierto, setMapaCompletoAbierto] = useState(false);

  const parcelasFiltradas = useMemo(() => {
    if (filtroCultivo === "Todos") return baseParcelas;
    const objetivo = normalizarTexto(filtroCultivo);
    return baseParcelas.filter((p) =>
      normalizarTexto(p.cultivo).includes(objetivo),
    );
  }, [baseParcelas, filtroCultivo]);

  const tarjetasVisibles = parcelasFiltradas.slice(0, 4);

  const parcelasParaMapa = useMemo<ParcelaMapaItem[]>(() => {
    const conPoligono = parcelasFiltradas
      .filter((p): p is TarjetaParcelaVista & { poligono: PoligonoGeoJson } =>
        Boolean(p.poligono),
      )
      .map((p) => ({
        id: p.id,
        nombre: p.nombre,
        cultivo: p.cultivo,
        hectareas: p.hectareas,
        rendimientoTnHa: p.rendimientoTnHa,
        poligono: p.poligono,
        temporada: p.temporada,
        ubicacion: p.ubicacion,
        esReferencia: p.esReferencia,
      }));

    if (conPoligono.length > 0) return conPoligono;

    // Respaldo espacial cuando las parcelas reales aun no tienen poligono dibujado
    const poligonosRespaldo = [
      POLIGONO_REF_1,
      POLIGONO_REF_2,
      POLIGONO_REF_3,
      POLIGONO_REF_4,
    ];
    return parcelasFiltradas.slice(0, 4).map((p, idx) => ({
      id: p.id,
      nombre: p.nombre,
      cultivo: p.cultivo,
      hectareas: p.hectareas,
      rendimientoTnHa: p.rendimientoTnHa,
      poligono: poligonosRespaldo[idx % poligonosRespaldo.length],
      temporada: p.temporada,
      ubicacion: p.ubicacion,
      esReferencia: true,
    }));
  }, [parcelasFiltradas]);

  const parcelaActivaMapa = useMemo(() => {
    if (parcelasParaMapa.length === 0) return null;
    return (
      parcelasParaMapa.find((p) => p.id === seleccionadaId) ??
      parcelasParaMapa[0]
    );
  }, [parcelasParaMapa, seleccionadaId]);

  return (
    <section
      id="parcelas-preventa"
      className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24"
    >
      {/* Cabecera + Filtros */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-[#00a859]/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-[#006B4F]">
            <Compass className="h-3.5 w-3.5 text-[#00a859]" aria-hidden />
            Catálogo en vivo
          </span>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-[#17211D] sm:text-3xl">
            Parcelas disponibles para preventa
          </h2>
          <p className="mt-2 max-w-2xl text-base text-[#68736D]">
            {hayReales
              ? "Explora los lotes habilitados, compara su rendimiento estimado y ubica sus polígonos exactos en el mapa."
              : "Vista previa de lotes productivos en Pailón Sur. Habilita parcelas reales desde el panel para publicarlas automáticamente."}
          </p>
        </div>

        <div
          role="group"
          aria-label="Filtrar parcelas por cultivo"
          className="flex flex-wrap items-center gap-2"
        >
          {FILTROS_CULTIVO.map((cultivo) => {
            const activo = filtroCultivo === cultivo;
            return (
              <button
                key={cultivo}
                type="button"
                aria-pressed={activo}
                onClick={() => {
                  setFiltroCultivo(cultivo);
                  setSeleccionadaId(null);
                }}
                className={`min-h-11 rounded-full px-4 text-sm font-semibold transition-all ${
                  activo
                    ? "bg-[#004b36] text-white shadow-sm"
                    : "border border-[#004b36]/15 bg-white text-stone-700 hover:border-[#00a859] hover:text-[#004b36]"
                }`}
              >
                {cultivo}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid Principal de 3 columnas */}
      <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-stretch">
        {/* Columnas 1 y 2: Tarjetas de Parcelas */}
        <div className="lg:col-span-2">
          {tarjetasVisibles.length === 0 ? (
            <div className="flex h-full min-h-[380px] flex-col items-center justify-center rounded-3xl border-2 border-dashed border-[#00a859]/35 bg-white p-8 text-center">
              <Sprout className="h-10 w-10 text-[#00a859]" aria-hidden />
              <p className="mt-3 text-lg font-bold text-[#004b36]">
                No hay parcelas disponibles con {filtroCultivo}
              </p>
              <p className="mt-1 text-sm text-stone-600">
                Prueba otro cultivo o vuelve a seleccionar &ldquo;Todos&rdquo; para ver
                el catálogo completo.
              </p>
              <button
                type="button"
                onClick={() => setFiltroCultivo("Todos")}
                className="mt-5 min-h-11 rounded-full bg-[#004b36] px-6 text-sm font-semibold text-white hover:bg-[#003b2a]"
              >
                Ver todos los cultivos
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {tarjetasVisibles.map((parcela) => {
                const resaltada = parcelaActivaMapa?.id === parcela.id;
                return (
                  <article
                    key={parcela.id}
                    onMouseEnter={() => setSeleccionadaId(parcela.id)}
                    onFocus={() => setSeleccionadaId(parcela.id)}
                    className={`group flex flex-col justify-between rounded-3xl border-2 bg-white p-6 shadow-xs transition-all ${
                      resaltada
                        ? "border-[#00a859] shadow-md shadow-[#00a859]/10"
                        : "border-[#00a859]/30 hover:border-[#00a859]"
                    }`}
                  >
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#00a859]/12 px-3 py-1 text-xs font-bold text-[#004b36]">
                          <Sprout className="h-3.5 w-3.5 text-[#00a859]" aria-hidden />
                          {parcela.temporada}
                        </span>
                        <span className="rounded-full bg-[#f8faf9] px-3 py-1 text-xs font-semibold text-stone-600 ring-1 ring-stone-200">
                          {parcela.cultivo}
                        </span>
                      </div>

                      <h3 className="mt-4 text-lg font-bold text-[#17211D] transition-colors group-hover:text-[#006B4F]">
                        {parcela.nombre}
                      </h3>
                      <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-[#68736D]">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-[#00a859]" aria-hidden />
                        {parcela.ubicacion}
                      </p>

                      <dl className="mt-5 grid grid-cols-3 gap-2 rounded-2xl bg-[#f8faf9] p-3.5 text-xs">
                        <div>
                          <dt className="flex items-center gap-1 text-[#68736D]">
                            <Ruler className="h-3 w-3 text-[#00a859]" aria-hidden />
                            Superficie
                          </dt>
                          <dd className="mt-1 text-sm font-bold text-[#17211D]">
                            {parcela.hectareas} ha
                          </dd>
                        </div>
                        <div>
                          <dt className="flex items-center gap-1 text-[#68736D]">
                            <TrendingUp className="h-3 w-3 text-[#00a859]" aria-hidden />
                            Estimado
                          </dt>
                          <dd className="mt-1 text-sm font-bold text-[#006B4F]">
                            {parcela.rendimientoTnHa !== null
                              ? `${parcela.rendimientoTnHa} t/ha`
                              : "En eval."}
                          </dd>
                        </div>
                        <div>
                          <dt className="flex items-center gap-1 text-[#68736D]">
                            <CheckCircle2 className="h-3 w-3 text-[#00a859]" aria-hidden />
                            Estado
                          </dt>
                          <dd className="mt-1 truncate text-xs font-bold text-[#17211D]">
                            {parcela.esReferencia ? "Ejemplo" : "Activa"}
                          </dd>
                        </div>
                      </dl>
                    </div>

                    <div className="mt-5 flex items-center justify-between gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setSeleccionadaId(parcela.id)}
                        className="text-xs font-semibold text-[#004b36]/80 hover:text-[#00a859]"
                      >
                        Ubicar polígono →
                      </button>

                      <Link
                        href={parcela.hrefDetalle}
                        className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-[#004b36] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#00a859]"
                      >
                        Ver parcela
                        <ArrowRight className="h-4 w-4" aria-hidden />
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        {/* Columna 3: Tarjeta Oscura con Mapa Interactivo de Polígonos */}
        <div className="relative flex min-h-[430px] flex-col overflow-hidden rounded-3xl border border-[#00a859]/35 bg-[#071712] shadow-xl">
          <div className="pointer-events-none absolute inset-x-4 top-4 z-[500] flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#00a859]/40 bg-[#071712]/85 px-3 py-1.5 text-xs font-semibold text-emerald-100 backdrop-blur-md">
              <span className="h-2 w-2 animate-pulse rounded-full bg-[#00a859]" />
              {parcelasParaMapa.length}{" "}
              {parcelasParaMapa.length === 1 ? "polígono activo" : "polígonos activos"}
            </span>
          </div>

          <div className="flex-1">
            <MapaPreventaOscura
              parcelas={parcelasParaMapa}
              seleccionadaId={parcelaActivaMapa?.id ?? null}
              onSeleccionar={setSeleccionadaId}
            />
          </div>

          <div className="pointer-events-none absolute inset-x-4 bottom-4 z-[500] flex flex-col gap-3">
            {parcelaActivaMapa && (
              <div className="rounded-2xl border border-[#00a859]/35 bg-[#071712]/88 px-4 py-3 text-white backdrop-blur-md">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#00a859]">
                  Parcela en foco
                </p>
                <div className="mt-0.5 flex items-baseline justify-between gap-2">
                  <p className="truncate text-sm font-bold">{parcelaActivaMapa.nombre}</p>
                  <span className="shrink-0 text-xs font-semibold text-emerald-200">
                    {parcelaActivaMapa.hectareas} ha
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-emerald-100/75">
                  {parcelaActivaMapa.cultivo}
                  {parcelaActivaMapa.rendimientoTnHa !== null
                    ? ` · Estimación ${parcelaActivaMapa.rendimientoTnHa} t/ha`
                    : ""}
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={() => setMapaCompletoAbierto(true)}
              className="pointer-events-auto inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-bold text-[#004b36] shadow-lg transition-transform hover:-translate-y-0.5 hover:bg-[#E8F5EF]"
            >
              <Maximize2 className="h-4 w-4 text-[#00a859]" aria-hidden />
              Ver en el mapa completo
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Mapa Completo */}
      {mapaCompletoAbierto && (
        <Modal
          titulo="Mapa geoespacial de parcelas en preventa"
          onClose={() => setMapaCompletoAbierto(false)}
          ancho="3xl"
        >
          <div className="space-y-4 pb-5">
            <div className="h-[58dvh] min-h-[360px] w-full overflow-hidden rounded-2xl border border-[#00a859]/35 bg-[#071712]">
              <MapaPreventaOscura
                parcelas={parcelasParaMapa}
                seleccionadaId={parcelaActivaMapa?.id ?? null}
                onSeleccionar={setSeleccionadaId}
                scrollZoom
                zoomControl
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {parcelasParaMapa.map((p) => {
                  const activa = p.id === parcelaActivaMapa?.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSeleccionadaId(p.id)}
                      className={`inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors ${
                        activa
                          ? "bg-[#004b36] text-white"
                          : "border border-stone-200 bg-white text-stone-700 hover:border-[#00a859]"
                      }`}
                    >
                      <Expand className="h-3 w-3 text-[#00a859]" aria-hidden />
                      {p.nombre} ({p.hectareas} ha)
                    </button>
                  );
                })}
              </div>

              <Link
                href="/parcelas"
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-[#00a859] px-5 text-sm font-bold text-white hover:bg-[#008e4b]"
              >
                Abrir catálogo completo
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}
