"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  CheckCircle2,
  Compass,
  MapPin,
  Maximize2,
  Ruler,
  Scale,
  Sprout,
  TrendingUp,
} from "lucide-react";
import { useMemo, useState } from "react";
import { EstadoVacio } from "@/components/estado/estado-vacio";
import { CropChip } from "@/components/ui/crop-chip";
import { VisorImagen, type ImagenVisorItem } from "@/components/visor-imagen";
import { urlApi } from "@/lib/api";
import type { CatalogoParcela, PoligonoGeoJson } from "@/lib/types";
import { MapaPreventaCliente } from "./mapa-preventa-cliente";

const FILTROS_CULTIVO = [
  "Todos",
  "Soya",
  "Sorgo",
  "Trigo",
  "Sésamo",
] as const;

interface TarjetaParcelaVista {
  id: string;
  nombre: string;
  cultivo: string | null;
  temporada: string | null;
  ubicacion: string;
  hectareas: number;
  rendimientoTnHa: number | null;
  produccionEstimadaTn: number | null;
  estadoLabel: string;
  fotoPortada: string | null;
  totalFotosPublicadas: number;
  hrefDetalle: string;
  poligono: PoligonoGeoJson | null;
}

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
    cultivo: p.cultivoActual ?? null,
    temporada: p.temporadaActual ?? null,
    ubicacion: p.ubicacionTexto ?? "Pailón Sur, Santa Cruz",
    hectareas: p.hectareas,
    rendimientoTnHa: rendimiento,
    produccionEstimadaTn: produccion,
    estadoLabel: "Disponible para preventa",
    fotoPortada: p.fotoPortada ? urlApi(p.fotoPortada) : null,
    totalFotosPublicadas: p.totalFotosPublicadas ?? (p.fotoPortada ? 1 : 0),
    hrefDetalle: `/parcelas/${p.id}`,
    poligono: p.poligono ?? null,
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
  const baseParcelas = useMemo<TarjetaParcelaVista[]>(
    () => parcelasReales.map(convertirCatalogoATarjeta),
    [parcelasReales],
  );

  const [filtroCultivo, setFiltroCultivo] =
    useState<(typeof FILTROS_CULTIVO)[number]>("Todos");
  const [imagenAmpliada, setImagenAmpliada] = useState<ImagenVisorItem | null>(null);

  const parcelasFiltradas = useMemo(() => {
    if (filtroCultivo === "Todos") return baseParcelas;
    const objetivo = normalizarTexto(filtroCultivo);
    return baseParcelas.filter((p) =>
      normalizarTexto(p.cultivo ?? "").includes(objetivo),
    );
  }, [baseParcelas, filtroCultivo]);

  const tarjetasVisibles = modoPaginaCompleta
    ? parcelasFiltradas
    : parcelasFiltradas.slice(0, 4);

  const TituloPrincipal = modoPaginaCompleta ? "h1" : "h2";
  const conPoligono = baseParcelas.flatMap((p) =>
    p.poligono
      ? [{ id: p.id, nombre: p.nombre, cultivo: p.cultivo, hectareas: p.hectareas, poligono: p.poligono }]
      : [],
  );
  const hectareasTotales =
    Math.round(baseParcelas.reduce((total, p) => total + p.hectareas, 0) * 100) / 100;

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
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-borde bg-superficie px-4 text-sm font-semibold text-tinta shadow-tarjeta transition-colors hover:border-marca-vivo hover:text-marca"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Volver al inicio
          </Link>
        </div>
      )}

      {/* Cabecera + Filtros */}
      <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-7">
          <span className="inline-flex items-center gap-2 rounded-full border border-marca/30 px-3.5 py-1 text-sm font-medium text-marca">
            <Compass className="h-4 w-4" aria-hidden />
            Catálogo en vivo
          </span>
          <TituloPrincipal className="mt-4 font-titulo text-4xl leading-[1.05] text-tinta sm:text-6xl">
            Parcelas disponibles para preventa
          </TituloPrincipal>
        </div>
        <p className="max-w-md text-base leading-relaxed text-tinta-suave lg:col-span-4 lg:col-start-9">
          {hayReales
            ? "Explora los lotes habilitados, revisa su superficie y el promedio histórico de su cultivo, y consulta el detalle completo de cada parcela."
            : "Cuando AgroAn habilite parcelas para preventa desde el panel, aparecerán aquí con toda su información."}
        </p>
      </div>

      {/* Catalogo completo: mapa de todas las parcelas, con sus conteos reales */}
      {modoPaginaCompleta && hayReales && (
        <div className="mt-8 rounded-tarjeta border border-borde bg-superficie p-3 shadow-tarjeta sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 px-1 pb-3">
            <p className="text-lg font-semibold text-tinta">Dónde están</p>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-fondo px-3 py-1 text-sm font-medium text-tinta">
                {baseParcelas.length} {baseParcelas.length === 1 ? "parcela" : "parcelas"}
              </span>
              <span className="rounded-full bg-fondo px-3 py-1 text-sm font-medium text-tinta">
                {hectareasTotales} ha
              </span>
            </div>
          </div>
          <div className="h-64 overflow-hidden rounded-control sm:h-80">
            <MapaPreventaCliente parcelas={conPoligono} />
          </div>
          <p className="px-1 pt-2 text-sm text-tinta-suave">Toca una parcela en el mapa para ver su detalle.</p>
        </div>
      )}

      <div
        role="group"
        aria-label="Filtrar parcelas por cultivo"
        className="mt-8 flex flex-wrap items-center gap-2"
      >
          {FILTROS_CULTIVO.map((cultivo) => {
            const activo = filtroCultivo === cultivo;
            return (
              <button
                key={cultivo}
                type="button"
                aria-pressed={activo}
                onClick={() => setFiltroCultivo(cultivo)}
                className={`min-h-11 rounded-full px-4 text-sm font-semibold transition-colors ${
                  activo
                    ? "bg-tinta text-white"
                    : "border border-borde bg-superficie text-tinta hover:border-tinta"
                }`}
              >
                {cultivo}
              </button>
            );
          })}
      </div>

      {/* Contenido principal */}
      {!hayReales ? (
        <div className="mt-10 rounded-tarjeta border border-borde bg-superficie p-8 shadow-tarjeta">
          <EstadoVacio titulo="Todavía no hay parcelas disponibles">
            <p>Cuando haya parcelas habilitadas para preventa, aparecerán aquí.</p>
          </EstadoVacio>
        </div>
      ) : (
        <div className="mt-10">
          {tarjetasVisibles.length === 0 ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center rounded-tarjeta border-2 border-dashed border-sindatos-borde bg-superficie p-8 text-center">
              <Sprout className="h-10 w-10 text-marca" aria-hidden />
              <p className="mt-3 text-lg font-bold text-tinta">
                No hay parcelas disponibles con {filtroCultivo}
              </p>
              <p className="mt-1 text-sm text-tinta-suave">
                Prueba otro cultivo o vuelve a seleccionar &ldquo;Todos&rdquo; para ver
                el catálogo completo.
              </p>
              <button
                type="button"
                onClick={() => setFiltroCultivo("Todos")}
                className="mt-5 min-h-11 rounded-full bg-tinta px-6 text-sm font-semibold text-white hover:bg-marca-oscuro"
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
                    className="group flex flex-col rounded-tarjeta bg-superficie p-3 shadow-tarjeta transition-shadow hover:shadow-flotante"
                  >
                    {parcela.fotoPortada ? (
                      <div className="relative h-52 w-full overflow-hidden rounded-[20px_56px] bg-hueso">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={parcela.fotoPortada}
                          alt={`Foto de ${parcela.nombre}`}
                          onClick={() =>
                            setImagenAmpliada({
                              src: parcela.fotoPortada!,
                              alt: `Foto de ${parcela.nombre}`,
                              descripcion: parcela.nombre,
                              subtitulo: [parcela.cultivo, `${parcela.hectareas} ha`, parcela.ubicacion].filter(Boolean).join(" · "),
                            })
                          }
                          className="h-full w-full cursor-pointer object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                        />
                        <button
                          type="button"
                          aria-label={`Expandir imagen de ${parcela.nombre}`}
                          title="Expandir imagen"
                          onClick={() =>
                            setImagenAmpliada({
                              src: parcela.fotoPortada!,
                              alt: `Foto de ${parcela.nombre}`,
                              descripcion: parcela.nombre,
                              subtitulo: [parcela.cultivo, `${parcela.hectareas} ha`, parcela.ubicacion].filter(Boolean).join(" · "),
                            })
                          }
                          className="absolute right-3 top-3 inline-flex size-11 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-xs transition-colors hover:bg-black/80"
                        >
                          <Maximize2 className="h-4 w-4" aria-hidden />
                        </button>
                        {parcela.totalFotosPublicadas > 1 && (
                          <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-noche/80 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                            <Camera className="h-3.5 w-3.5 text-marca-vivo" aria-hidden />
                            {parcela.totalFotosPublicadas} fotos
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="grid h-52 w-full place-items-center rounded-[20px_56px] border-2 border-dashed border-sindatos-borde bg-sindatos-fondo text-center text-sm font-medium text-sindatos-texto">
                        <span className="flex flex-col items-center gap-2">
                          <Camera className="h-6 w-6" aria-hidden />
                          Sin fotos
                        </span>
                      </div>
                    )}

                    <div className="flex flex-1 flex-col justify-between px-3 pb-3 pt-5">
                      <div>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          {parcela.temporada && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-marca-vivo/12 px-3 py-1 text-xs font-bold text-marca-oscuro">
                              <Sprout className="h-3.5 w-3.5 text-marca-vivo" aria-hidden />
                              {parcela.temporada}
                            </span>
                          )}
                          <CropChip cultivo={parcela.cultivo} />
                        </div>

                        <h3 className="mt-4 text-lg font-bold text-tinta transition-colors group-hover:text-marca">
                          {parcela.nombre}
                        </h3>
                        <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-tinta-suave">
                          <MapPin className="h-3.5 w-3.5 shrink-0 text-marca-vivo" aria-hidden />
                          {parcela.ubicacion}
                        </p>

                        <dl className="mt-5 grid grid-cols-3 gap-2 rounded-control bg-hueso p-3.5 text-xs">
                          <div>
                            <dt className="flex items-center gap-1 text-tinta-suave">
                              <Ruler className="h-3 w-3 shrink-0 text-marca-vivo" aria-hidden />
                              Superficie
                            </dt>
                            <dd className="mt-1 text-sm font-bold text-tinta">
                              {parcela.hectareas} ha
                            </dd>
                          </div>
                          <div>
                            <dt className="flex items-center gap-1 text-tinta-suave">
                              <TrendingUp className="h-3 w-3 shrink-0 text-marca-vivo" aria-hidden />
                              Prom. hist.
                            </dt>
                            {parcela.rendimientoTnHa !== null ? (
                              <dd className="mt-1 text-sm font-bold text-marca">
                                {parcela.rendimientoTnHa} t/ha
                              </dd>
                            ) : (
                              <dd className="mt-1 text-sm font-semibold text-sindatos-texto">Sin datos</dd>
                            )}
                          </div>
                          <div>
                            <dt className="flex items-center gap-1 text-tinta-suave">
                              <Scale className="h-3 w-3 shrink-0 text-marca-vivo" aria-hidden />
                              Ref. total
                            </dt>
                            {parcela.produccionEstimadaTn !== null ? (
                              <dd className="mt-1 truncate text-sm font-bold text-tinta">
                                {parcela.produccionEstimadaTn} t
                              </dd>
                            ) : (
                              <dd className="mt-1 text-sm font-semibold text-sindatos-texto">Sin datos</dd>
                            )}
                          </div>
                        </dl>
                      </div>

                      <div className="mt-5 flex items-center justify-between gap-3 border-t border-borde pt-4">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-marca">
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-marca-vivo" aria-hidden />
                          {parcela.estadoLabel}
                        </span>

                        <Link
                          href={parcela.hrefDetalle}
                          className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full bg-tinta px-4 text-sm font-semibold text-white transition-colors hover:bg-marca-oscuro"
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
                    className="inline-flex min-h-11 items-center gap-2 rounded-full bg-tinta px-6 text-sm font-semibold text-white transition-colors hover:bg-marca-oscuro"
                  >
                    Ver catálogo completo ({baseParcelas.length}{" "}
                    {baseParcelas.length === 1 ? "parcela" : "parcelas"})
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {imagenAmpliada && (
        <VisorImagen
          imagenes={[imagenAmpliada]}
          onCerrar={() => setImagenAmpliada(null)}
        />
      )}
    </section>
  );
}
