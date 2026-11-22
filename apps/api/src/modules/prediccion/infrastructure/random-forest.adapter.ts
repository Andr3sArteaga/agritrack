import { Inject, Injectable } from '@nestjs/common';
import type {
  ContextoEstimacion,
  MetricasDesempenoResumen,
  ModeloIaConPesos,
} from '../domain/modelo-rendimiento';
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
import { redondear } from '../../../shared/numeros';

export const etiquetaVersion = (version: number): string => `v${version}`;

function resumirMetricasEvaluacion(
  version: ModeloIaConPesos,
): MetricasDesempenoResumen | null {
  const global = version.metricas?.varianteA?.global;
  if (
    !global ||
    typeof global.maeModelo !== 'number' ||
    typeof global.maeLineaBase !== 'number' ||
    typeof global.rmseModelo !== 'number' ||
    typeof global.rmseLineaBase !== 'number'
  ) {
    return null;
  }
  return {
    maeModelo: redondear(global.maeModelo, 3),
    maeLineaBase: redondear(global.maeLineaBase, 3),
    diferenciaMae: redondear(global.diferencia, 3),
    icDiferenciaMae: [
      redondear(global.icDiferencia[0], 3),
      redondear(global.icDiferencia[1], 3),
    ],
    rmseModelo: redondear(global.rmseModelo, 3),
    rmseLineaBase: redondear(global.rmseLineaBase, 3),
    r2Modelo:
      typeof global.r2Modelo === 'number' && Number.isFinite(global.r2Modelo)
        ? redondear(global.r2Modelo, 3)
        : null,
    superaLineaBase: global.conclusion === 'supera',
    conclusion: global.conclusion,
    filasEvaluadas: global.filas,
    cortesEvaluados: global.cortes.length,
  };
}

/**
 * Estimacion del modelo Random Forest. Es "experimental" salvo que la version
 * vigente este "activo" / "activa" (solo entonces pasa a ser la oficial).
 */
@Injectable()
export class RandomForestAdapter implements EstimadorRendimientoPort {
  /** Deserializar 300 arboles es caro: se guarda el ultimo modelo cargado. */
  private cache: { id: string; modelo: ModeloRegresion } | null = null;

  constructor(
    @Inject(MODELO_IA_REPOSITORY)
    private readonly modelos: ModeloIaRepository,
    @Inject(REGRESOR_PORT) private readonly regresor: RegresorPort,
  ) { }

  async estimar(
    contexto: ContextoEstimacion,
  ): Promise<EstimacionRendimiento | null> {
    let version = await this.modelos.vigente(contexto.cultivoId, contexto.origen);
    if (!version && contexto.origen === 'real') {
      version = await this.modelos.vigente(contexto.cultivoId, 'demo_enmascarado');
    }
    if (!version) return null;

    const base = {
      fuente: 'modelo' as const,
      estado:
        version.estado === 'activo' ? ('oficial' as const) : ('experimental' as const),
      version_modelo: etiquetaVersion(version.version),
      campañas_usadas: version.campanasUsadas.length,
      metricas_evaluacion: resumirMetricasEvaluacion(version),
    };
    const advertencias: string[] = [];
    if (version.origenDatos === 'demo_enmascarado') {
      advertencias.push(
        'Calculada con datos iniciales (V1).',
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
      valor_t_ha: redondear(this.cache.modelo.predecir(matriz.X)[0]),
      advertencias,
    };
  }
}
