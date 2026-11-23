"use client";

import dynamic from "next/dynamic";
import type { ParcelaMapaItem } from "./mapa-preventa";

// Leaflet usa window: el mapa se carga solo en el navegador.
const MapaPreventa = dynamic(() => import("./mapa-preventa").then((m) => m.MapaPreventa), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center bg-fondo text-sm text-tinta-suave">
      Cargando mapa...
    </div>
  ),
});

export function MapaPreventaCliente({ parcelas }: { parcelas: ParcelaMapaItem[] }) {
  return <MapaPreventa parcelas={parcelas} />;
}
