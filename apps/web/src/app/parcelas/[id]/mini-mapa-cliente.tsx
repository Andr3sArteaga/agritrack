"use client";

import dynamic from "next/dynamic";
import type { PoligonoGeoJson } from "@/lib/types";

const ParcelaMiniMapa = dynamic(
  () => import("@/components/map/parcela-mini-mapa").then((m) => m.ParcelaMiniMapa),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-[380px] place-items-center text-stone-600">Cargando mapa...</div>
    ),
  },
);

export function MiniMapaCliente({ poligono }: { poligono: PoligonoGeoJson }) {
  return <ParcelaMiniMapa poligono={poligono} />;
}
