import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ETIQUETA_DEMO, type ModeloIa } from '../domain/modelo-rendimiento';
import {
  ESTIMADOR_LINEA_BASE,
  ESTIMADOR_MODELO,
  type EstimadorRendimientoPort,
} from '../domain/ports/estimador-rendimiento.port';
import {
  DATOS_RENDIMIENTO_REPOSITORY,
  type DatosRendimientoRepository,
} from '../domain/repositories/datos-rendimiento.repository';
import {
  MODELO_IA_REPOSITORY,
  type ModeloIaRepository,
} from '../domain/repositories/modelo-ia.repository';
import type { EstimacionResponseDto } from './dto/estimacion-response.dto';

@Injectable()
export class EstimacionService {
  constructor(
    @Inject(ESTIMADOR_LINEA_BASE)
    private readonly lineaBase: EstimadorRendimientoPort,
    @Inject(ESTIMADOR_MODELO)
    private readonly modelo: EstimadorRendimientoPort,
    @Inject(DATOS_RENDIMIENTO_REPOSITORY)
    private readonly datos: DatosRendimientoRepository,
    @Inject(MODELO_IA_REPOSITORY)
    private readonly modelos: ModeloIaRepository,
  ) {}

  /**
   * La linea base es SIEMPRE la estimacion oficial. Si hay un modelo, su
   * estimacion va aparte como "experimental". Solo si el modelo esta "activo"
   * pasa a ser la oficial (y la linea base queda como referencia).
   */
  async estimar(parcelaId: string, campanaId: string): Promise<EstimacionResponseDto> {
    const contexto = await this.datos.contextoEstimacion(parcelaId, campanaId);
    if (!contexto) {
      throw new NotFoundException('No existe esa campaña para ese lote.');
    }
    const [base, delModelo] = await Promise.all([
      this.lineaBase.estimar(contexto),
      this.modelo.estimar(contexto),
    ]);
    if (!base) throw new Error('La línea base siempre debe responder.');

    const modeloEsOficial =
      delModelo?.estado === 'oficial' && delModelo.valor_t_ha !== null;
    return {
      oficial: modeloEsOficial ? delModelo : base,
      experimental:
        delModelo && !modeloEsOficial
          ? { ...delModelo, estado: 'experimental' }
          : null,
      referencia_linea_base: modeloEsOficial ? base : null,
      origen_datos: contexto.origen,
      etiqueta_datos: contexto.origen === 'demo_enmascarado' ? ETIQUETA_DEMO : null,
    };
  }

  listarModelos(cultivoId?: string): Promise<ModeloIa[]> {
    return this.modelos.listar(cultivoId);
  }

  /** Parcelas de demostracion: el panel las oculta por defecto. */
  async datosDemo(): Promise<{ parcelaIds: string[]; etiqueta: string }> {
    return {
      parcelaIds: await this.datos.parcelasDemo(),
      etiqueta: ETIQUETA_DEMO,
    };
  }
}
