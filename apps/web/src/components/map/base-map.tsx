"use client";

import "leaflet/dist/leaflet.css";
import { Map as MapaIcono, Satellite } from "lucide-react";
import { useState } from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import {
  FINCA_LAT,
  FINCA_LNG,
  FINCA_ZOOM,
  TILE_ATTRIBUTION_CALLES,
  TILE_ATTRIBUTION_ETIQUETAS,
  TILE_ATTRIBUTION_SATELITAL,
  TILE_URL_CALLES,
  TILE_URL_ETIQUETAS,
  TILE_URL_SATELITAL,
  type TipoMapa,
} from "@/lib/map-config";

const OPCIONES_TIPO: { tipo: TipoMapa; etiqueta: string; ayuda: string; Icono: typeof Satellite }[] = [
  { tipo: "satelite", etiqueta: "Satélite", ayuda: "Imagen satelital (Esri)", Icono: Satellite },
  { tipo: "calles", etiqueta: "Calles", ayuda: "Mapa de calles (OpenStreetMap)", Icono: MapaIcono },
];

export function BaseMap({
  center,
  zoom = FINCA_ZOOM,
  height = 320,
  mostrarEtiquetas = true,
  children,
}: {
  center?: LatLngExpression;
  zoom?: number;
  /** Pixeles o cualquier alto CSS (ej. "100%" para llenar el contenedor). */
  height?: number | string;
  mostrarEtiquetas?: boolean;
  children?: React.ReactNode;
}) {
  const [tipoMapa, setTipoMapa] = useState<TipoMapa>("satelite");

  return (
    // isolate: los z-index internos de Leaflet no compiten con modales ni menu.
    <div className="relative isolate" style={{ height, width: "100%" }}>
      <MapContainer
        center={center ?? [FINCA_LAT, FINCA_LNG]}
        zoom={zoom}
        style={{ height: "100%", width: "100%" }}
        className="rounded-lg"
      >
        {tipoMapa === "satelite" ? (
          <>
            <TileLayer
              key="satelite"
              url={TILE_URL_SATELITAL}
              attribution={TILE_ATTRIBUTION_SATELITAL}
              maxZoom={19}
            />
            {mostrarEtiquetas && (
              <TileLayer
                key="etiquetas"
                url={TILE_URL_ETIQUETAS}
                attribution={TILE_ATTRIBUTION_ETIQUETAS}
                maxZoom={19}
              />
            )}
          </>
        ) : (
          <TileLayer
            key="calles"
            url={TILE_URL_CALLES}
            attribution={TILE_ATTRIBUTION_CALLES}
            maxZoom={19}
          />
        )}
        {children}
      </MapContainer>

      <div
        role="group"
        aria-label="Tipo de mapa"
        className="absolute right-3 top-3 z-[1000] flex overflow-hidden rounded-full border border-borde bg-superficie text-sm font-medium shadow-tarjeta"
      >
        {OPCIONES_TIPO.map(({ tipo, etiqueta, ayuda, Icono }) => (
          <button
            key={tipo}
            type="button"
            title={ayuda}
            aria-pressed={tipoMapa === tipo}
            onClick={() => setTipoMapa(tipo)}
            className={`inline-flex min-h-11 items-center gap-1.5 px-3.5 ${
              tipoMapa === tipo ? "bg-tinta text-white" : "text-tinta hover:bg-fondo"
            }`}
          >
            <Icono className="h-4 w-4" aria-hidden />
            {etiqueta}
          </button>
        ))}
      </div>
    </div>
  );
}
