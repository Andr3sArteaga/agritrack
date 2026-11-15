import { Module } from '@nestjs/common';
import { CampanasModule } from '../campanas/campanas.module';
import { GastosService } from './application/gastos.service';
import { InsumosService } from './application/insumos.service';
import { PresupuestosService } from './application/presupuestos.service';
import { GASTO_REPOSITORY } from './domain/repositories/gasto.repository';
import { INSUMO_REPOSITORY } from './domain/repositories/insumo.repository';
import { PRESUPUESTO_REPOSITORY } from './domain/repositories/presupuesto.repository';
import { GastoPrismaRepository } from './infrastructure/gasto.prisma.repository';
import { InsumoPrismaRepository } from './infrastructure/insumo.prisma.repository';
import { PresupuestoPrismaRepository } from './infrastructure/presupuesto.prisma.repository';
import { GastosController } from './presentation/gastos.controller';
import { InsumosController } from './presentation/insumos.controller';
import { PresupuestosController } from './presentation/presupuestos.controller';

@Module({
  imports: [CampanasModule],
  controllers: [InsumosController, GastosController, PresupuestosController],
  providers: [
    InsumosService,
    GastosService,
    PresupuestosService,
    { provide: INSUMO_REPOSITORY, useClass: InsumoPrismaRepository },
    { provide: GASTO_REPOSITORY, useClass: GastoPrismaRepository },
    { provide: PRESUPUESTO_REPOSITORY, useClass: PresupuestoPrismaRepository },
  ],
  exports: [
    InsumosService,
    GastosService,
    PresupuestosService,
    INSUMO_REPOSITORY,
    GASTO_REPOSITORY,
    PRESUPUESTO_REPOSITORY,
  ],
})
export class CostosModule {}
