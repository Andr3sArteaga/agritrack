import { createHash } from 'crypto';

export interface ContenidoActividad {
  secuencia: number;
  campanaId: string;
  tipo: string;
  fecha: Date;
  descripcion: string;
  insumo: string | null;
  cantidad: number | null;
  unidad: string | null;
  responsableId: string;
  tercerizado: boolean;
  maquinariaUtilizada: string | null;
  rendimientoTnHa: number | null;
  correccionDeId: string | null;
  motivoCorreccion: string | null;
  hashAnterior: string | null;
}

/**
 * Serializa el contenido de una actividad en un orden fijo y determinista.
 * Usado tanto al escribir (calcular hash) como al verificar (recalcular
 * hash) la cadena de integridad: DEBE mantenerse identico en ambos lados.
 */
export function canonicalizarActividad(datos: ContenidoActividad): string {
  return JSON.stringify([
    datos.secuencia,
    datos.campanaId,
    datos.tipo,
    datos.fecha.toISOString(),
    datos.descripcion,
    datos.insumo,
    datos.cantidad,
    datos.unidad,
    datos.responsableId,
    datos.tercerizado,
    datos.maquinariaUtilizada,
    datos.rendimientoTnHa,
    datos.correccionDeId,
    datos.motivoCorreccion,
    datos.hashAnterior,
  ]);
}

export function calcularHashSha256(contenidoCanonico: string): string {
  return createHash('sha256').update(contenidoCanonico).digest('hex');
}

export const LOCK_KEY_CADENA_ACTIVIDADES = 851204;
