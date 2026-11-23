"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { MapContainer, Polygon, TileLayer, Tooltip, useMap } from "react-leaflet";
import type { LatLngTuple } from "leaflet";
import {
  FINCA_LAT,
  FINCA_LNG,
  TILE_ATTRIBUTION_SATELITAL,
  TILE_URL_SATELITAL,
} from "@/lib/map-config";
import type { PoligonoGeoJson } from "@/lib/types";
import { poligonoALatLngs } from "../map/poligono-utils";

export interface ParcelaMapaItem {
  id: string;
  nombre: string;
  cultivo: string | null;
  hectareas: number;
  poligono: PoligonoGeoJson;
}

/** Encuadra todas las parcelas; sin poligonos, muestra la finca. */
function Encuadrar({ parcelas }: { parcelas: ParcelaMapaItem[] }) {
  const map = useMap();
  const puntos = useMemo<LatLngTuple[]>(
    () => parcelas.flatMap((p) => poligonoALatLngs(p.poligono)),
    [parcelas],
  );

  useEffect(() => {
    // El mapa se carga despues del resto: sin esto encuadra con un tamano viejo y corta las parcelas.
    map.invalidateSize();
    if (puntos.length >= 3) {
      map.fitBounds(puntos, { padding: [28, 28], maxZoom: 15 });
    } else {
      map.setView([FINCA_LAT, FINCA_LNG], 13);
    }
  }, [map, puntos]);
  return null;
}

/**
 * Mapa satelital de las parcelas en preventa (portada). Es una vista fija: no se arrastra
 * ni hace zoom, asi no atrapa el scroll en el celular. Tocar una parcela abre su detalle.
 */
export function MapaPreventa({ parcelas }: { parcelas: ParcelaMapaItem[] }) {
  const router = useRouter();

  return (
    // Creditos del mapa mas chicos: en el celular tapaban un tercio del mapa.
    <div className="relative isolate h-full w-full [&_.leaflet-control-attribution]:text-[10px] [&_.leaflet-control-attribution]:leading-tight">
      <MapContainer
        center={[FINCA_LAT, FINCA_LNG]}
        zoom={13}
        zoomControl={false}
        dragging={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        touchZoom={false}
        keyboard={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer url={TILE_URL_SATELITAL} attribution={TILE_ATTRIBUTION_SATELITAL} maxZoom={19} />

        {parcelas.map((parcela) => (
          <Polygon
            key={parcela.id}
            positions={poligonoALatLngs(parcela.poligono)}
            // Leaflet necesita el color en hex: es marca-vivo.
            pathOptions={{ color: "#ffffff", weight: 2, fillColor: "#00a859", fillOpacity: 0.45 }}
            eventHandlers={{ click: () => router.push(`/parcelas/${parcela.id}`) }}
          >
            <Tooltip sticky direction="top" opacity={0.96}>
              <span className="text-xs font-semibold text-tinta">{parcela.nombre}</span>
              <span className="block text-xs text-tinta-suave">
                {[parcela.cultivo, `${parcela.hectareas} ha`].filter(Boolean).join(" · ")}
              </span>
            </Tooltip>
          </Polygon>
        ))}

        <Encuadrar parcelas={parcelas} />
      </MapContainer>
    </div>
  );
}
