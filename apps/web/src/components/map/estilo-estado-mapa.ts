import type { EstadoIndicador } from "@/lib/estado";

/**
 * Como se dibuja cada estado en el mapa. Leaflet no lee los tokens de Tailwind,
 * asi que los colores van en hex: deben coincidir con `--color-*-borde` de globals.css.
 * "Sin datos" va en gris con borde punteado (se distingue tambien sin color).
 */
export interface EstiloPoligono {
  color: string;
  fillColor: string;
  dashArray: string | undefined;
}

export const ESTILO_POLIGONO: Record<EstadoIndicador, EstiloPoligono> = {
  BIEN: { color: "#047857", fillColor: "#059669", dashArray: undefined },
  ATENCION: { color: "#b45309", fillColor: "#d97706", dashArray: undefined },
  CRITICO: { color: "#b91c1c", fillColor: "#dc2626", dashArray: undefined },
  SIN_DATOS: { color: "#475569", fillColor: "#94a3b8", dashArray: "8 6" },
};
