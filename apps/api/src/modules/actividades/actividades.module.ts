import { Module } from '@nestjs/common';
import { CampanasModule } from '../campanas/campanas.module';
import { ACTIVIDAD_REPOSITORY } from './domain/repositories/actividad.repository';
import { ActividadPrismaRepository } from './infrastructure/actividad.prisma.repository';
import { ActividadesService } from './application/actividades.service';
import { ActividadesController } from './presentation/actividades.controller';

@Module({
  imports: [CampanasModule],
  controllers: [ActividadesController],
  providers: [
    ActividadesService,
    { provide: ACTIVIDAD_REPOSITORY, useClass: ActividadPrismaRepository },
  ],
  exports: [ActividadesService, ACTIVIDAD_REPOSITORY],
})
export class ActividadesModule {}
