import { Injectable } from '@nestjs/common';
import type { Campana as CampanaModel } from '../../../generated/prisma/client';
import { EstadoCampana } from '../../../generated/prisma/enums';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { CampanaEntity } from '../domain/entities/campana.entity';
import {
  ActualizarCampanaData,
  CampanaRepository,
  CrearCampanaData,
} from '../domain/repositories/campana.repository';

@Injectable()
export class CampanaPrismaRepository implements CampanaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(parcelaId?: string): Promise<CampanaEntity[]> {
    const campanas = await this.prisma.campana.findMany({
      where: parcelaId ? { parcelaId } : undefined,
      orderBy: { fechaInicio: 'desc' },
    });
    return campanas.map((campana) => this.toEntity(campana));
  }

  async findById(id: string): Promise<CampanaEntity | null> {
    const campana = await this.prisma.campana.findUnique({ where: { id } });
    return campana ? this.toEntity(campana) : null;
  }

  async findEnCursoByParcela(
    parcelaId: string,
    excludeId?: string,
  ): Promise<CampanaEntity | null> {
    const campana = await this.prisma.campana.findFirst({
      where: {
        parcelaId,
        estado: EstadoCampana.EN_CURSO,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
    return campana ? this.toEntity(campana) : null;
  }

  async findProximaPlanificada(
    parcelaId: string,
  ): Promise<CampanaEntity | null> {
    const campana = await this.prisma.campana.findFirst({
      where: { parcelaId, estado: EstadoCampana.PLANIFICADA },
      orderBy: { fechaInicio: 'asc' },
    });
    return campana ? this.toEntity(campana) : null;
  }

  async create(data: CrearCampanaData): Promise<CampanaEntity> {
    const campana = await this.prisma.campana.create({ data });
    return this.toEntity(campana);
  }

  async update(
    id: string,
    data: ActualizarCampanaData,
  ): Promise<CampanaEntity> {
    const campana = await this.prisma.campana.update({ where: { id }, data });
    return this.toEntity(campana);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.campana.delete({ where: { id } });
  }

  async countActividades(id: string): Promise<number> {
    return this.prisma.actividad.count({ where: { campanaId: id } });
  }

  private toEntity(campana: CampanaModel): CampanaEntity {
    return new CampanaEntity(
      campana.id,
      campana.parcelaId,
      campana.cultivoId,
      campana.temporada,
      campana.fechaInicio,
      campana.fechaFin,
      campana.estado,
      campana.createdAt,
      campana.updatedAt,
    );
  }
}
