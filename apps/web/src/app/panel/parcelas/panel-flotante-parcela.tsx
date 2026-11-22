"use client";

import { MapPin, Ruler, Tag as IconoTag, X } from "lucide-react";
import { useEffect } from "react";
import { LinkButton } from "@/components/ui/button";
import { CropChip } from "@/components/ui/crop-chip";
import { Tag } from "@/components/ui/tag";
import { EstadoBadge } from "@/components/estado/estado-badge";
import type { ResumenParcela } from "@/lib/resumen-parcela";
import type { Parcela } from "@/lib/types";

/**
 * Panel sobre el mapa con lo esencial de la parcela elegida.
 * Escritorio: tarjeta flotante arriba a la izquierda. Celular: hoja inferior.
 * No es modal: el mapa sigue usable. Se cierra con la X o con Esc.
 */
export function PanelFlotanteParcela({
  parcela,
  cultivo,
  resumen,
  estadoListo,
  onCerrar,
}: {
  parcela: Parcela;
  cultivo: string | null;
  /** null = todavia no se calculo, o no se pudo calcular. */
  resumen: ResumenParcela | null;
  estadoListo: boolean;
  onCerrar: () => void;
}) {
  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrar();
    };
    document.addEventListener("keydown", alTeclear);
    return () => document.removeEventListener("keydown", alTeclear);
  }, [onCerrar]);

  return (
    <section
      aria-label={`Resumen de ${parcela.nombre}`}
      className="absolute inset-x-0 bottom-0 z-20 max-h-[80%] overflow-y-auto rounded-t-tarjeta border border-borde bg-superficie p-4 shadow-flotante sm:p-5 sm:inset-x-auto sm:bottom-auto sm:left-14 sm:top-3 sm:w-80 sm:rounded-tarjeta"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-lg font-semibold text-tinta">{parcela.nombre}</h3>
        <button
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar"
          title="Cerrar"
          className="-mr-2 -mt-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-tinta-suave hover:bg-fondo"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
      </div>

      <div className="mt-1">
        {resumen ? (
          <EstadoBadge estado={resumen.estado} />
        ) : estadoListo ? (
          <EstadoBadge estado="SIN_DATOS" />
        ) : (
          <span className="text-sm text-tinta-suave">Revisando estado...</span>
        )}
      </div>

      {/* En celular cultivo y superficie van en una linea y se omite la ubicación: la hoja tapa menos mapa. */}
      <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-base text-tinta sm:block sm:space-y-1">
        <div className="flex items-center gap-2">
          <dt className="sr-only">Cultivo</dt>
          <dd>
            <CropChip cultivo={cultivo} />
          </dd>
        </div>
        <div className="flex items-center gap-2">
          <dt className="sr-only">Superficie</dt>
          <Ruler className="h-4 w-4 shrink-0 text-tinta-suave" aria-hidden />
          <dd>{parcela.hectareas} ha</dd>
        </div>
        <div className="hidden items-start gap-2 sm:flex">
          <dt className="sr-only">Ubicación</dt>
          <MapPin className="mt-1 h-4 w-4 shrink-0 text-tinta-suave" aria-hidden />
          <dd>{parcela.ubicacionTexto}</dd>
        </div>
      </dl>

      {(resumen || parcela.disponibleParaPreventa) && (
        <ul aria-label="Indicadores" className="mt-3 flex flex-wrap gap-1.5">
          {resumen?.areas.map((area) => (
            <li key={area.id}>
              <EstadoBadge estado={area.estado} tamano="sm" rotulo={area.nombre} />
            </li>
          ))}
          {parcela.disponibleParaPreventa && (
            <li>
              <Tag tono="marca" icono={IconoTag}>
                En preventa
              </Tag>
            </li>
          )}
        </ul>
      )}

      <div className="mt-4">
        <LinkButton href={`/panel/parcelas/${parcela.id}`} completo>
          Ver parcela
        </LinkButton>
      </div>
    </section>
  );
}
