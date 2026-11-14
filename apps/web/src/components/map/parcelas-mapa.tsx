"use client";

import { Fragment, useEffect, useState } from "react";
import { Polygon, Tooltip, useMap } from "react-leaflet";
import { latLngBounds } from "leaflet";
import { ETIQUETA_ESTADO, type EstadoIndicador } from "@/lib/estado";
import type { Parcela, PoligonoGeoJson } from "@/lib/types";
import { BaseMap } from "./base-map";
import { ESTILO_POLIGONO } from "./estilo-estado-mapa";
import { poligonoALatLngs } from "./poligono-utils";

/** Pide centrar el mapa en un poligono (objeto nuevo en cada pedido, aunque sea la misma parcela). */
export interface EnfoqueMapa {
  poligono: PoligonoGeoJson;
}

type Nivel = "normal" | "resaltada" | "seleccionada";

/** Grosor del trazo, relleno y contorno blanco (para que se vea sobre la imagen satelital). */
const TRAZO: Record<Nivel, { weight: number; fillOpacity: number; halo: number }> = {
  normal: { weight: 2, fillOpacity: 0.3, halo: 5 },
  resaltada: { weight: 4, fillOpacity: 0.45, halo: 8 },
  seleccionada: { weight: 5, fillOpacity: 0.55, halo: 9 },
};

function EnfocarParcela({ enfoque }: { enfoque: EnfoqueMapa | null }) {
  const map = useMap();
  useEffect(() => {
    if (!enfoque) return;
    map.flyToBounds(poligonoALatLngs(enfoque.poligono), {
      padding: [40, 40],
      maxZoom: 17,
      duration: 0.6,
    });
  }, [map, enfoque]);
  return null;
}

/** Al abrir, encuadra todas las parcelas con poligono (solo una vez). */
function EncuadrarTodas({ poligonos }: { poligonos: PoligonoGeoJson[] }) {
  const map = useMap();
  useEffect(() => {
    if (poligonos.length === 0) return;
    const limites = latLngBounds(poligonos.flatMap(poligonoALatLngs));
    map.fitBounds(limites, { padding: [40, 40], maxZoom: 17 });
    // Solo al montar: no debe volver a encuadrar cuando se recargan los datos.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);
  return null;
}

/** Leaflet no detecta cambios de tamano del contenedor (ej. al girar el celular). */
function AjustarTamano() {
  const map = useMap();
  useEffect(() => {
    const observador = new ResizeObserver(() => map.invalidateSize());
    observador.observe(map.getContainer());
    return () => observador.disconnect();
  }, [map]);
  return null;
}

export function ParcelasMapa({
  parcelas,
  estadoPorParcela,
  seleccionadaId,
  resaltadaId,
  enfoque,
  onSeleccionar,
  onResaltar,
}: {
  parcelas: Parcela[];
  /** Estado de cada parcela. Si falta, se dibuja como "Sin datos": nunca como "Bien". */
  estadoPorParcela: Record<string, EstadoIndicador>;
  seleccionadaId: string | null;
  resaltadaId: string | null;
  enfoque: EnfoqueMapa | null;
  onSeleccionar: (id: string) => void;
  /** Cursor sobre un poligono (id) o fuera de el (null). */
  onResaltar: (id: string | null) => void;
}) {
  const conPoligono = parcelas.filter((p) => p.activa && p.poligono);
  // El cuadro con el nombre al pasar el cursor solo tiene sentido con mouse.
  const [conCursor] = useState(() => window.matchMedia("(hover: hover)").matches);

  return (
    <BaseMap height="100%">
      <AjustarTamano />
      <EncuadrarTodas poligonos={conPoligono.map((p) => p.poligono!)} />
      <EnfocarParcela enfoque={enfoque} />
      {conPoligono.map((parcela) => {
        const estado = estadoPorParcela[parcela.id] ?? "SIN_DATOS";
        const nivel: Nivel =
          parcela.id === seleccionadaId
            ? "seleccionada"
            : parcela.id === resaltadaId
              ? "resaltada"
              : "normal";
        const { color, fillColor, dashArray } = ESTILO_POLIGONO[estado];
        const trazo = TRAZO[nivel];
        const posiciones = poligonoALatLngs(parcela.poligono!);
        return (
          <Fragment key={parcela.id}>
            <Polygon
              positions={posiciones}
              interactive={false}
              pathOptions={{ color: "#ffffff", weight: trazo.halo, opacity: 0.9, fill: false }}
            />
            <Polygon
              positions={posiciones}
              pathOptions={{
                color,
                fillColor,
                dashArray,
                weight: trazo.weight,
                fillOpacity: trazo.fillOpacity,
              }}
              eventHandlers={{
                click: () => onSeleccionar(parcela.id),
                mouseover: () => onResaltar(parcela.id),
                mouseout: () => onResaltar(null),
              }}
            >
              {conCursor && (
                <Tooltip sticky>
                  {parcela.nombre} · {ETIQUETA_ESTADO[estado]}
                </Tooltip>
              )}
            </Polygon>
          </Fragment>
        );
      })}
    </BaseMap>
  );
}
