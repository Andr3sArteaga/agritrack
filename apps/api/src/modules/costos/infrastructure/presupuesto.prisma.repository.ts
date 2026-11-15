import { Injectable } from '@nestjs/common';
import type { Presupuesto as PresupuestoModel } from '../../../generated/prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { PresupuestoEntity } from '../domain/entities/presupuesto.entity';
import { PresupuestoRepository } from '../domain/repositories/presupuesto.repository';

@Injectable()
export class PresupuestoPrismaRepository implements PresupuestoRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByCampana(campanaId: string): Promise<PresupuestoEntity | null> {
    const presupuesto = await this.prisma.presupuesto.findUnique({
      where: { campanaId },
    });
    return presupuesto ? this.toEntity(presupuesto) : null;
  }

  async guardar(
    campanaId: string,
    montoTotal: number,
    notas: string | null,
  ): Promise<PresupuestoEntity> {
    const presupuesto = await this.prisma.presupuesto.upsert({
      where: { campanaId },
      create: { campanaId, montoTotal, notas },
      update: { montoTotal, notas },
    });
    return this.toEntity(presupuesto);
  }

  private toEntity(presupuesto: PresupuestoModel): PresupuestoEntity {
    return new PresupuestoEntity(
      presupuesto.id,
      presupuesto.campanaId,
      presupuesto.montoTotal,
      presupuesto.notas,
      presupuesto.createdAt,
      presupuesto.updatedAt,
    );
  }
}
