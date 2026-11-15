"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useMemo } from "react";
import { MapContainer, Polygon, TileLayer, Tooltip, useMap } from "react-leaflet";
import type { LatLngTuple } from "leaflet";
import { FINCA_LAT, FINCA_LNG } from "@/lib/map-config";
import type { PoligonoGeoJson } from "@/lib/types";
import { poligonoALatLngs } from "../map/poligono-utils";

export interface ParcelaMapaItem {
  id: string;
  nombre: string;
  cultivo: string;
  hectareas: number;
  rendimientoTnHa: number | null;
  poligono: PoligonoGeoJson;
  temporada?: string | null;
  ubicacion?: string;
  esReferencia?: boolean;
}

const TILE_DARK_URL =
  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const TILE_DARK_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

function AjustarVistaPoligonos({
  parcelas,
  seleccionadaId,
}: {
  parcelas: ParcelaMapaItem[];
  seleccionadaId: string | null;
}) {
  const map = useMap();

  const puntosTodos = useMemo<LatLngTuple[]>(() => {
    return parcelas.flatMap((p) => poligonoALatLngs(p.poligono));
  }, [parcelas]);

  useEffect(() => {
    const elegida = seleccionadaId
      ? parcelas.find((p) => p.id === seleccionadaId)
      : undefined;

    if (elegida && parcelas.length === 1) {
      map.fitBounds(poligonoALatLngs(elegida.poligono), {
        padding: [40, 40],
        maxZoom: 15,
      });
      return;
    }

    if (puntosTodos.length >= 3) {
      map.fitBounds(puntosTodos, { padding: [36, 36], maxZoom: 15 });
    } else {
      map.setView([FINCA_LAT, FINCA_LNG], 13);
    }
  }, [map, parcelas, puntosTodos, seleccionadaId]);

  return null;
}

export function MapaPreventaOscura({
  parcelas,
  seleccionadaId,
  onSeleccionar,
  scrollZoom = false,
  zoomControl = false,
}: {
  parcelas: ParcelaMapaItem[];
  seleccionadaId: string | null;
  onSeleccionar?: (parcelaId: string) => void;
  scrollZoom?: boolean;
  zoomControl?: boolean;
}) {
  return (
    <div
      className="relative isolate h-full w-full bg-[#071712]"
      style={{
        backgroundImage:
          "radial-gradient(circle at 20% 20%, rgba(0, 168, 89, 0.16), transparent 55%), linear-gradient(to right, rgba(0, 168, 89, 0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 168, 89, 0.06) 1px, transparent 1px)",
        backgroundSize: "100% 100%, 32px 32px, 32px 32px",
      }}
    >
      <MapContainer
        center={[FINCA_LAT, FINCA_LNG]}
        zoom={13}
        scrollWheelZoom={scrollZoom}
        zoomControl={zoomControl}
        style={{ height: "100%", width: "100%", background: "#071712" }}
      >
        <TileLayer
          url={TILE_DARK_URL}
          attribution={TILE_DARK_ATTRIBUTION}
          maxZoom={19}
        />

        {parcelas.map((parcela) => {
          const activa = parcela.id === seleccionadaId;
          const posiciones = poligonoALatLngs(parcela.poligono);

          return (
            <Polygon
              key={parcela.id}
              positions={posiciones}
              pathOptions={{
                color: activa ? "#6ee7b7" : "#00a859",
                weight: activa ? 3.5 : 2,
                fillColor: activa ? "#34d399" : "#00a859",
                fillOpacity: activa ? 0.42 : 0.22,
              }}
              eventHandlers={{
                click: () => onSeleccionar?.(parcela.id),
                mouseover: () => onSeleccionar?.(parcela.id),
              }}
            >
              <Tooltip sticky direction="top" opacity={0.96}>
                <div className="text-xs leading-snug">
                  <p className="font-bold text-[#004b36]">{parcela.nombre}</p>
                  <p className="text-stone-700">
                    {parcela.cultivo} · {parcela.hectareas} ha
                  </p>
                  {parcela.rendimientoTnHa !== null && (
                    <p className="font-semibold text-[#007a45]">
                      Est. {parcela.rendimientoTnHa} t/ha
                    </p>
                  )}
                </div>
              </Tooltip>
            </Polygon>
          );
        })}

        <AjustarVistaPoligonos
          parcelas={parcelas}
          seleccionadaId={seleccionadaId}
        />
      </MapContainer>
    </div>
  );
}
