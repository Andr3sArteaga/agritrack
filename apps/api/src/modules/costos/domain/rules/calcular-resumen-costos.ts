import { EstadoGasto } from '../../../../generated/prisma/enums';
import type { GastoEntity } from '../entities/gasto.entity';

export interface EntradaResumenCostos {
  gastos: GastoEntity[];
  presupuesto: number | null;
  hectareas: number;
  /** Rendimiento real (t/ha) registrado; null si todavia no hay produccion. */
  rendimientoTnHa: number | null;
}

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
 * RF-30: resumen de costos de una campana. El "gasto real" es solo lo PAGADO;
 * lo comprometido se informa aparte y no entra en ahorro ni en costo/ha ni
 * costo/ton. Los gastos anulados nunca cuentan. El costo por tonelada es null
 * si no hay produccion real registrada (no se inventan valores).
 */
export function calcularResumenCostos(
  entrada: EntradaResumenCostos,
): ResumenCostos {
  const vigentes = entrada.gastos.filter((gasto) => !gasto.anulado);
  const sumar = (estado: EstadoGasto): number =>
    redondear(
      vigentes
        .filter((gasto) => gasto.estado === estado)
        .reduce((total, gasto) => total + gasto.monto, 0),
    );

  const gastado = sumar(EstadoGasto.PAGADO);
  const produccionTn =
    entrada.rendimientoTnHa !== null && entrada.rendimientoTnHa > 0
      ? entrada.rendimientoTnHa * entrada.hectareas
      : null;

  return {
    gastado,
    comprometido: sumar(EstadoGasto.COMPROMETIDO),
    presupuesto: entrada.presupuesto,
    ahorro:
      entrada.presupuesto === null
        ? null
        : redondear(entrada.presupuesto - gastado),
    costoPorHa:
      entrada.hectareas > 0 ? redondear(gastado / entrada.hectareas) : null,
    costoPorTonelada:
      produccionTn !== null && produccionTn > 0
        ? redondear(gastado / produccionTn)
        : null,
  };
}
