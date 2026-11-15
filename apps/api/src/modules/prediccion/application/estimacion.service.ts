import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import {
  ETIQUETA_DEMO,
  type ModeloIa,
  type OrigenDatos,
  type RegistroCosechaCampana,
  type ResultadoImpacto,
} from '../domain/modelo-rendimiento';
import {
  ESTIMADOR_LINEA_BASE,
  ESTIMADOR_MODELO,
  type EstimadorRendimientoPort,
} from '../domain/ports/estimador-rendimiento.port';
import {
  REGRESOR_PORT,
  type ModeloRegresion,
  type RegresorPort,
} from '../domain/ports/regresor.port';
import {
  DATOS_RENDIMIENTO_REPOSITORY,
  type DatosRendimientoRepository,
} from '../domain/repositories/datos-rendimiento.repository';
import {
  MODELO_IA_REPOSITORY,
  type ModeloIaRepository,
} from '../domain/repositories/modelo-ia.repository';
import { calcularImpactoPrediccion } from '../domain/rules/impacto-prediccion';
import {
  errorDatosCosecha,
  errorDatosSiembra,
} from '../domain/rules/validar-registro-cosecha';
import type { EstimacionResponseDto } from './dto/estimacion-response.dto';
import type { ImpactoQueryDto } from './dto/impacto-prediccion.dto';
import type { GuardarRegistroCosechaDto } from './dto/registro-cosecha.dto';
import { EntrenamientoService } from './entrenamiento.service';

const aDia = (texto: string): Date =>
  new Date(`${texto.slice(0, 10)}T00:00:00.000Z`);

@Injectable()
export class EstimacionService {
  private cacheModelo: { id: string; instancia: ModeloRegresion } | null = null;

