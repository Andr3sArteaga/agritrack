import type {
  ModeloIa,
  ModeloIaConPesos,
  NuevoModeloIa,
  OrigenDatos,
} from '../modelo-rendimiento';

export const MODELO_IA_REPOSITORY = Symbol('MODELO_IA_REPOSITORY');

export interface ModeloIaRepository {
  /** Crea la version siguiente. Si entra como "activo", el activo anterior pasa a "archivado". */
  crearVersion(datos: NuevoModeloIa): Promise<ModeloIa>;
  /** Versiones sin el modelo serializado (es pesado). */
  listar(cultivoId?: string): Promise<ModeloIa[]>;
  /** El modelo activo; si no hay, el experimental mas reciente de ese origen. */
  vigente(
    cultivoId: string,
    origen: OrigenDatos,
  ): Promise<ModeloIaConPesos | null>;
}
