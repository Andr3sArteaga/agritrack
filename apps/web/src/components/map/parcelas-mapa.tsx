"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Polygon, Popup, useMap } from "react-leaflet";
import { latLngBounds, type Layer } from "leaflet";
import type { CampanaVigente } from "@/lib/parcelas";
import type { Parcela, PoligonoGeoJson } from "@/lib/types";
import { BaseMap } from "./base-map";
import { poligonoALatLngs } from "./poligono-utils";

const COLOR_PREVENTA = "#059669";
const COLOR_SIN_PREVENTA = "#a8a29e";
const COLOR_SELECCIONADA = "#fbbf24";

/** Pide centrar el mapa en un poligono (objeto nuevo en cada pedido, aunque sea la misma parcela). */
export interface EnfoqueMapa {
  poligono: PoligonoGeoJson;
}

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

/** Leaflet no detecta cambios de tamano del contenedor (ej. al cambiar de vista). */
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
  campanaVigentePorParcela,
  seleccionadaId,
  enfoque,
  onSeleccionar,
}: {
  parcelas: Parcela[];
  campanaVigentePorParcela: Record<string, CampanaVigente>;
  seleccionadaId: string | null;
  enfoque: EnfoqueMapa | null;
  onSeleccionar: (id: string) => void;
}) {
  const conPoligono = parcelas.filter((p) => p.activa && p.poligono);

  return (
    <BaseMap height="100%">
      <AjustarTamano />
      <EncuadrarTodas poligonos={conPoligono.map((p) => p.poligono!)} />
      <EnfocarParcela enfoque={enfoque} />
      {conPoligono.map((parcela) => {
        const esSeleccionada = parcela.id === seleccionadaId;
        const color = esSeleccionada
          ? COLOR_SELECCIONADA
          : parcela.disponibleParaPreventa
            ? COLOR_PREVENTA
            : COLOR_SIN_PREVENTA;
        return (
          <Polygon
            key={parcela.id}
            positions={poligonoALatLngs(parcela.poligono!)}
            pathOptions={{
              color,
              weight: esSeleccionada ? 4 : 2,
              fillOpacity: esSeleccionada ? 0.5 : 0.3,
            }}
            eventHandlers={{
              click: () => onSeleccionar(parcela.id),
              mouseover: (e: { target: Layer & { openPopup: () => void } }) =>
                e.target.openPopup(),
            }}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-semibold text-stone-900">{parcela.nombre}</p>
                <p className="text-stone-600">
                  {campanaVigentePorParcela[parcela.id]?.cultivo ?? "Sin campaña activa"}
                  {" · "}
                  {parcela.hectareas} ha
                </p>
                <Link
                  href={`/panel/parcelas/${parcela.id}`}
                  className="mt-1 inline-block font-medium text-emerald-700 hover:underline"
                >
                  Ver detalle →
                </Link>
              </div>
            </Popup>
          </Polygon>
        );
      })}
    </BaseMap>
  );
}
