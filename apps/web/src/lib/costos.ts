import type { Gasto } from "./types";

export interface ResumenCostos {
  gastado: number;
  comprometido: number;
  presupuesto: number | null;
  ahorro: number | null;
  costoPorHa: number | null;
  costoPorTonelada: number | null;
}

const redondear = (valor: number): number => Math.round(valor * 100) / 100;

/**
 * Resumen de costos de una campana (RF-30). "Gasto real" es solo lo PAGADO; el
 * comprometido se muestra aparte. Los gastos anulados no cuentan. El costo por
 * tonelada es null si no hay produccion real registrada.
 *
 * TODO(parte D): reemplazar por GET /costos/campanas/:id/resumen cuando exista
 * el endpoint; esta funcion duplica esa logica de forma temporal.
 */
export function calcularResumenCostos(entrada: {
  gastos: Gasto[];
  presupuesto: number | null;
  hectareas: number;
  rendimientoTnHa: number | null;
}): ResumenCostos {
  const vigentes = entrada.gastos.filter((gasto) => !gasto.anulado);
  const suma = (estado: Gasto["estado"]) =>
    redondear(
      vigentes
        .filter((gasto) => gasto.estado === estado)
        .reduce((total, gasto) => total + gasto.monto, 0),
    );
  const gastado = suma("PAGADO");
  const produccionTn =
    entrada.rendimientoTnHa !== null && entrada.rendimientoTnHa > 0
      ? entrada.rendimientoTnHa * entrada.hectareas
      : null;

  return {
    gastado,
    comprometido: suma("COMPROMETIDO"),
    presupuesto: entrada.presupuesto,
    ahorro:
      entrada.presupuesto === null
        ? null
        : redondear(entrada.presupuesto - gastado),
    costoPorHa:
      entrada.hectareas > 0 ? redondear(gastado / entrada.hectareas) : null,
    costoPorTonelada:
      produccionTn !== null ? redondear(gastado / produccionTn) : null,
  };
}
