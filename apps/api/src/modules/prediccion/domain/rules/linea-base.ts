/**
 * Linea base oficial: promedio de los rendimientos TOTALES por campaña
 * (toneladas totales / hectareas cosechadas totales) de las campañas
 * anteriores del mismo cultivo. Una campaña sin superficie total conocida
 * no entra (version "a" del prototipo).
 */
import type { RegistroLote, TemporadaCultivo } from '../modelo-rendimiento';

export interface RendimientoTemporada {
  temporada: string;
  inicio: Date;
  /** null = no entra en la linea base. */
  rendimiento: number | null;
  /** true = no habia total registrado y se calculo con la suma de los lotes. */
  calculadoDesdeLotes: boolean;
}

/** Resuelve el rendimiento total de cada campaña (registrado o, si no hay, suma de lotes). */
export function rendimientosPorTemporada(
  temporadas: readonly TemporadaCultivo[],
  registros: readonly RegistroLote[],
): RendimientoTemporada[] {
  return temporadas.map(({ temporada, inicio, rendimientoTotal }) => {
    if (rendimientoTotal !== undefined) {
      return {
        temporada,
        inicio,
        rendimiento: rendimientoTotal,
        calculadoDesdeLotes: false,
      };
    }
    let toneladas = 0;
    let hectareas = 0;
    for (const registro of registros) {
      if (
        registro.temporada === temporada &&
        registro.toneladas !== null &&
        registro.haCosechadas !== null &&
        registro.haCosechadas > 0
      ) {
        toneladas += registro.toneladas;
        hectareas += registro.haCosechadas;
      }
    }
    return {
      temporada,
      inicio,
      rendimiento: hectareas > 0 ? toneladas / hectareas : null,
      calculadoDesdeLotes: true,
    };
  });
}

export interface LineaBase {
  /** null = sin datos (no hay campañas anteriores con rendimiento total). */
  valor: number | null;
  campanasUsadas: string[];
  calculadaDesdeLotes: boolean;
}

/** Promedio de las campañas que empezaron ANTES de `antesDe`. */
export function calcularLineaBase(
  rendimientos: readonly RendimientoTemporada[],
  antesDe: Date,
): LineaBase {
  const anteriores = rendimientos.filter(
    (r) => r.inicio.getTime() < antesDe.getTime() && r.rendimiento !== null,
  );
  if (anteriores.length === 0) {
    return { valor: null, campanasUsadas: [], calculadaDesdeLotes: false };
  }
  const suma = anteriores.reduce((total, r) => total + (r.rendimiento as number), 0);
  return {
    valor: suma / anteriores.length,
    campanasUsadas: anteriores.map((r) => r.temporada),
    calculadaDesdeLotes: anteriores.some((r) => r.calculadoDesdeLotes),
  };
}