  constructor(
    @Inject(ESTIMADOR_LINEA_BASE)
    private readonly lineaBase: EstimadorRendimientoPort,
    @Inject(ESTIMADOR_MODELO)
    private readonly modelo: EstimadorRendimientoPort,
    @Inject(DATOS_RENDIMIENTO_REPOSITORY)
    private readonly datos: DatosRendimientoRepository,
    @Inject(MODELO_IA_REPOSITORY)
    private readonly modelos: ModeloIaRepository,
    @Optional()
    @Inject(REGRESOR_PORT)
    private readonly regresor?: RegresorPort,
    @Optional()
    private readonly entrenamiento?: EntrenamientoService,
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

  async obtenerRegistroCosecha(
    campanaId: string,
  ): Promise<RegistroCosechaCampana | null> {
    if (!(await this.datos.existeCampana(campanaId))) {
      throw new NotFoundException('Campaña no encontrada.');
    }
    return this.datos.obtenerRegistroCosecha(campanaId);
  }

  async guardarRegistroCosecha(
    campanaId: string,
    dto: GuardarRegistroCosechaDto,
  ): Promise<RegistroCosechaCampana> {
    if (!(await this.datos.existeCampana(campanaId))) {
      throw new NotFoundException('Campaña no encontrada.');
    }
    const traeSiembra =
      dto.haSembradas !== undefined ||
      dto.variedad !== undefined ||
      dto.fechaSiembra !== undefined;
    const traeCosecha =
      dto.haCosechadas !== undefined ||
      dto.toneladas !== undefined ||
      dto.fechaCosecha !== undefined;

    if (!traeSiembra && !traeCosecha) {
      throw new BadRequestException('Envía los datos de siembra o de cosecha.');
    }

    let existente = await this.datos.obtenerRegistroCosecha(campanaId);
    const hoy = new Date();

    if (traeSiembra) {
      const datosSiembra = {
        haSembradas: dto.haSembradas ?? existente?.haSembradas ?? 0,
        variedad:
          dto.variedad !== undefined
            ? dto.variedad?.trim() || null
            : (existente?.variedad ?? null),
        fechaSiembra:
          dto.fechaSiembra !== undefined
            ? dto.fechaSiembra
              ? aDia(dto.fechaSiembra)
              : null
            : (existente?.fechaSiembra ?? null),
      };
      const errorSiembra = errorDatosSiembra(datosSiembra, existente, hoy);
      if (errorSiembra) throw new BadRequestException(errorSiembra);
      existente = await this.datos.guardarSiembra(campanaId, datosSiembra);
    }

    if (traeCosecha) {
      const haCosechadas = dto.haCosechadas ?? existente?.haCosechadas;
      const toneladas = dto.toneladas ?? existente?.toneladas;
      const fechaCosecha = dto.fechaCosecha
        ? aDia(dto.fechaCosecha)
        : (existente?.fechaCosecha ?? null);

      if (
        haCosechadas === undefined ||
        haCosechadas === null ||
        toneladas === undefined ||
        toneladas === null ||
        !fechaCosecha
      ) {
        throw new BadRequestException(
          'Completa las hectáreas cosechadas, las toneladas y la fecha de cosecha.',
        );
      }
      const datosCosecha = { haCosechadas, toneladas, fechaCosecha };
      const errorCosecha = errorDatosCosecha(datosCosecha, existente, hoy);
      if (errorCosecha) throw new BadRequestException(errorCosecha);
      existente = await this.datos.guardarCosecha(campanaId, datosCosecha);

      if (this.entrenamiento && this.datos.cultivoDeCampana) {
        const cultivoId = await this.datos.cultivoDeCampana(campanaId);
        if (cultivoId) {
          await this.entrenamiento.entrenarAlCerrarCampana(cultivoId);
          this.cacheModelo = null;
        }
      }
    }

    return existente as RegistroCosechaCampana;
  }

  async analizarImpacto(consulta: ImpactoQueryDto): Promise<ResultadoImpacto> {
    const contexto = await this.datos.contextoEstimacion(
      consulta.lote,
      consulta.campana,
    );
    if (!contexto) {
      throw new NotFoundException('No existe esa campaña para ese lote.');
    }

    const base = await this.lineaBase.estimar(contexto);
    let version = await this.modelos.vigente(contexto.cultivoId, contexto.origen);
    if (!version && contexto.origen === 'real') {
      version = await this.modelos.vigente(
        contexto.cultivoId,
        'demo_enmascarado',
      );
    }

    let predecir: ((X: number[][]) => number[]) | null = null;
    if (version && this.regresor) {
      if (this.cacheModelo?.id !== version.id) {
        this.cacheModelo = {
          id: version.id,
          instancia: this.regresor.cargar(version.modelo),
        };
      }
      const instancia = this.cacheModelo.instancia;
      predecir = (X) => instancia.predecir(X);
    }

    const origenEfectivo: OrigenDatos =
      version?.origenDatos === 'demo_enmascarado' ||
      contexto.origen === 'demo_enmascarado'
        ? 'demo_enmascarado'
        : 'real';

    return calcularImpactoPrediccion({
      tipoActividad: consulta.tipoActividad,
      haSembradas:
        consulta.haSembradas !== undefined
          ? consulta.haSembradas
          : (contexto.siembra?.haSembradas ?? null),
      fechaSiembra:
        consulta.fechaSiembra === ''
          ? null
          : consulta.fechaSiembra
            ? aDia(consulta.fechaSiembra)
            : (contexto.siembra?.fechaSiembra ?? null),
      variedad:
        consulta.variedad !== undefined
          ? consulta.variedad
          : (contexto.siembra?.variedad ?? null),
      inicioCampana: contexto.inicioCampana,
      lineaBase_t_ha: base?.valor_t_ha ?? null,
      origenDatos: origenEfectivo,
      etiquetaDatos: origenEfectivo === 'demo_enmascarado' ? ETIQUETA_DEMO : null,
      versionModelo: version ? `v${version.version}` : null,
      codificador: version?.codificador ?? null,
      predecir,
      haReferencia:
        contexto.siembra?.haSembradas ?? contexto.hectareasParcela ?? null,
    });
  }
}
