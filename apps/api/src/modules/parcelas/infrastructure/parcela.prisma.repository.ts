import { Injectable, NotFoundException } from '@nestjs/common';
import type { Parcela as ParcelaModel } from '../../../generated/prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { ParcelaEntity } from '../domain/entities/parcela.entity';
import {
  ActualizarParcelaData,
  CrearParcelaData,
  ParcelaRepository,
} from '../domain/repositories/parcela.repository';

@Injectable()
export class ParcelaPrismaRepository implements ParcelaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<ParcelaEntity[]> {
    const parcelas = await this.prisma.parcela.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return parcelas.map((parcela) => this.toEntity(parcela));
  }

  async findById(id: string): Promise<ParcelaEntity | null> {
    const parcela = await this.prisma.parcela.findUnique({ where: { id } });
    return parcela ? this.toEntity(parcela) : null;
  }

  async create(data: CrearParcelaData): Promise<ParcelaEntity> {
    const parcela = await this.prisma.parcela.create({ data });
    return this.toEntity(parcela);
  }

  async update(
    id: string,
    data: ActualizarParcelaData,
  ): Promise<ParcelaEntity> {
    try {
      const parcela = await this.prisma.parcela.update({
        where: { id },
        data,
      });
      return this.toEntity(parcela);
    } catch {
      throw new NotFoundException('Parcela no encontrada');
    }
  }

  private toEntity(parcela: ParcelaModel): ParcelaEntity {
    return new ParcelaEntity(
      parcela.id,
      parcela.nombre,
      parcela.hectareas,
      parcela.ubicacionTexto,
      parcela.lat,
      parcela.lng,
      parcela.disponibleParaPreventa,
      parcela.activa,
      parcela.createdAt,
      parcela.updatedAt,
    );
  }
}
