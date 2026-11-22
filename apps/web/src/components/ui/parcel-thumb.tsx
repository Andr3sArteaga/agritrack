import type { PoligonoGeoJson } from "@/lib/types";

/**
 * Miniatura del contorno de una parcela, dibujada con su GeoJSON (sin libreria de mapas).
 * Sin poligono: un cuadro punteado de "Sin datos".
 */
export function ParcelThumb({
  poligono,
  tamano = 56,
  color = "var(--color-marca-vivo)",
}: {
  poligono: PoligonoGeoJson | null;
  tamano?: number;
  /** Color del contorno (ej. el del estado de la parcela). */
  color?: string;
}) {
  const anillo = poligono?.coordinates[0] ?? [];
  if (anillo.length < 3) {
    return (
      <span
        className="grid shrink-0 place-items-center rounded-control border-2 border-dashed border-sindatos-borde bg-sindatos-fondo text-[10px] font-semibold text-sindatos-texto"
        style={{ width: tamano, height: tamano }}
        aria-label="Sin polígono"
      >
        Sin mapa
      </span>
    );
  }
  const xs = anillo.map(([lng]) => lng);
  const ys = anillo.map(([, lat]) => lat);
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  // Misma escala en los dos ejes (no deforma), centrado en un cuadro de 80 dentro de 100.
  const lado = Math.max(maxX - minX, maxY - minY) || 1;
  const escala = 80 / lado;
  const ancho = (maxX - minX) * escala;
  const alto = (maxY - minY) * escala;
  const [x0, y0] = [10 + (80 - ancho) / 2, 10 + (80 - alto) / 2];
  // La latitud crece hacia arriba y el SVG hacia abajo: se invierte el eje Y.
  const puntos = anillo
    .map(([lng, lat]) => `${x0 + (lng - minX) * escala},${y0 + alto - (lat - minY) * escala}`)
    .join(" ");
  return (
    <svg
      viewBox="0 0 100 100"
      width={tamano}
      height={tamano}
      className="shrink-0 rounded-control bg-tinta"
      aria-hidden
    >
      <polygon points={puntos} fill={color} fillOpacity={0.25} stroke={color} strokeWidth={4} strokeLinejoin="round" />
    </svg>
  );
}
