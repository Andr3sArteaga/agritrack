import { ActividadEntity } from '../../src/modules/actividades/domain/entities/actividad.entity';
import {
  calcularHashSha256,
  canonicalizarActividad,
  type ContenidoActividad,
} from '../../src/shared/integridad/canonicalizar-actividad';

export type DatosActividad = Omit<
  ContenidoActividad,
  'secuencia' | 'hashAnterior'
>;

export const DATOS_BASE: DatosActividad = {
  campanaId: 'camp_1',
  tipo: 'SIEMBRA',
  fecha: new Date('2026-06-05T00:00:00.000Z'),
  descripcion: 'Siembra de la temporada actual',
  insumo: 'Semilla certificada',
  cantidad: 60,
  unidad: 'kg/ha',
  responsableId: 'user_1',
  tercerizado: false,
  maquinariaUtilizada: null,
  rendimientoTnHa: null,
  correccionDeId: null,
  motivoCorreccion: null,
};

export function contenidoDe(actividad: ActividadEntity): ContenidoActividad {
  return {
    secuencia: actividad.secuencia,
    campanaId: actividad.campanaId,
    tipo: actividad.tipo,
    fecha: actividad.fecha,
    descripcion: actividad.descripcion,
    insumo: actividad.insumo,
    cantidad: actividad.cantidad,
    unidad: actividad.unidad,
    responsableId: actividad.responsableId,
    tercerizado: actividad.tercerizado,
    maquinariaUtilizada: actividad.maquinariaUtilizada,
    rendimientoTnHa: actividad.rendimientoTnHa,
    correccionDeId: actividad.correccionDeId,
    motivoCorreccion: actividad.motivoCorreccion,
    hashAnterior: actividad.hashAnterior,
  };
}

/**
 * Replica el procedimiento de `crearConIntegridad` (secuencia + hashAnterior
 * + SHA-256 del contenido canonico) sin base de datos, usando las mismas
 * funciones de produccion.
 */
export function construirActividad(
  secuencia: number,
  hashAnterior: string | null,
  datos: Partial<DatosActividad> = {},
): ActividadEntity {
  const contenido: ContenidoActividad = {
    ...DATOS_BASE,
    ...datos,
    secuencia,
    hashAnterior,
  };
  return new ActividadEntity(
    `act_${secuencia}`,
    secuencia,
    contenido.campanaId,
    contenido.tipo as ActividadEntity['tipo'],
    contenido.fecha,
    contenido.descripcion,
    contenido.insumo,
    contenido.cantidad,
    contenido.unidad,
    contenido.responsableId,
    contenido.tercerizado,
    contenido.maquinariaUtilizada,
    contenido.rendimientoTnHa,
    contenido.correccionDeId,
    contenido.motivoCorreccion,
    calcularHashSha256(canonicalizarActividad(contenido)),
    hashAnterior,
    new Date('2026-06-06T00:00:00.000Z'),
    true,
  );
}

export function construirCadena(
  total: number,
  datosPorSecuencia: Record<number, Partial<DatosActividad>> = {},
): ActividadEntity[] {
  const cadena: ActividadEntity[] = [];
  for (let secuencia = 1; secuencia <= total; secuencia++) {
    const anterior = cadena[cadena.length - 1];
    cadena.push(
      construirActividad(
        secuencia,
        anterior ? anterior.hash : null,
        datosPorSecuencia[secuencia],
      ),
    );
  }
  return cadena;
}

/**
 * Simula una edicion directa en la base de datos: cambia campos del
 * registro pero conserva el hash y hashAnterior ya guardados.
 */
export function alterarSinRecalcular(
  actividad: ActividadEntity,
  cambios: Partial<
    Pick<
      ActividadEntity,
      | 'descripcion'
      | 'rendimientoTnHa'
      | 'fecha'
      | 'cantidad'
      | 'hashAnterior'
      | 'campanaId'
    >
  >,
): ActividadEntity {
  return new ActividadEntity(
    actividad.id,
    actividad.secuencia,
    cambios.campanaId ?? actividad.campanaId,
    actividad.tipo,
    cambios.fecha ?? actividad.fecha,
    cambios.descripcion ?? actividad.descripcion,
    actividad.insumo,
    cambios.cantidad === undefined ? actividad.cantidad : cambios.cantidad,
    actividad.unidad,
    actividad.responsableId,
    actividad.tercerizado,
    actividad.maquinariaUtilizada,
    cambios.rendimientoTnHa === undefined
      ? actividad.rendimientoTnHa
      : cambios.rendimientoTnHa,
    actividad.correccionDeId,
    actividad.motivoCorreccion,
    actividad.hash,
    cambios.hashAnterior === undefined
      ? actividad.hashAnterior
      : cambios.hashAnterior,
    actividad.createdAt,
    actividad.vigente,
  );
}

/** Igual que `alterarSinRecalcular`, pero el atacante tambien recalcula el hash propio. */
export function alterarRecalculandoHash(
  actividad: ActividadEntity,
  datos: Partial<DatosActividad>,
): ActividadEntity {
  return construirActividad(actividad.secuencia, actividad.hashAnterior, {
    ...contenidoDe(actividad),
    ...datos,
  });
}
