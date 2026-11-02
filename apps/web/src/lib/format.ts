export function formatearFecha(fecha: string | null): string {
  if (!fecha) return "—";
  return new Date(fecha).toLocaleDateString("es-BO", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** Fecha y hora en hora de Bolivia (la fecha de generacion de un reporte). */
export function formatearFechaHora(fecha: string): string {
  return new Date(fecha).toLocaleString("es-BO", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/La_Paz",
  });
}

/** "2026-06-01T00:00:00.000Z" -> "2026-06-01" (valor de un <input type="date">). */
export function aFechaInput(fecha: string): string {
  return fecha.slice(0, 10);
}

export function formatearBs(monto: number | null): string {
  if (monto === null) return "—";
  return `Bs ${monto.toLocaleString("es-BO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
