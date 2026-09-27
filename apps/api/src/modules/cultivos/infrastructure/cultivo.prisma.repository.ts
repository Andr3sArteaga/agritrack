import { Injectable } from '@nestjs/common';
import type { Cultivo as CultivoModel } from '../../../generated/prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { CultivoEntity } from '../domain/entities/cultivo.entity';
import {
  CrearCultivoData,
  CultivoRepository,
} from '../domain/repositories/cultivo.repository';

@Injectable()
export class CultivoPrismaRepository implements CultivoRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<CultivoEntity[]> {
    const cultivos = await this.prisma.cultivo.findMany({
      orderBy: { nombre: 'asc' },
    });
    return cultivos.map((cultivo) => this.toEntity(cultivo));
  }

  async findById(id: string): Promise<CultivoEntity | null> {
    const cultivo = await this.prisma.cultivo.findUnique({ where: { id } });
    return cultivo ? this.toEntity(cultivo) : null;
  }

  async findByNombre(nombre: string): Promise<CultivoEntity | null> {
    const cultivo = await this.prisma.cultivo.findUnique({
      where: { nombre },
    });
    return cultivo ? this.toEntity(cultivo) : null;
  }

  async create(data: CrearCultivoData): Promise<CultivoEntity> {
    const cultivo = await this.prisma.cultivo.create({ data });
    return this.toEntity(cultivo);
  }

  private toEntity(cultivo: CultivoModel): CultivoEntity {
    return new CultivoEntity(
      cultivo.id,
      cultivo.nombre,
      cultivo.createdAt,
      cultivo.updatedAt,
    );
  }
}
