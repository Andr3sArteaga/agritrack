"use client";

import dynamic from "next/dynamic";
import type { PoligonoGeoJson } from "@/lib/types";

const ParcelaMiniMapa = dynamic(
  () => import("@/components/map/parcela-mini-mapa").then((m) => m.ParcelaMiniMapa),
  { ssr: false, loading: () => <p className="text-sm text-stone-500">Cargando mapa...</p> },
);

export function MiniMapaCliente({ poligono }: { poligono: PoligonoGeoJson }) {
  return <ParcelaMiniMapa poligono={poligono} />;
}
