import * as turf from "@turf/turf";
import type { LatLngExpression, LatLngTuple } from "leaflet";
import type { PoligonoGeoJson } from "@/lib/types";

/** GeoJSON usa [lng, lat]; Leaflet usa [lat, lng]. */
export function poligonoALatLngs(poligono: PoligonoGeoJson): LatLngTuple[] {
  return poligono.coordinates[0].map(
    ([lng, lat]) => [lat, lng] as LatLngTuple,
  );
}

export function latLngsAPoligono(
  latlngs: LatLngExpression[],
): PoligonoGeoJson {
  const anillo = latlngs.map((ll) => {
    const punto = ll as { lat: number; lng: number } | LatLngTuple;
    if (Array.isArray(punto)) {
      return [punto[1], punto[0]] as [number, number];
    }
    return [punto.lng, punto.lat] as [number, number];
  });

  const primero = anillo[0];
  const ultimo = anillo[anillo.length - 1];
  if (primero[0] !== ultimo[0] || primero[1] !== ultimo[1]) {
    anillo.push(primero);
  }

  return { type: "Polygon", coordinates: [anillo] };
}

export function calcularHectareas(poligono: PoligonoGeoJson): number {
  try {
    const feature = turf.polygon(poligono.coordinates);
    const areaM2 = turf.area(feature);
    return Math.round((areaM2 / 10000) * 100) / 100;
  } catch {
    return 0;
  }
}
