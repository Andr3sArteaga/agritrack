import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import type { Parcela as ParcelaModel } from '../../../generated/prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { ParcelaEntity, PoligonoGeoJson } from '../domain/entities/parcela.entity';
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
    const parcela = await this.prisma.parcela.create({
      data: { ...data, poligono: this.aJsonInput(data.poligono) },
    });
    return this.toEntity(parcela);
  }

  async update(
    id: string,
    data: ActualizarParcelaData,
  ): Promise<ParcelaEntity> {
    try {
      const parcela = await this.prisma.parcela.update({
        where: { id },
        data: { ...data, poligono: this.aJsonInput(data.poligono) },
      });
      return this.toEntity(parcela);
    } catch {
      throw new NotFoundException('Parcela no encontrada');
    }
  }

  // undefined = no tocar el campo; null = borrar el poligono (SQL NULL);
  // objeto = guardar el GeoJSON.
  private aJsonInput(
    poligono: PoligonoGeoJson | null | undefined,
  ): Prisma.InputJsonValue | typeof Prisma.DbNull | undefined {
    if (poligono === undefined) return undefined;
    if (poligono === null) return Prisma.DbNull;
    return poligono as unknown as Prisma.InputJsonValue;
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
      parcela.poligono as PoligonoGeoJson | null,
      parcela.createdAt,
      parcela.updatedAt,
    );
  }
}
