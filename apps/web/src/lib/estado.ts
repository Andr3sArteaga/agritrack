/**
 * Estados visuales de un indicador o de una parcela (guia visual, regla D1).
 *
 * Orden de gravedad: CRITICO > ATENCION > SIN_DATOS > BIEN.
 * "Bien" solo se usa si el dato existe, esta al dia y cumple una regla VALIDADA.
 * Un dato que falta, esta vencido o no tiene regla nunca es "Bien".
 */
export type EstadoIndicador = "BIEN" | "ATENCION" | "CRITICO" | "SIN_DATOS";

export const ETIQUETA_ESTADO: Record<EstadoIndicador, string> = {
  BIEN: "Bien",
  ATENCION: "Atención",
  CRITICO: "Crítico",
  SIN_DATOS: "Sin datos",
};

/** Orden en que se muestran los contadores: "Sin datos" primero, por ser el caso mas frecuente. */
export const ESTADOS_EN_PANTALLA: readonly EstadoIndicador[] = [
  "SIN_DATOS",
  "BIEN",
  "ATENCION",
  "CRITICO",
];

const GRAVEDAD: Record<EstadoIndicador, number> = {
  CRITICO: 3,
  ATENCION: 2,
  SIN_DATOS: 1,
  BIEN: 0,
};

/** El peor de varios estados. Sin nada que evaluar el resultado es SIN_DATOS, nunca BIEN. */
export function estadoGeneral(estados: readonly EstadoIndicador[]): EstadoIndicador {
  if (estados.length === 0) return "SIN_DATOS";
  return estados.reduce((peor, actual) =>
    GRAVEDAD[actual] > GRAVEDAD[peor] ? actual : peor,
  );
}

/** Alertas = indicadores en Atencion o Critico. "Sin datos" no es una alerta (y tampoco es "0 alertas"). */
export function contarAlertas(estados: readonly EstadoIndicador[]): number {
  return estados.filter((e) => e === "ATENCION" || e === "CRITICO").length;
}

export function contarPorEstado(
  estados: readonly EstadoIndicador[],
): Record<EstadoIndicador, number> {
  const conteo: Record<EstadoIndicador, number> = {
    BIEN: 0,
    ATENCION: 0,
    CRITICO: 0,
    SIN_DATOS: 0,
  };
  for (const estado of estados) conteo[estado] += 1;
  return conteo;
}
