"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { ArrowRight, Info, MapPin, Ruler, Sprout, Tag } from "lucide-react";
import { Badge, BadgeEstadoCampana, BadgeEstadoParcela } from "@/components/badge";
import type { CampanaVigente } from "@/lib/parcelas";
import type { Parcela } from "@/lib/types";

/** Cards de parcelas para el panel lateral del mapa: clic = seleccionar/centrar. */
export function ParcelasLista({
  parcelas,
  campanaVigentePorParcela,
  seleccionadaId,
  onSeleccionar,
  className = "",
}: {
  parcelas: Parcela[];
  campanaVigentePorParcela: Record<string, CampanaVigente>;
  seleccionadaId: string | null;
  onSeleccionar: (parcela: Parcela) => void;
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
        return (
          <li
            key={parcela.id}
            data-parcela-id={parcela.id}
            className={`rounded-lg border bg-white ${
              seleccionada
                ? "border-amber-400 ring-2 ring-amber-300"
                : "border-stone-200 hover:border-stone-300"
            } ${parcela.activa ? "" : "opacity-60"}`}
          >
            <button
              type="button"
              onClick={() => onSeleccionar(parcela)}
              aria-pressed={seleccionada}
              className="block w-full space-y-2 p-3 text-left"
            >
              <p className="font-semibold text-stone-900">{parcela.nombre}</p>
              <p className="flex items-start gap-1.5 text-sm text-stone-600">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" aria-hidden />
                {parcela.ubicacionTexto}
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-stone-700">
                <span className="inline-flex items-center gap-1.5" title="Superficie de la parcela">
                  <Ruler className="h-4 w-4 text-stone-400" aria-hidden />
                  {parcela.hectareas} ha
                </span>
                <span className="inline-flex items-center gap-1.5" title="Cultivo de la campaña en curso o planificada">
                  <Sprout className="h-4 w-4 text-stone-400" aria-hidden />
                  {vigente?.cultivo ?? "Sin campaña"}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <BadgeEstadoParcela activa={parcela.activa} conCampanaVigente={!!vigente} />
                {vigente && <BadgeEstadoCampana estado={vigente.estado} />}
                {parcela.disponibleParaPreventa && (
                  <Badge
                    tono="verde"
                    icono={Tag}
                    ayuda="Visible para compradores en la página pública de preventa"
                  >
                    En preventa
                  </Badge>
                )}
              </div>
              {!parcela.poligono && (
                <p className="flex items-center gap-1.5 text-xs text-stone-500">
                  <Info className="h-3.5 w-3.5" aria-hidden />
                  Sin polígono dibujado: no aparece en el mapa
                </p>
              )}
            </button>
            <Link
              href={`/panel/parcelas/${parcela.id}`}
              className="flex items-center justify-end gap-1 border-t border-stone-100 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
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
