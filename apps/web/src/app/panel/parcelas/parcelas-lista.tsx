"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { ArrowRight, Info, MapPin, Ruler, Sprout, Tag } from "lucide-react";
import { Badge } from "@/components/badge";
import { EstadoDeParcela } from "@/components/estado/estado-parcela";
import type { EstadoIndicador } from "@/lib/estado";
import type { CampanaVigente } from "@/lib/parcelas";
import type { Parcela } from "@/lib/types";

/**
 * Cards de parcelas junto al mapa. Clic = seleccionar y centrar.
 * Cursor o foco sobre una card resalta su poligono (y al reves: la card
 * se resalta cuando el cursor esta sobre su poligono).
 */
export function ParcelasLista({
  parcelas,
  campanaVigentePorParcela,
  estadoPorParcela,
  estadoListo,
  seleccionadaId,
  resaltadaId,
  onSeleccionar,
  onResaltar,
  className = "",
}: {
  parcelas: Parcela[];
  campanaVigentePorParcela: Record<string, CampanaVigente>;
  estadoPorParcela: Record<string, EstadoIndicador>;
  /** false mientras se calculan los estados. */
  estadoListo: boolean;
  seleccionadaId: string | null;
  resaltadaId: string | null;
  onSeleccionar: (parcela: Parcela) => void;
  onResaltar: (id: string | null) => void;
  className?: string;
}) {
  const contenedorRef = useRef<HTMLUListElement>(null);

  // Si se eligio desde el mapa, la card se hace visible dentro de la lista
  // (sin mover la pagina).
  useEffect(() => {
    const contenedor = contenedorRef.current;
    if (!contenedor || !seleccionadaId) return;
    const card = contenedor.querySelector<HTMLElement>(
      `[data-parcela-id="${seleccionadaId}"]`,
    );
    if (card) {
      contenedor.scrollTo({ top: card.offsetTop - 8, behavior: "smooth" });
    }
  }, [seleccionadaId]);

  return (
    <ul
      ref={contenedorRef}
      aria-label="Lista de parcelas"
      className={`relative space-y-3 lg:max-h-[calc(100dvh-13rem)] lg:overflow-y-auto lg:pr-1 ${className}`}
    >
      {parcelas.map((parcela) => {
        const vigente = campanaVigentePorParcela[parcela.id];
        const seleccionada = parcela.id === seleccionadaId;
        const resaltada = parcela.id === resaltadaId;
        return (
          <li
            key={parcela.id}
            data-parcela-id={parcela.id}
            onMouseEnter={() => onResaltar(parcela.id)}
            onMouseLeave={() => onResaltar(null)}
            onFocus={() => onResaltar(parcela.id)}
            onBlur={() => onResaltar(null)}
            className={`rounded-lg border bg-white ${
              seleccionada
                ? "border-stone-900 ring-2 ring-stone-900"
                : resaltada
                  ? "border-stone-500 bg-stone-50 ring-2 ring-stone-300"
                  : "border-stone-200"
            } ${parcela.activa ? "" : "opacity-60"}`}
          >
            <button
              type="button"
              onClick={() => onSeleccionar(parcela)}
              aria-pressed={seleccionada}
              className="block w-full space-y-2 p-3 text-left"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="text-base font-bold text-stone-900">{parcela.nombre}</p>
                <EstadoDeParcela
                  activa={parcela.activa}
                  estado={estadoPorParcela[parcela.id]}
                  listo={estadoListo}
                  tamano="sm"
                />
              </div>
              <p className="flex items-start gap-1.5 text-sm text-stone-700">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-stone-500" aria-hidden />
                {parcela.ubicacionTexto}
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-stone-800">
                <span className="inline-flex items-center gap-1.5" title="Superficie de la parcela">
                  <Ruler className="h-4 w-4 text-stone-500" aria-hidden />
                  {parcela.hectareas} ha
                </span>
                <span className="inline-flex items-center gap-1.5" title="Cultivo de la campaña en curso o planificada">
                  <Sprout className="h-4 w-4 text-stone-500" aria-hidden />
                  {vigente?.cultivo ?? "Sin campaña"}
                </span>
              </div>
              {parcela.disponibleParaPreventa && (
                <div>
                  <Badge
                    tono="verde"
                    icono={Tag}
                    ayuda="Visible para compradores en la página pública de preventa"
                  >
                    En preventa
                  </Badge>
                </div>
              )}
              {!parcela.poligono && (
                <p className="flex items-center gap-1.5 text-sm text-stone-600">
                  <Info className="h-4 w-4 shrink-0" aria-hidden />
                  Sin polígono dibujado: no aparece en el mapa
                </p>
              )}
            </button>
            <Link
              href={`/panel/parcelas/${parcela.id}`}
              className="flex min-h-11 items-center justify-end gap-1 border-t border-stone-100 px-3 text-sm font-bold text-emerald-800 hover:bg-emerald-50"
            >
              Ver detalle
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
