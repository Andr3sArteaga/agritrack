import {
  EstadoCampana,
  EstadoGasto,
  TipoActividad,
} from '../../../../generated/prisma/enums';

export const REPORTES_QUERY_PORT = Symbol('REPORTES_QUERY_PORT');

export interface CosechaHistorica {
  campanaId: string;
  parcelaId: string;
  parcelaNombre: string;
  cultivoId: string;
  cultivoNombre: string;
  temporada: string;
  rendimientoTnHa: number;
  fecha: Date;
}

export interface ProximaCosecha {
  campanaId: string;
  parcelaNombre: string;
  cultivoNombre: string;
  fechaFin: Date | null;
}

export interface CampanaPlanificada {
  campanaId: string;
  parcelaId: string;
  parcelaNombre: string;
  cultivoId: string;
  cultivoNombre: string;
  temporada: string;
  fechaInicio: Date;
}

export interface FiltrosHistorico {
  parcelaId?: string;
  cultivoId?: string;
}

/** RF-42: datos fijos de la campana para su reporte. */
export interface CampanaReporte {
  id: string;
  temporada: string;
  estado: EstadoCampana;
  fechaInicio: Date;
  fechaFin: Date | null;
  parcela: {
    id: string;
    nombre: string;
    hectareas: number;
    ubicacionTexto: string;
  };
  cultivo: { id: string; nombre: string };
  presupuestoTotal: number | null;
}

/** Actividad vigente (sin correcciones posteriores) dentro del periodo. */
export interface ActividadReporte {
  id: string;
  secuencia: number;
  tipo: TipoActividad;
  fecha: Date;
  descripcion: string;
  insumo: string | null;
  cantidad: number | null;
  unidad: string | null;
  responsableNombre: string;
  tercerizado: boolean;
  rendimientoTnHa: number | null;
  correccionDeId: string | null;
}

export interface GastoReporte {
  monto: number;
  estado: EstadoGasto;
  anulado: boolean;
}

export interface RangoFechas {
  desde: Date;
  /** Exclusivo: fecha < hastaExclusivo. */
  hastaExclusivo: Date;
}

export interface MovimientosPeriodo {
  actividades: ActividadReporte[];
  gastos: GastoReporte[];
}

export interface ReportesQueryPort {
  historicoRendimiento(
    filtros?: FiltrosHistorico,
  ): Promise<CosechaHistorica[]>;
  hectareasTotalesActivas(): Promise<number>;
  contarCampanasEnCurso(): Promise<number>;
  proximasCosechas(limite: number): Promise<ProximaCosecha[]>;
  ultimaCosecha(): Promise<CosechaHistorica | null>;
  proximaCampanaPlanificada(): Promise<CampanaPlanificada | null>;
  campanaParaReporte(campanaId: string): Promise<CampanaReporte | null>;
  movimientosDelPeriodo(
    campanaId: string,
    rango: RangoFechas,
  ): Promise<MovimientosPeriodo>;
}
