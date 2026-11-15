"use client";

import type { KeyboardEvent } from "react";
import type { ResumenParcela } from "@/lib/resumen-parcela";
import { EstadoBadge } from "./estado-badge";

/** Parcelas como tarjetas horizontales (pestañas). Se mueve con el dedo o con las flechas. */
export function SelectorParcelas({
  resumenes,
  seleccionadaId,
  onSeleccionar,
}: {
  resumenes: ResumenParcela[];
  seleccionadaId: string;
  onSeleccionar: (parcelaId: string) => void;
}) {
  function alPresionar(evento: KeyboardEvent<HTMLDivElement>) {
    const indice = resumenes.findIndex((r) => r.parcelaId === seleccionadaId);
    const mover = evento.key === "ArrowRight" ? 1 : evento.key === "ArrowLeft" ? -1 : 0;
    if (mover === 0 || indice === -1) return;
    evento.preventDefault();
    const siguiente = resumenes[(indice + mover + resumenes.length) % resumenes.length];
    onSeleccionar(siguiente.parcelaId);
    document.getElementById(`pestana-${siguiente.parcelaId}`)?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label="Parcelas"
      onKeyDown={alPresionar}
      className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-0.5 pb-3 pt-1"
    >
      {resumenes.map((resumen) => {
        const seleccionada = resumen.parcelaId === seleccionadaId;
        return (
          <button
            key={resumen.parcelaId}
            id={`pestana-${resumen.parcelaId}`}
            role="tab"
            type="button"
            aria-selected={seleccionada}
            aria-controls="panel-parcela"
            tabIndex={seleccionada ? 0 : -1}
            onClick={() => onSeleccionar(resumen.parcelaId)}
            className={`min-w-[190px] shrink-0 snap-start rounded-lg border-2 bg-white px-3 py-2.5 text-left ${
              seleccionada
                ? "border-emerald-700 ring-2 ring-inset ring-emerald-700"
                : "border-stone-300 hover:border-stone-400"
            }`}
          >
            <span className="block font-bold text-stone-900">{resumen.nombre}</span>
            <span className="mt-1 block text-sm text-stone-600">
              {resumen.hectareas} ha · {resumen.cultivoActual ?? "Sin campaña"}
            </span>
            <span className="mt-1.5 block">
              <EstadoBadge estado={resumen.estado} tamano="sm" />
            </span>
          </button>
        );
      })}
    </div>
  );
}
