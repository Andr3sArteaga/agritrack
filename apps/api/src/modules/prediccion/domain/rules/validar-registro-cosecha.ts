/**
 * Reglas puras para validar los datos de siembra y cosecha (registros_cosecha).
 */
import type {
  DatosCosechaInput,
  DatosSiembraInput,
  RegistroCosechaCampana,
} from '../modelo-rendimiento';

const diaUtc = (d: Date): number =>
  Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());

/** Un dato de campo no puede tener fecha futura. Se compara por dia (UTC). */
export function esFechaFutura(fecha: Date, hoy: Date): boolean {
  return diaUtc(fecha) > diaUtc(hoy);
}

export function errorDatosSiembra(
  datos: DatosSiembraInput,
  existente: Pick<RegistroCosechaCampana, 'haCosechadas' | 'fechaCosecha'> | null,
  hoy: Date,
): string | null {
  if (!Number.isFinite(datos.haSembradas) || datos.haSembradas <= 0) {
    return 'Las hectáreas sembradas deben ser mayores a 0.';
  }
  if (datos.fechaSiembra && esFechaFutura(datos.fechaSiembra, hoy)) {
    return 'La fecha de siembra no puede ser futura.';
  }
  if (
    existente?.haCosechadas !== null &&
    existente?.haCosechadas !== undefined &&
    datos.haSembradas < existente.haCosechadas
  ) {
    return 'Las hectáreas sembradas no pueden ser menores a las ya cosechadas.';
  }
  if (
    existente?.fechaCosecha &&
    datos.fechaSiembra &&
    diaUtc(datos.fechaSiembra) >= diaUtc(existente.fechaCosecha)
  ) {
    return 'La fecha de siembra debe ser anterior a la fecha de cosecha.';
  }
  return null;
}

export function errorDatosCosecha(
  datos: DatosCosechaInput,
  siembra: Pick<RegistroCosechaCampana, 'haSembradas' | 'fechaSiembra'> | null,
  hoy: Date,
): string | null {
  if (!siembra) {
    return 'Primero debes registrar los datos de siembra de esta campaña.';
  }
  if (!Number.isFinite(datos.haCosechadas) || datos.haCosechadas <= 0) {
    return 'Las hectáreas cosechadas deben ser mayores a 0.';
  }
  if (datos.haCosechadas > siembra.haSembradas) {
    return 'Las hectáreas cosechadas no pueden superar a las hectáreas sembradas.';
  }
  if (!Number.isFinite(datos.toneladas) || datos.toneladas < 0) {
    return 'Las toneladas cosechadas no pueden ser negativas.';
  }
  if (esFechaFutura(datos.fechaCosecha, hoy)) {
    return 'La fecha de cosecha no puede ser futura.';
  }
  if (
    siembra.fechaSiembra &&
    diaUtc(datos.fechaCosecha) <= diaUtc(siembra.fechaSiembra)
  ) {
    return 'La fecha de cosecha debe ser posterior a la fecha de siembra.';
  }
  return null;
}
