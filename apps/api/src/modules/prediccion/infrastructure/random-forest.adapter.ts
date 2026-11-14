import { Inject, Injectable } from '@nestjs/common';
import type { ContextoEstimacion } from '../domain/modelo-rendimiento';
import type {
  EstimacionRendimiento,
  EstimadorRendimientoPort,
} from '../domain/ports/estimador-rendimiento.port';
import {
  REGRESOR_PORT,
  type ModeloRegresion,
  type RegresorPort,
} from '../domain/ports/regresor.port';
import {
  MODELO_IA_REPOSITORY,
  type ModeloIaRepository,
} from '../domain/repositories/modelo-ia.repository';
import { MINIMO_CAMPANAS_RF32 } from '../domain/rules/activacion';
import { codificar, diasDesdePrimeroDeOctubre } from '../domain/rules/variables';
import { redondear2 } from './linea-base.adapter';

export const etiquetaVersion = (version: number): string => `v${version}`;

/**
 * Estimacion del modelo Random Forest. Es "experimental" salvo que la version
 * vigente este "activa" (solo entonces pasa a ser la oficial).
 */
@Injectable()
export class RandomForestAdapter implements EstimadorRendimientoPort {
  /** Deserializar 300 arboles es caro: se guarda el ultimo modelo cargado. */
  private cache: { id: string; modelo: ModeloRegresion } | null = null;

  constructor(
    @Inject(MODELO_IA_REPOSITORY)
    private readonly modelos: ModeloIaRepository,
    @Inject(REGRESOR_PORT) private readonly regresor: RegresorPort,
  ) {}

  async estimar(
    contexto: ContextoEstimacion,
  ): Promise<EstimacionRendimiento | null> {
    const version = await this.modelos.vigente(contexto.cultivoId, contexto.origen);
    if (!version) return null;

    const base = {
      fuente: 'modelo' as const,
      estado:
        version.estado === 'activo' ? ('oficial' as const) : ('experimental' as const),
      version_modelo: etiquetaVersion(version.version),
      campañas_usadas: version.campanasUsadas.length,
    };
    const advertencias: string[] = [];
    if (version.origenDatos === 'demo_enmascarado') {
      advertencias.push(
        'Modelo entrenado con datos de demostración (enmascarados): no es una estimación real.',
      );
    }
    if (version.campanasUsadas.length < MINIMO_CAMPANAS_RF32) {
      advertencias.push(
        `RF-32: el modelo se entrenó con ${version.campanasUsadas.length} campañas; con menos de ${MINIMO_CAMPANAS_RF32} no se puede validar.`,
      );
    }
    if (!contexto.siembra) {
      return {
        ...base,
        valor_t_ha: null,
        advertencias: [
          ...advertencias,
          'Sin datos: falta registrar la siembra (superficie, variedad y fecha) de esta campaña.',
        ],
      };
    }

    const { siembra } = contexto;
    const matriz = codificar(
      [
        {
          haSembradas: siembra.haSembradas,
          diasSiembra: siembra.fechaSiembra
            ? diasDesdePrimeroDeOctubre(contexto.inicioCampana, siembra.fechaSiembra)
            : null,
          variedad: siembra.variedad,
          lag1: null,
        },
      ],
      version.codificador,
    );
    if (matriz.imputadas[0]) {
      advertencias.push(
        'Falta la fecha de siembra: se usó la mediana del entrenamiento (valor imputado).',
      );
    }
    if (matriz.variedadDesconocida[0]) {
      advertencias.push('La variedad no estaba en los datos de entrenamiento.');
    }

    if (this.cache?.id !== version.id) {
      this.cache = { id: version.id, modelo: this.regresor.cargar(version.modelo) };
    }
    return {
      ...base,
      valor_t_ha: redondear2(this.cache.modelo.predecir(matriz.X)[0]),
      advertencias,
    };
  }
}
