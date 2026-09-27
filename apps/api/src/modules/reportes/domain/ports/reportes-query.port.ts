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

export interface ReportesQueryPort {
  historicoRendimiento(
    filtros?: FiltrosHistorico,
  ): Promise<CosechaHistorica[]>;
  hectareasTotalesActivas(): Promise<number>;
  contarCampanasEnCurso(): Promise<number>;
  proximasCosechas(limite: number): Promise<ProximaCosecha[]>;
  ultimaCosecha(): Promise<CosechaHistorica | null>;
  proximaCampanaPlanificada(): Promise<CampanaPlanificada | null>;
}
