import { Injectable } from '@nestjs/common';
import type { Gasto as GastoModel } from '../../../generated/prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { GastoEntity } from '../domain/entities/gasto.entity';
import {
  ActualizarGastoData,
  CrearGastoData,
  GastoRepository,
} from '../domain/repositories/gasto.repository';

@Injectable()
export class GastoPrismaRepository implements GastoRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByCampana(
    campanaId: string,
    incluirAnulados: boolean,
  ): Promise<GastoEntity[]> {
    const gastos = await this.prisma.gasto.findMany({
      where: { campanaId, ...(incluirAnulados ? {} : { anulado: false }) },
      orderBy: [{ fecha: 'desc' }, { createdAt: 'desc' }],
    });
    return gastos.map((gasto) => this.toEntity(gasto));
  }

  async findById(id: string): Promise<GastoEntity | null> {
    const gasto = await this.prisma.gasto.findUnique({ where: { id } });
    return gasto ? this.toEntity(gasto) : null;
  }

  async create(data: CrearGastoData): Promise<GastoEntity> {
    const gasto = await this.prisma.gasto.create({ data });
    return this.toEntity(gasto);
  }

  async update(id: string, data: ActualizarGastoData): Promise<GastoEntity> {
    const gasto = await this.prisma.gasto.update({ where: { id }, data });
    return this.toEntity(gasto);
  }

  async anular(
    id: string,
    motivo: string,
    anuladoEn: Date,
  ): Promise<GastoEntity> {
    const gasto = await this.prisma.gasto.update({
      where: { id },
      data: { anulado: true, motivoAnulacion: motivo, anuladoEn },
    });
    return this.toEntity(gasto);
  }

  private toEntity(gasto: GastoModel): GastoEntity {
    return new GastoEntity(
      gasto.id,
      gasto.campanaId,
      gasto.categoria,
      gasto.descripcion,
      gasto.monto,
      gasto.fecha,
      gasto.estado,
      gasto.insumoId,
      gasto.cantidad,
      gasto.precioUnitario,
      gasto.registradoPorId,
      gasto.anulado,
      gasto.motivoAnulacion,
      gasto.anuladoEn,
      gasto.createdAt,
      gasto.updatedAt,
    );
  }
}
