"use client";

import { Polygon, useMap } from "react-leaflet";
import { useEffect } from "react";
import type { PoligonoGeoJson } from "@/lib/types";
import { BaseMap } from "./base-map";
import { poligonoALatLngs } from "./poligono-utils";

/** Alto del mapa: grande en pantallas altas, nunca menor que 380 px ni mayor que 680 px. */
const ALTO_MAPA = "clamp(380px, 65vh, 680px)";

function AjustarVista({ poligono }: { poligono: PoligonoGeoJson }) {
  const map = useMap();
  useEffect(() => {
    const latlngs = poligonoALatLngs(poligono);
    // maxZoom 17: en parcelas chicas deja ver el camino y los alrededores en lugar de acercarse al maximo.
    map.fitBounds(latlngs, { padding: [48, 48], maxZoom: 17 });
  }, [map, poligono]);
  return null;
}

export function ParcelaMiniMapa({ poligono }: { poligono: PoligonoGeoJson }) {
  const latlngs = poligonoALatLngs(poligono);

  return (
    <BaseMap height={ALTO_MAPA} mostrarEtiquetas={false}>
      <Polygon
        positions={latlngs}
        pathOptions={{ color: "#fbbf24", weight: 3, fillColor: "#fbbf24", fillOpacity: 0.25 }}
      />
      <AjustarVista poligono={poligono} />
    </BaseMap>
  );
}
