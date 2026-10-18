import { PresupuestoEntity } from '../entities/presupuesto.entity';

export const PRESUPUESTO_REPOSITORY = Symbol('PRESUPUESTO_REPOSITORY');

export interface PresupuestoRepository {
  findByCampana(campanaId: string): Promise<PresupuestoEntity | null>;
  guardar(
    campanaId: string,
    montoTotal: number,
    notas: string | null,
  ): Promise<PresupuestoEntity>;
}
