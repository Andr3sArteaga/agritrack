"use client";

import Link from "next/link";
import { Polygon, Popup } from "react-leaflet";
import type { Layer } from "leaflet";
import type { Parcela } from "@/lib/types";
import { BaseMap } from "./base-map";
import { poligonoALatLngs } from "./poligono-utils";

const COLOR_PREVENTA = "#059669";
const COLOR_SIN_PREVENTA = "#a8a29e";

export function ParcelasMapa({
  parcelas,
  cultivoActualPorParcela,
}: {
  parcelas: Parcela[];
  cultivoActualPorParcela: Record<string, string | null>;
}) {
  const conPoligono = parcelas.filter((p) => p.activa && p.poligono);

  return (
    <BaseMap height={360}>
      {conPoligono.map((parcela) => {
        const color = parcela.disponibleParaPreventa
          ? COLOR_PREVENTA
          : COLOR_SIN_PREVENTA;
        return (
          <Polygon
            key={parcela.id}
            positions={poligonoALatLngs(parcela.poligono!)}
            pathOptions={{ color, weight: 2, fillOpacity: 0.3 }}
            eventHandlers={{
              mouseover: (e: { target: Layer & { openPopup: () => void } }) =>
                e.target.openPopup(),
            }}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-semibold text-stone-900">{parcela.nombre}</p>
                <p className="text-stone-600">
                  {cultivoActualPorParcela[parcela.id] ?? "Sin campaña activa"}
                  {" · "}
                  {parcela.hectareas} ha
                </p>
                <Link
                  href={`/panel/parcelas/${parcela.id}`}
                  className="mt-1 inline-block font-medium text-emerald-700 hover:underline"
                >
                  Ver detalle →
                </Link>
              </div>
            </Popup>
          </Polygon>
        );
      })}
    </BaseMap>
  );
}
