"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { Crosshair, Eye, Info, Pencil, Power, RotateCcw, Tag as IconoTag } from "lucide-react";
import { BadgeEstadoParcela } from "@/components/badge";
import { EstadoBadge } from "@/components/estado/estado-badge";
import { ESTILO_POLIGONO } from "@/components/map/estilo-estado-mapa";
import { ActionMenu, type AccionMenu } from "@/components/ui/action-menu";
import { CropChip } from "@/components/ui/crop-chip";
import { ListRow } from "@/components/ui/list-row";
import { ParcelThumb } from "@/components/ui/parcel-thumb";
import { SectionGroup } from "@/components/ui/section-group";
import { Tag } from "@/components/ui/tag";
import type { EstadoIndicador } from "@/lib/estado";
import type { CampanaVigente } from "@/lib/parcelas";
import type { Parcela } from "@/lib/types";

/** Lo urgente primero. "Sin datos" va antes que "Bien": falta algo por revisar. */
const ORDEN_GRUPOS: readonly EstadoIndicador[] = ["CRITICO", "ATENCION", "SIN_DATOS", "BIEN"];

export interface AccionesParcela {
  editar: (parcela: Parcela) => void;
  cambiarPreventa: (parcela: Parcela) => void;
  cambiarActiva: (parcela: Parcela) => void;
}

/**
 * Lista de parcelas agrupada por estado, junto al mapa.
 * Clic en el nombre o en "centrar" = seleccionar y centrar en el mapa.
 * Cursor o foco sobre una fila resalta su poligono (y al reves).
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
  acciones,
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
  /** null = este rol no puede editar (solo ve "Ver detalle"). */
  acciones: AccionesParcela | null;
}) {
  const router = useRouter();
  const contenedorRef = useRef<HTMLDivElement>(null);

  // Si se eligio desde el mapa, la fila se hace visible dentro de la lista (sin mover la pagina).
  useEffect(() => {
    const contenedor = contenedorRef.current;
    if (!contenedor || !seleccionadaId) return;
    const fila = contenedor.querySelector<HTMLElement>(`[data-parcela-id="${seleccionadaId}"]`);
    // El contenedor es "relative": offsetTop de la fila ya es relativo a el.
    if (fila) contenedor.scrollTo({ top: fila.offsetTop - 8, behavior: "smooth" });
  }, [seleccionadaId]);

  const activas = parcelas.filter((p) => p.activa);
  const inactivas = parcelas.filter((p) => !p.activa);
  // Una parcela activa sin estado calculado nunca cae en "Bien".
  const estadoDe = (p: Parcela): EstadoIndicador => estadoPorParcela[p.id] ?? "SIN_DATOS";

  function fila(parcela: Parcela) {
    const estado = estadoDe(parcela);
    const menu: AccionMenu[] = [
      { etiqueta: "Ver detalle", icono: Eye, onClick: () => router.push(`/panel/parcelas/${parcela.id}`) },
    ];
    if (acciones) {
      menu.push(
        { etiqueta: "Editar datos y polígono", icono: Pencil, onClick: () => acciones.editar(parcela) },
        {
          etiqueta: parcela.disponibleParaPreventa ? "Quitar de la preventa" : "Publicar en la preventa",
          icono: IconoTag,
          onClick: () => acciones.cambiarPreventa(parcela),
        },
        parcela.activa
          ? { etiqueta: "Desactivar", icono: Power, onClick: () => acciones.cambiarActiva(parcela), peligro: true }
          : { etiqueta: "Volver a activar", icono: RotateCcw, onClick: () => acciones.cambiarActiva(parcela) },
      );
    }
    const enMapa = parcela.activa && parcela.poligono;
    return (
      <div key={parcela.id} data-parcela-id={parcela.id} className={parcela.activa ? "" : "opacity-70"}>
        <ListRow
          resaltada={parcela.id === seleccionadaId || parcela.id === resaltadaId}
          onMouseEnter={() => onResaltar(parcela.id)}
          onMouseLeave={() => onResaltar(null)}
          onFocus={() => onResaltar(parcela.id)}
          onBlur={() => onResaltar(null)}
          miniatura={
            <ParcelThumb
              poligono={parcela.poligono}
              // Sobre la miniatura oscura se usa el color claro del estado (el de relleno del mapa).
              color={parcela.activa ? ESTILO_POLIGONO[estado].fillColor : "var(--color-tinta-suave)"}
            />
          }
          titulo={
            <button
              type="button"
              onClick={() => onSeleccionar(parcela)}
              aria-pressed={parcela.id === seleccionadaId}
              className="text-left hover:text-marca hover:underline"
            >
              {parcela.nombre}
            </button>
          }
          detalle={`${parcela.hectareas} ha`}
          chips={
            <>
              <CropChip cultivo={campanaVigentePorParcela[parcela.id]?.cultivo ?? null} />
              {parcela.disponibleParaPreventa && (
                <Tag tono="marca" icono={IconoTag}>
                  En preventa
                </Tag>
              )}
              {!parcela.poligono && (
                <span className="inline-flex items-center gap-1 text-sm text-tinta-suave">
                  <Info className="h-4 w-4" aria-hidden />
                  Sin polígono: no aparece en el mapa
                </span>
              )}
            </>
          }
          acciones={
            <>
              {enMapa && (
                <button
                  type="button"
                  onClick={() => onSeleccionar(parcela)}
                  aria-label={`Centrar ${parcela.nombre} en el mapa`}
                  title="Centrar en el mapa"
                  className="grid size-11 place-items-center rounded-control text-tinta-suave hover:bg-fondo hover:text-marca"
                >
                  <Crosshair className="h-5 w-5" aria-hidden />
                </button>
              )}
              <ActionMenu acciones={menu} etiqueta={`Acciones de ${parcela.nombre}`} />
            </>
          }
        />
      </div>
    );
  }

  return (
    <div
      ref={contenedorRef}
      aria-label="Lista de parcelas"
      className="relative px-3 py-1 lg:max-h-[calc(100dvh-14rem)] lg:min-h-[420px] lg:overflow-y-auto"
    >
      {!estadoListo ? (
        <SectionGroup titulo="Revisando el estado de las parcelas..." cantidad={activas.length}>
          {activas.map(fila)}
        </SectionGroup>
      ) : (
        ORDEN_GRUPOS.map((estado) => {
          const delGrupo = activas.filter((p) => estadoDe(p) === estado);
          if (delGrupo.length === 0) return null;
          return (
            <SectionGroup key={estado} titulo={<EstadoBadge estado={estado} tamano="sm" />} cantidad={delGrupo.length}>
              {delGrupo.map(fila)}
            </SectionGroup>
          );
        })
      )}
      {inactivas.length > 0 && (
        <SectionGroup
          titulo={<BadgeEstadoParcela activa={false} conCampanaVigente={false} />}
          cantidad={inactivas.length}
          abierto={false}
        >
          {inactivas.map(fila)}
        </SectionGroup>
      )}
    </div>
  );
}
