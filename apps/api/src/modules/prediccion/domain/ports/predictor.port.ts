export const PREDICTOR_PORT = Symbol('PREDICTOR_PORT');

export interface PrediccionResultado {
  rendimientoEstimadoTnHa: number | null;
  campanasHistoricasUsadas: number;
}

export interface PredictorPort {
  predecir(parcelaId: string, cultivoId: string): Promise<PrediccionResultado>;
}
