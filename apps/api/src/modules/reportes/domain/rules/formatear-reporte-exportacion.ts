import { EstadoCampana, TipoActividad } from '../../../../generated/prisma/enums';
import type { ReporteCampanaDto } from '../../application/dto/reporte-campana.dto';

export const ESTADO_CAMPANA_ETIQUETA: Record<EstadoCampana, string> = {
  PLANIFICADA: 'Planificada',
  EN_CURSO: 'En curso',
  COSECHADA: 'Cosechada',
};

export const TIPO_ACTIVIDAD_ETIQUETA: Record<TipoActividad, string> = {
  SIEMBRA: 'Siembra',
  FUMIGACION: 'Fumigación',
  FERTILIZACION: 'Fertilización',
  MEDICION_HUMEDAD_SUELO: 'Medición de humedad de suelo',
  MEDICION_HUMEDAD_GRANO: 'Medición de humedad de grano',
  COSECHA: 'Cosecha',
};

const pad2 = (valor: number): string => String(valor).padStart(2, '0');

function aDate(fecha: Date | string | null | undefined): Date | null {
  if (!fecha) return null;
  const parsed = fecha instanceof Date ? fecha : new Date(fecha);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Formato DD/MM/AAAA en UTC (consistente con fechas de base de datos sin hora). */
export function formatearFechaReporte(
  fecha: Date | string | null | undefined,
): string {
  const parsed = aDate(fecha);
  if (!parsed) return '—';
  return `${pad2(parsed.getUTCDate())}/${pad2(parsed.getUTCMonth() + 1)}/${parsed.getUTCFullYear()}`;
}

/** Formato AAAA-MM-DD en UTC para nombres de archivo. */
export function formatearFechaIsoArchivo(fecha: Date | string): string {
  const parsed = aDate(fecha);
  if (!parsed) return 'sin-fecha';
  return `${parsed.getUTCFullYear()}-${pad2(parsed.getUTCMonth() + 1)}-${pad2(parsed.getUTCDate())}`;
}

/** Fecha y hora en zona horaria oficial de Bolivia (America/La_Paz, UTC-4). */
export function formatearFechaHoraBolivia(fecha: Date | string): string {
  const parsed = aDate(fecha);
  if (!parsed) return '—';
  const partes = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/La_Paz',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(parsed);
  const obtener = (tipo: Intl.DateTimeFormatPartTypes): string =>
    partes.find((parte) => parte.type === tipo)?.value ?? '00';
  return `${obtener('day')}/${obtener('month')}/${obtener('year')} ${obtener('hour')}:${obtener('minute')}`;
}

export function formatearMonedaBs(monto: number | null | undefined): string {
  if (monto === null || monto === undefined || !Number.isFinite(monto)) {
    return '—';
  }
  const signo = monto < 0 ? '-' : '';
  const absoluto = Math.abs(monto);
  const [entero, decimal] = absoluto.toFixed(2).split('.');
  const enteroConMiles = entero.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${signo}Bs ${enteroConMiles},${decimal}`;
}

export function formatearNumero(
  valor: number | null | undefined,
  decimales = 2,
): string {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) {
    return '—';
  }
  return valor.toFixed(decimales).replace('.', ',');
}

export function slugArchivo(texto: string): string {
  return (
    texto
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'reporte'
  );
}

export function construirNombreArchivoReporte(
  reporte: ReporteCampanaDto,
  extension: 'pdf' | 'xlsx',
): string {
  const parcela = slugArchivo(reporte.parcela.nombre);
  const temporada = slugArchivo(reporte.campana.temporada);
  const alcance = reporte.periodo.porDefecto
    ? `campana-completa-${formatearFechaIsoArchivo(reporte.periodo.desde)}-a-${formatearFechaIsoArchivo(reporte.periodo.hasta)}`
    : `${formatearFechaIsoArchivo(reporte.periodo.desde)}-a-${formatearFechaIsoArchivo(reporte.periodo.hasta)}`;
  return `reporte-campana-${parcela}-${temporada}-${alcance}.${extension}`;
}
