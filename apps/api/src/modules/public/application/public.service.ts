import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ACTIVIDAD_REPOSITORY,
  type ActividadRepository,
} from '../../actividades/domain/repositories/actividad.repository';
import {
  CAMPANA_REPOSITORY,
  type CampanaRepository,
} from '../../campanas/domain/repositories/campana.repository';
import { CampanaEntity } from '../../campanas/domain/entities/campana.entity';
import {
  CULTIVO_REPOSITORY,
  type CultivoRepository,
} from '../../cultivos/domain/repositories/cultivo.repository';
import { IntegridadService } from '../../integridad/application/integridad.service';
import {
  PARCELA_REPOSITORY,
  type ParcelaRepository,
} from '../../parcelas/domain/repositories/parcela.repository';
import { ParcelaEntity } from '../../parcelas/domain/entities/parcela.entity';
import { PrediccionService } from '../../prediccion/application/prediccion.service';
import { ReportesService } from '../../reportes/application/reportes.service';
import { CatalogoParcelaDto } from './dto/catalogo-parcela.dto';
import { DetalleParcelaPublicoDto } from './dto/detalle-parcela-publico.dto';

@Injectable()
export class PublicService {
  constructor(
    @Inject(PARCELA_REPOSITORY)
    private readonly parcelaRepository: ParcelaRepository,
    @Inject(CAMPANA_REPOSITORY)
    private readonly campanaRepository: CampanaRepository,
    @Inject(CULTIVO_REPOSITORY)
    private readonly cultivoRepository: CultivoRepository,
    @Inject(ACTIVIDAD_REPOSITORY)
    private readonly actividadRepository: ActividadRepository,
    private readonly prediccionService: PrediccionService,
    private readonly integridadService: IntegridadService,
    private readonly reportesService: ReportesService,
    private readonly config: ConfigService,
  ) {}

  async listarCatalogo(): Promise<CatalogoParcelaDto[]> {
    const parcelas = (await this.parcelaRepository.findAll()).filter(
      (parcela) => parcela.activa && parcela.disponibleParaPreventa,
    );
    return Promise.all(parcelas.map((parcela) => this.armarTarjeta(parcela)));
  }

  async obtenerDetalle(parcelaId: string): Promise<DetalleParcelaPublicoDto> {
    const parcela = await this.parcelaRepository.findById(parcelaId);
    if (!parcela || !parcela.activa || !parcela.disponibleParaPreventa) {
      throw new NotFoundException('Parcela no disponible');
    }

    const campanaActual = await this.obtenerCampanaActual(parcelaId);

    let cultivoActual: string | null = null;
    let temporadaActual: string | null = null;
    let rendimientoEstimadoTnHa: number | null = null;
    let produccionEstimadaTotalTn: number | null = null;
    let historialCuidado: DetalleParcelaPublicoDto['historialCuidado'] = [];

    if (campanaActual) {
      const cultivo = await this.cultivoRepository.findById(
        campanaActual.cultivoId,
      );
      cultivoActual = cultivo?.nombre ?? null;
      temporadaActual = campanaActual.temporada;

      const prediccion = await this.prediccionService.predecir(
        parcelaId,
        campanaActual.cultivoId,
      );
      rendimientoEstimadoTnHa = prediccion.rendimientoEstimadoTnHa;
      produccionEstimadaTotalTn =
        prediccion.rendimientoEstimadoTnHa !== null
          ? this.redondear(
              prediccion.rendimientoEstimadoTnHa * parcela.hectareas,
            )
          : null;

      const actividades = await this.actividadRepository.findAll(
        campanaActual.id,
      );
      historialCuidado = actividades
        .filter((actividad) => actividad.vigente)
        .map((actividad) => ({
          tipo: actividad.tipo,
          fecha: actividad.fecha,
          descripcion: actividad.descripcion,
        }));
    }

    const historicoCompleto = await this.reportesService.historicoRendimiento(
      parcelaId,
    );
    const historicoAnterior = historicoCompleto
      .filter((item) => !campanaActual || item.campanaId !== campanaActual.id)
      .map((item) => ({
        temporada: item.temporada,
        rendimientoTnHa: item.rendimientoTnHa,
        fecha: item.fecha,
      }));

    const verificacion = await this.integridadService.verificarPorParcela(
      parcelaId,
    );

    return {
      id: parcela.id,
      nombre: parcela.nombre,
      hectareas: parcela.hectareas,
      ubicacionTexto: parcela.ubicacionTexto,
      poligono: parcela.poligono,
      cultivoActual,
      temporadaActual,
      rendimientoEstimadoTnHa,
      produccionEstimadaTotalTn,
      historialCuidado,
      historicoRendimiento: historicoAnterior,
      registrosVerificados: verificacion.valido,
      contacto: {
        nombre: this.config.get<string>('AGROAN_CONTACTO_NOMBRE') ?? null,
        telefono: this.config.get<string>('AGROAN_CONTACTO_TELEFONO') ?? null,
        email: this.config.get<string>('AGROAN_CONTACTO_EMAIL') ?? null,
      },
    };
  }

  private async armarTarjeta(
    parcela: ParcelaEntity,
  ): Promise<CatalogoParcelaDto> {
    const campanaActual = await this.obtenerCampanaActual(parcela.id);

    let cultivoActual: string | null = null;
    let produccionEstimadaTn: number | null = null;

    if (campanaActual) {
      const cultivo = await this.cultivoRepository.findById(
        campanaActual.cultivoId,
      );
      cultivoActual = cultivo?.nombre ?? null;

      const prediccion = await this.prediccionService.predecir(
        parcela.id,
        campanaActual.cultivoId,
      );
      produccionEstimadaTn =
        prediccion.rendimientoEstimadoTnHa !== null
          ? this.redondear(
              prediccion.rendimientoEstimadoTnHa * parcela.hectareas,
            )
          : null;
    }

    return {
      id: parcela.id,
      nombre: parcela.nombre,
      hectareas: parcela.hectareas,
      cultivoActual,
      produccionEstimadaTn,
    };
  }

  private async obtenerCampanaActual(
    parcelaId: string,
  ): Promise<CampanaEntity | null> {
    const enCurso = await this.campanaRepository.findEnCursoByParcela(
      parcelaId,
    );
    if (enCurso) {
      return enCurso;
    }
    return this.campanaRepository.findProximaPlanificada(parcelaId);
  }

  private redondear(valor: number): number {
    return Math.round(valor * 100) / 100;
  }
}
