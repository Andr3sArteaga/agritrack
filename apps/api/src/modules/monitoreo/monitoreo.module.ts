import { Module } from '@nestjs/common';
import { ParcelasModule } from '../parcelas/parcelas.module';
import { MonitoreoService } from './application/monitoreo.service';
import { MONITOREO_REPOSITORY } from './domain/repositories/monitoreo.repository';
import { MonitoreoPrismaRepository } from './infrastructure/monitoreo.prisma.repository';
import { MonitoreoController } from './presentation/monitoreo.controller';

/** Suelo y clima de la parcela, cargados a mano. */
@Module({
  imports: [ParcelasModule],
  controllers: [MonitoreoController],
  providers: [
    MonitoreoService,
    { provide: MONITOREO_REPOSITORY, useClass: MonitoreoPrismaRepository },
  ],
})
export class MonitoreoModule {}
