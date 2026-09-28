"use client";

import { Polygon, useMap } from "react-leaflet";
import { useEffect } from "react";
import type { PoligonoGeoJson } from "@/lib/types";
import { BaseMap } from "./base-map";
import { poligonoALatLngs } from "./poligono-utils";

function AjustarVista({ poligono }: { poligono: PoligonoGeoJson }) {
  const map = useMap();
  useEffect(() => {
    const latlngs = poligonoALatLngs(poligono);
    map.fitBounds(latlngs, { padding: [24, 24] });
  }, [map, poligono]);
  return null;
}

export function ParcelaMiniMapa({ poligono }: { poligono: PoligonoGeoJson }) {
  const latlngs = poligonoALatLngs(poligono);

  return (
    <BaseMap height={260} mostrarEtiquetas={false}>
      <Polygon
        positions={latlngs}
        pathOptions={{ color: "#059669", weight: 2, fillOpacity: 0.25 }}
      />
      <AjustarVista poligono={poligono} />
    </BaseMap>
  );
}
