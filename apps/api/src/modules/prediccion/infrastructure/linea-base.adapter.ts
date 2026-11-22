import { Inject, Injectable } from '@nestjs/common';
import type { ContextoEstimacion } from '../domain/modelo-rendimiento';
import type {
  EstimacionRendimiento,
  EstimadorRendimientoPort,
} from '../domain/ports/estimador-rendimiento.port';
import {
  DATOS_RENDIMIENTO_REPOSITORY,
  type DatosRendimientoRepository,
} from '../domain/repositories/datos-rendimiento.repository';
import { MINIMO_CAMPANAS_RF32 } from '../domain/rules/activacion';
import {
  calcularLineaBase,
  rendimientosPorTemporada,
} from '../domain/rules/linea-base';
import { redondear } from '../../../shared/numeros';

/** Estimacion oficial: promedio de los rendimientos totales de las campañas anteriores del cultivo. */
@Injectable()
export class LineaBaseAdapter implements EstimadorRendimientoPort {
  constructor(
    @Inject(DATOS_RENDIMIENTO_REPOSITORY)
    private readonly datos: DatosRendimientoRepository,
  ) {}

  async estimar(contexto: ContextoEstimacion): Promise<EstimacionRendimiento> {
    const [temporadas, registros] = await Promise.all([
      this.datos.temporadas(contexto.cultivoId, contexto.origen),
      this.datos.registros(contexto.cultivoId, contexto.origen),
    ]);
    const base = calcularLineaBase(
      rendimientosPorTemporada(temporadas, registros),
      contexto.inicioCampana,
    );

    const advertencias: string[] = [];
    if (base.valor === null) {
      advertencias.push(
        'Sin datos: no hay campañas anteriores de este cultivo con rendimiento total.',
      );
    } else if (base.campanasUsadas.length < MINIMO_CAMPANAS_RF32) {
      advertencias.push(
        `RF-32: se usaron ${base.campanasUsadas.length} campañas; con menos de ${MINIMO_CAMPANAS_RF32} la estimación no se puede validar.`,
      );
    }
    if (base.calculadaDesdeLotes) {
      advertencias.push(
        'Alguna campaña no tiene total registrado: su rendimiento se calculó con la suma de los lotes.',
      );
    }

    return {
      valor_t_ha: base.valor === null ? null : redondear(base.valor),
      fuente: 'linea_base',
      estado: 'oficial',
      version_modelo: null,
      campañas_usadas: base.campanasUsadas.length,
      advertencias,
    };
  }
}
