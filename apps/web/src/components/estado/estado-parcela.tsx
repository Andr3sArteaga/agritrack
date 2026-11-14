import { BadgeEstadoParcela } from "@/components/badge";
import type { EstadoIndicador } from "@/lib/estado";
import { EstadoBadge } from "./estado-badge";

/**
 * Estado de una parcela en listas y tablas.
 * - Inactiva: no se evalua, se dice "Inactiva".
 * - Aun calculando: texto neutro (no se adelanta ningun estado).
 * - Sin resultado para una parcela activa: "Sin datos", nunca "Bien".
 */
export function EstadoDeParcela({
  activa,
  estado,
  listo,
  tamano = "md",
}: {
  activa: boolean;
  estado: EstadoIndicador | undefined;
  /** false mientras se calculan los estados. */
  listo: boolean;
  tamano?: "sm" | "md" | "lg";
}) {
  if (!activa) return <BadgeEstadoParcela activa={false} conCampanaVigente={false} />;
  if (!listo) return <span className="text-sm text-stone-600">Revisando estado...</span>;
  return <EstadoBadge estado={estado ?? "SIN_DATOS"} tamano={tamano} />;
}
