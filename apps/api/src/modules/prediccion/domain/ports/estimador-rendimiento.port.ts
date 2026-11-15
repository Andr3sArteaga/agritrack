import type { ContextoEstimacion } from '../modelo-rendimiento';

export const ESTIMADOR_LINEA_BASE = Symbol('ESTIMADOR_LINEA_BASE');
export const ESTIMADOR_MODELO = Symbol('ESTIMADOR_MODELO');

/**
 * Respuesta comun de todos los estimadores (linea base y modelo).
 * Puerto ampliado: convive con PredictorPort, que no cambia.
 */
export interface EstimacionRendimiento {
  /** null = sin datos. */
  valor_t_ha: number | null;
  fuente: 'linea_base' | 'modelo';
  estado: 'oficial' | 'experimental';
  version_modelo: string | null;
  campañas_usadas: number;
  advertencias: string[];
}

export interface EstimadorRendimientoPort {
  /** null = este estimador no aplica (ej. todavia no hay un modelo entrenado). */
  estimar(contexto: ContextoEstimacion): Promise<EstimacionRendimiento | null>;
}
