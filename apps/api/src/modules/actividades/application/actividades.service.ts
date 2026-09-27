import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  CAMPANA_REPOSITORY,
  type CampanaRepository,
} from '../../campanas/domain/repositories/campana.repository';
import {
  EstadoCampana,
  TipoActividad,
} from '../../../generated/prisma/enums';
import {
  ACTIVIDAD_REPOSITORY,
  type ActividadRepository,
} from '../domain/repositories/actividad.repository';
import { ActividadResponseDto } from './dto/actividad-response.dto';
import { CreateActividadDto } from './dto/create-actividad.dto';

@Injectable()
export class ActividadesService {
  constructor(
    @Inject(ACTIVIDAD_REPOSITORY)
    private readonly actividadRepository: ActividadRepository,
    @Inject(CAMPANA_REPOSITORY)
    private readonly campanaRepository: CampanaRepository,
  ) {}

  async findAllPorCampana(campanaId: string): Promise<ActividadResponseDto[]> {
    const campana = await this.campanaRepository.findById(campanaId);
    if (!campana) {
      throw new NotFoundException('Campana no encontrada');
    }
    const actividades = await this.actividadRepository.findAll(campanaId);
    return actividades.map((actividad) =>
      ActividadResponseDto.fromEntity(actividad),
    );
  }

  async findById(id: string): Promise<ActividadResponseDto> {
    const actividad = await this.actividadRepository.findById(id);
    if (!actividad) {
      throw new NotFoundException('Actividad no encontrada');
    }
    return ActividadResponseDto.fromEntity(actividad);
  }

  async crear(
    dto: CreateActividadDto,
    responsableId: string,
  ): Promise<ActividadResponseDto> {
    const campana = await this.campanaRepository.findById(dto.campanaId);
    if (!campana) {
      throw new NotFoundException('Campana no encontrada');
    }

    if (dto.correccionDeId) {
      const original = await this.actividadRepository.findById(
        dto.correccionDeId,
      );
      if (!original) {
        throw new NotFoundException('Actividad a corregir no encontrada');
      }
    }

    const actividad = await this.actividadRepository.crearConIntegridad({
      campanaId: dto.campanaId,
      tipo: dto.tipo,
      fecha: new Date(dto.fecha),
      descripcion: dto.descripcion,
      insumo: dto.insumo ?? null,
      cantidad: dto.cantidad ?? null,
      unidad: dto.unidad ?? null,
      responsableId,
      tercerizado: dto.tercerizado ?? false,
      maquinariaUtilizada: dto.maquinariaUtilizada ?? null,
      rendimientoTnHa: dto.rendimientoTnHa ?? null,
      correccionDeId: dto.correccionDeId ?? null,
      motivoCorreccion: dto.motivoCorreccion ?? null,
    });

    // Una cosecha nueva (no una correccion) marca la campana como COSECHADA.
    if (dto.tipo === TipoActividad.COSECHA && !dto.correccionDeId) {
      await this.campanaRepository.update(dto.campanaId, {
        estado: EstadoCampana.COSECHADA,
      });
    }

    return ActividadResponseDto.fromEntity(actividad);
  }
}
