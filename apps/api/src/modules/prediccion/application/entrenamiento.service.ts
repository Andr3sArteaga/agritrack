import { createHash } from 'node:crypto';
import { ConflictException, Inject, Injectable } from '@nestjs/common';
import type {
  FilaModelo,
  MetricasModelo,
  ModeloIa,
  OrigenDatos,
} from '../domain/modelo-rendimiento';
import { REGRESOR_PORT, type RegresorPort } from '../domain/ports/regresor.port';
import {
  DATOS_RENDIMIENTO_REPOSITORY,
  type DatosRendimientoRepository,
} from '../domain/repositories/datos-rendimiento.repository';
import {
  MODELO_IA_REPOSITORY,
  type ModeloIaRepository,
} from '../domain/repositories/modelo-ia.repository';
import { decidirActivacion } from '../domain/rules/activacion';
import {
  REPETICIONES_BOOTSTRAP,
  SEMILLA_BOOTSTRAP,
} from '../domain/rules/bootstrap';
import { rendimientosPorTemporada } from '../domain/rules/linea-base';
import { ajustarCodificador, codificar, construirFilas } from '../domain/rules/variables';
import { evaluarWalkForward } from '../domain/rules/walk-forward';

/** Parametros del algoritmo, solo para dejarlos anotados en cada version. */
const ARBOLES = 300;
const SEMILLA_MODELO = 42;

/** Huella SHA-256 del conjunto de entrenamiento (filas en orden fijo). */
export function hashDeFilas(filas: readonly FilaModelo[]): string {
  const canonico = [...filas]
    .sort((a, b) =>
      `${a.temporada}|${a.parcelaId}`.localeCompare(`${b.temporada}|${b.parcelaId}`),
    )
    .map((f) => [
      f.temporada,
      f.parcelaId,
      f.haSembradas,
      f.diasSiembra,
      f.variedad,
      f.lag1,
      f.rendimiento,
    ]);
  return createHash('sha256').update(JSON.stringify(canonico)).digest('hex');
}

@Injectable()
export class EntrenamientoService {
  constructor(
    @Inject(DATOS_RENDIMIENTO_REPOSITORY)
    private readonly datos: DatosRendimientoRepository,
    @Inject(MODELO_IA_REPOSITORY)
    private readonly modelos: ModeloIaRepository,
    @Inject(REGRESOR_PORT) private readonly regresor: RegresorPort,
  ) {}

  /**
   * Entrena y evalua el modelo de un cultivo y guarda una version nueva.
   * Los datos reales y los de demostracion nunca se mezclan: si hay reales se
   * usan esos; si no, los de demostracion (que nunca activan un modelo).
   */
  async entrenar(cultivoId: string): Promise<ModeloIa> {
    const origenes = await this.datos.origenesConDatos(cultivoId);
    if (origenes.length === 0) {
      throw new ConflictException(
        'No hay datos de siembra y cosecha de este cultivo para entrenar.',
      );
    }
    const origen: OrigenDatos = origenes.includes('real')
      ? 'real'
      : 'demo_enmascarado';

    const [registros, temporadas] = await Promise.all([
      this.datos.registros(cultivoId, origen),
      this.datos.temporadas(cultivoId, origen),
    ]);
    const filas = construirFilas(registros, temporadas);
    const campanasConDatos = temporadas
      .map((t) => t.temporada)
      .filter((temporada) => filas.some((fila) => fila.temporada === temporada));
    if (campanasConDatos.length < 2) {
      throw new ConflictException(
        'Se necesitan al menos 2 campañas con cosecha para validar el modelo.',
      );
    }

    // 1) Evaluacion walk-forward (el modelo final NO participa aqui).
    const rendimientos = rendimientosPorTemporada(temporadas, registros);
    const varianteA = evaluarWalkForward(filas, rendimientos, this.regresor, false);
    const conLag = evaluarWalkForward(filas, rendimientos, this.regresor, true);
    const activacion = decidirActivacion({
      origenDatos: origen,
      campanasDelCultivo: campanasConDatos.length,
      walkForward: varianteA,
    });

    // 2) Modelo final con todas las campañas disponibles (variante A).
    const codificador = ajustarCodificador(filas, false);
    const modelo = this.regresor.entrenar(
      codificar(filas, codificador).X,
      filas.map((fila) => fila.rendimiento),
    );

    const metricas: MetricasModelo = {
      varianteA,
      varianteB: conLag.cortes.length > 0 ? conLag : null,
      activacion,
      parametros: {
        arboles: ARBOLES,
        semillaModelo: SEMILLA_MODELO,
        repeticionesBootstrap: REPETICIONES_BOOTSTRAP,
        semillaBootstrap: SEMILLA_BOOTSTRAP,
      },
    };

    return this.modelos.crearVersion({
      cultivoId,
      origenDatos: origen,
      campanasUsadas: campanasConDatos,
      hashDatos: hashDeFilas(filas),
      codificador,
      metricas,
      modelo: modelo.serializar(),
      estado: activacion.estado,
    });
  }

  /**
   * Disparador automatico (RF-34). Listo para llamarse cuando exista el cierre
   * de campaña (RF-14); hoy nadie lo llama. Si aun no hay datos suficientes no falla.
   */
  async entrenarAlCerrarCampana(cultivoId: string): Promise<ModeloIa | null> {
    try {
      return await this.entrenar(cultivoId);
    } catch (error) {
      if (error instanceof ConflictException) return null;
      throw error;
    }
  }
}
