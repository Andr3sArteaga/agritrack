const UN_DIA_MS = 24 * 60 * 60 * 1000;

/** Fecha sin hora (medianoche UTC), igual que se guardan las fechas de campana y actividad. */
export function inicioDelDia(fecha: Date): Date {
  return new Date(
    Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate()),
  );
}

/** "AAAA-MM-DD" -> medianoche UTC de ese dia. */
export function fechaDesdeTexto(texto: string): Date {
  return new Date(`${texto}T00:00:00.000Z`);
}

export interface PeriodoReporte {
  desde: Date;
  /** Inclusivo: el reporte abarca todo el dia `hasta`. */
  hasta: Date;
  /** `hasta` + 1 dia; las consultas usan `fecha < hastaExclusivo`. */
  hastaExclusivo: Date;
  /** true si no se indico ni desde ni hasta (periodo completo de la campana). */
  porDefecto: boolean;
}

/**
 * RF-42: periodo consultado de un reporte por campana. Lo que no se indica se
 * completa con las fechas de la campana. Si la campana no tiene fecha de fin
 * (planificada o en curso), el fin por defecto es hoy, o su fecha de inicio si
 * todavia no empezo (asi el periodo por defecto nunca queda invertido).
 *
 * No valida el orden: si `desde` > `hasta` lo decide quien llama (400).
 */
export function resolverPeriodo(
  pedido: { desde?: string; hasta?: string },
  campana: { fechaInicio: Date; fechaFin: Date | null },
  ahora: Date,
): PeriodoReporte {
  const inicioCampana = inicioDelDia(campana.fechaInicio);
  const finCampana = campana.fechaFin
    ? inicioDelDia(campana.fechaFin)
    : new Date(Math.max(inicioDelDia(ahora).getTime(), inicioCampana.getTime()));

  const desde = pedido.desde ? fechaDesdeTexto(pedido.desde) : inicioCampana;
  const hasta = pedido.hasta ? fechaDesdeTexto(pedido.hasta) : finCampana;

  return {
    desde,
    hasta,
    hastaExclusivo: new Date(hasta.getTime() + UN_DIA_MS),
    porDefecto: !pedido.desde && !pedido.hasta,
  };
}
