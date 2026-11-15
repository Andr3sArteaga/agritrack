/**
 * Reglas de carga de suelo y clima. Solo validan que el dato sea posible
 * (no dicen si es bueno o malo: eso lo decide el agronomo).
 */
import type {
  CondicionClima,
  ValoresSuelo,
} from '../repositories/monitoreo.repository';

/** Devuelve el motivo por el que no se puede guardar, o null si esta bien. */
export function errorAnalisisSuelo(valores: ValoresSuelo): string | null {
  const cargados = Object.values(valores).filter((valor) => valor !== null);
  if (cargados.length === 0) {
    return 'Anota al menos un valor del análisis.';
  }
  if (cargados.some((valor) => valor < 0)) {
    return 'Los valores no pueden ser negativos.';
  }
  if (valores.ph !== null && valores.ph > 14) {
    return 'El pH va de 0 a 14.';
  }
  if (valores.materiaOrganica !== null && valores.materiaOrganica > 100) {
    return 'La materia orgánica es un porcentaje: no puede pasar de 100.';
  }
  if (valores.humedad !== null && valores.humedad > 100) {
    return 'La humedad es un porcentaje: no puede pasar de 100.';
  }
  return null;
}

const CON_LLUVIA: readonly CondicionClima[] = ['LLUVIA_LIGERA', 'LLUVIA_FUERTE'];

export const esLluvia = (condicion: CondicionClima): boolean =>
  CON_LLUVIA.includes(condicion);

/** Los milimetros solo tienen sentido si llovio. */
export function errorRegistroClima(
  condicion: CondicionClima,
  lluviaMm: number | null,
): string | null {
  if (lluviaMm === null) return null;
  if (lluviaMm < 0) return 'Los milímetros de lluvia no pueden ser negativos.';
  if (lluviaMm > 0 && !esLluvia(condicion)) {
    return 'Solo se anotan milímetros cuando el día fue de lluvia.';
  }
  return null;
}

/** Un dato de campo no puede tener fecha futura. Se compara por dia (UTC). */
export function esFechaFutura(fecha: Date, hoy: Date): boolean {
  const dia = (d: Date): number =>
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return dia(fecha) > dia(hoy);
}
