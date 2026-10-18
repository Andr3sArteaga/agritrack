import type { CampanaEntity } from '../../../campanas/domain/entities/campana.entity';

/**
 * RF-57: una campana cerrada es de solo lectura y no admite crear, editar ni
 * anular gastos, ni cambiar su presupuesto.
 *
 * TODO(RF-14 / RF-57): hoy NO existe el estado "cerrada" (EstadoCampana solo
 * tiene PLANIFICADA, EN_CURSO y COSECHADA), por eso siempre permite. Al
 * implementar el cierre de campana, devolver false cuando este cerrada. Es el
 * unico punto a cambiar: GastosService y PresupuestosService ya la consultan.
 */
export function campanaPermiteGastos(campana: CampanaEntity): boolean {
  void campana;
  return true;
}
