import { ESTADOS_EN_PANTALLA, ETIQUETA_ESTADO } from "@/lib/estado";
import { ESTILO_POLIGONO } from "./estilo-estado-mapa";

/** Leyenda pequeña del mapa: cada estado con la muestra de como se dibuja su poligono. */
export function LeyendaMapa() {
  return (
    <div
      role="group"
      aria-label="Leyenda del mapa: estado de las parcelas"
      className="absolute bottom-16 left-3 z-10 rounded-md border border-stone-300 bg-white/95 px-3 py-2 shadow"
    >
      <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-stone-800 sm:grid-cols-1">
        {ESTADOS_EN_PANTALLA.map((estado) => {
          const { color, fillColor, dashArray } = ESTILO_POLIGONO[estado];
          return (
            <li key={estado} className="flex items-center gap-2">
              <svg width="22" height="14" viewBox="0 0 22 14" aria-hidden className="shrink-0">
                <rect
                  x="1.5"
                  y="1.5"
                  width="19"
                  height="11"
                  rx="2"
                  fill={fillColor}
                  fillOpacity={0.35}
                  stroke={color}
                  strokeWidth="2"
                  strokeDasharray={dashArray}
                />
              </svg>
              {ETIQUETA_ESTADO[estado]}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
