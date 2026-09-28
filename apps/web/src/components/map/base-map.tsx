"use client";

import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer } from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import {
  FINCA_LAT,
  FINCA_LNG,
  FINCA_ZOOM,
  TILE_ATTRIBUTION_ETIQUETAS,
  TILE_ATTRIBUTION_SATELITAL,
  TILE_URL_ETIQUETAS,
  TILE_URL_SATELITAL,
} from "@/lib/map-config";

export function BaseMap({
  center,
  zoom = FINCA_ZOOM,
  height = 320,
  mostrarEtiquetas = true,
  children,
}: {
  center?: LatLngExpression;
  zoom?: number;
  height?: number;
  mostrarEtiquetas?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <MapContainer
      center={center ?? [FINCA_LAT, FINCA_LNG]}
      zoom={zoom}
      style={{ height, width: "100%" }}
      className="rounded-lg"
    >
      <TileLayer
        url={TILE_URL_SATELITAL}
        attribution={TILE_ATTRIBUTION_SATELITAL}
        maxZoom={19}
      />
      {mostrarEtiquetas && (
        <TileLayer
          url={TILE_URL_ETIQUETAS}
          attribution={TILE_ATTRIBUTION_ETIQUETAS}
          maxZoom={19}
        />
      )}
      {children}
    </MapContainer>
  );
}
