"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  CheckCircle2,
  Compass,
  MapPin,
  Ruler,
  Scale,
  Sprout,
  TrendingUp,
} from "lucide-react";
import { useMemo, useState } from "react";
import { EstadoVacio } from "@/components/estado/estado-vacio";
import type { CatalogoParcela } from "@/lib/types";

const FILTROS_CULTIVO = [
  "Todos",
  "Soya",
  "Sorgo",
  "Maíz",
  "Trigo",
  "Sésamo",
] as const;

interface TarjetaParcelaVista {
  id: string;
  nombre: string;
  cultivo: string;
  temporada: string;
  ubicacion: string;
  hectareas: number;
  rendimientoTnHa: number | null;
  produccionEstimadaTn: number | null;
  estadoLabel: string;
  fotoPortada: string | null;
  totalFotosPublicadas: number;
  hrefDetalle: string;
  esReferencia: boolean;
}

const PARCELAS_DEMO_SHOWCASE: TarjetaParcelaVista[] = [
  {
    id: "ref-norte-a",
    nombre: "Lote Norte A — Pailón",
    cultivo: "Soya",
    temporada: "Campaña de Verano",
    ubicacion: "Pailón Sur, Santa Cruz",
    hectareas: 120,
    rendimientoTnHa: 3.4,
    produccionEstimadaTn: 408,
    estadoLabel: "Disponible · En curso",
    fotoPortada: "/assets/hero-1.jpg",
    totalFotosPublicadas: 1,
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
    produccionEstimadaTn: 493,
    estadoLabel: "Disponible · Monitoreada",
    fotoPortada: "/assets/hero-2.jpg",
    totalFotosPublicadas: 1,
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
    produccionEstimadaTn: 256.5,
    estadoLabel: "Disponible · Planificada",
    fotoPortada: "/assets/banner-field.jpg",
    totalFotosPublicadas: 1,
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
    produccionEstimadaTn: 76.8,
    estadoLabel: "Disponible · Trazable",
    fotoPortada: "/assets/hero-crop.jpg",
    totalFotosPublicadas: 1,
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
  const produccion =
    p.produccionEstimadaTn ??
    (rendimiento !== null
      ? Math.round(rendimiento * p.hectareas * 100) / 100
      : null);

  return {
    id: p.id,
    nombre: p.nombre,
    cultivo: p.cultivoActual ?? "Cultivo activo",
    temporada: p.temporadaActual ?? "Campaña en curso",
    ubicacion: p.ubicacionTexto ?? "Pailón Sur, Santa Cruz",
    hectareas: p.hectareas,
    rendimientoTnHa: rendimiento,
    produccionEstimadaTn: produccion,
    estadoLabel: "Disponible para preventa",
    fotoPortada: p.fotoPortada ?? null,
    totalFotosPublicadas: p.totalFotosPublicadas ?? (p.fotoPortada ? 1 : 0),
    hrefDetalle: `/parcelas/${p.id}`,
    esReferencia: false,
  };
}

export function LandingPreventaSeccion({
  parcelasReales,
  modoPaginaCompleta = false,
}: {
  parcelasReales: CatalogoParcela[];
  modoPaginaCompleta?: boolean;
}) {
  const hayReales = parcelasReales.length > 0;
  const baseParcelas = useMemo<TarjetaParcelaVista[]>(() => {
    if (hayReales) {
      return parcelasReales.map(convertirCatalogoATarjeta);
    }
    if (modoPaginaCompleta) return [];
    return PARCELAS_DEMO_SHOWCASE;
  }, [hayReales, modoPaginaCompleta, parcelasReales]);

  const [filtroCultivo, setFiltroCultivo] =
    useState<(typeof FILTROS_CULTIVO)[number]>("Todos");

  const parcelasFiltradas = useMemo(() => {
    if (filtroCultivo === "Todos") return baseParcelas;
    const objetivo = normalizarTexto(filtroCultivo);
    return baseParcelas.filter((p) =>
      normalizarTexto(p.cultivo).includes(objetivo),
    );
  }, [baseParcelas, filtroCultivo]);

  const tarjetasVisibles = modoPaginaCompleta
    ? parcelasFiltradas
    : parcelasFiltradas.slice(0, 4);

  const TituloPrincipal = modoPaginaCompleta ? "h1" : "h2";

  return (
    <section
      id="parcelas-preventa"
      className={`mx-auto max-w-7xl px-4 sm:px-6 ${
        modoPaginaCompleta ? "py-10 sm:py-14" : "py-16 sm:py-24"
      }`}
    >
      {modoPaginaCompleta && (
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-[#E4EAE6] bg-white px-4 text-sm font-semibold text-[#17211D] shadow-xs transition-colors hover:border-[#00a859] hover:text-[#006B4F]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Volver al inicio
          </Link>
        </div>
      )}

      {/* Cabecera + Filtros */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-[#00a859]/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-[#006B4F]">
            <Compass className="h-3.5 w-3.5 text-[#00a859]" aria-hidden />
            Catálogo en vivo
          </span>
          <TituloPrincipal className="mt-3 text-2xl font-bold tracking-tight text-[#17211D] sm:text-3xl">
            Parcelas disponibles para preventa
          </TituloPrincipal>
          <p className="mt-2 max-w-2xl text-base text-[#68736D]">
            {hayReales
              ? "Explora los lotes habilitados, revisa su superficie y promedio histórico por cultivo, y consulta el detalle completo de cada parcela."
              : modoPaginaCompleta
                ? "Cuando AgroAn habilite parcelas para preventa desde el panel, aparecerán automáticamente aquí con toda su información."
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
                onClick={() => setFiltroCultivo(cultivo)}
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

      {/* Contenido principal */}
      {modoPaginaCompleta && !hayReales ? (
        <div className="mt-10 rounded-3xl border border-[#E4EAE6] bg-white p-8 shadow-xs">
          <EstadoVacio titulo="Todavía no hay parcelas disponibles">
            <p>Cuando haya parcelas habilitadas para preventa, aparecerán aquí.</p>
          </EstadoVacio>
        </div>
      ) : (
        <div className="mt-10">
          {tarjetasVisibles.length === 0 ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center rounded-3xl border-2 border-dashed border-[#00a859]/35 bg-white p-8 text-center">
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
            <>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {tarjetasVisibles.map((parcela) => (
                  <article
                    key={parcela.id}
                    className="group flex flex-col overflow-hidden rounded-3xl border border-[#E4EAE6] bg-white shadow-xs transition-all hover:border-[#00a859] hover:shadow-md hover:shadow-[#00a859]/10"
                  >
                    {parcela.fotoPortada && (
                      <div className="relative h-44 w-full overflow-hidden bg-[#E8F5EF]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={parcela.fotoPortada}
                          alt={`Foto de ${parcela.nombre}`}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                        />
                        {parcela.totalFotosPublicadas > 1 && (
                          <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-[#071712]/80 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                            <Camera className="h-3.5 w-3.5 text-[#00a859]" aria-hidden />
                            {parcela.totalFotosPublicadas} fotos
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex flex-1 flex-col justify-between p-6">
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
                              <Ruler className="h-3 w-3 shrink-0 text-[#00a859]" aria-hidden />
                              Superficie
                            </dt>
                            <dd className="mt-1 text-sm font-bold text-[#17211D]">
                              {parcela.hectareas} ha
                            </dd>
                          </div>
                          <div>
                            <dt className="flex items-center gap-1 text-[#68736D]">
                              <TrendingUp className="h-3 w-3 shrink-0 text-[#00a859]" aria-hidden />
                              Prom. hist.
                            </dt>
                            <dd className="mt-1 text-sm font-bold text-[#006B4F]">
                              {parcela.rendimientoTnHa !== null
                                ? `${parcela.rendimientoTnHa} t/ha`
                                : "Sin hist."}
                            </dd>
                          </div>
                          <div>
                            <dt className="flex items-center gap-1 text-[#68736D]">
                              {parcela.produccionEstimadaTn !== null ? (
                                <Scale className="h-3 w-3 shrink-0 text-[#00a859]" aria-hidden />
                              ) : (
                                <CheckCircle2 className="h-3 w-3 shrink-0 text-[#00a859]" aria-hidden />
                              )}
                              Ref. total
                            </dt>
                            <dd className="mt-1 truncate text-sm font-bold text-[#17211D]">
                              {parcela.produccionEstimadaTn !== null
                                ? `${parcela.produccionEstimadaTn} t`
                                : parcela.esReferencia
                                  ? "Ejemplo"
                                  : "Disponible"}
                            </dd>
                          </div>
                        </dl>
                      </div>

                      <div className="mt-5 flex items-center justify-between gap-3 border-t border-[#E4EAE6] pt-4">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#006B4F]">
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#00a859]" aria-hidden />
                          {parcela.estadoLabel}
                        </span>

                        <Link
                          href={parcela.hrefDetalle}
                          className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full bg-[#004b36] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#00a859]"
                        >
                          Ver detalles
                          <ArrowRight className="h-4 w-4" aria-hidden />
                        </Link>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              {!modoPaginaCompleta && hayReales && (
                <div className="mt-8 flex justify-center sm:justify-start">
                  <Link
                    href="/parcelas"
                    className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#004b36]/20 bg-white px-6 text-sm font-semibold text-[#004b36] shadow-xs transition-colors hover:border-[#00a859] hover:bg-[#E8F5EF]"
                  >
                    Ver catálogo completo ({baseParcelas.length}{" "}
                    {baseParcelas.length === 1 ? "parcela" : "parcelas"})
                    <ArrowRight className="h-4 w-4 text-[#00a859]" aria-hidden />
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
