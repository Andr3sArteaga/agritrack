import { Module } from '@nestjs/common';
import { CultivosModule } from '../cultivos/cultivos.module';
import { ParcelasModule } from '../parcelas/parcelas.module';
import { PrediccionModule } from '../prediccion/prediccion.module';
import { CAMPANA_REPOSITORY } from './domain/repositories/campana.repository';
import { CampanaPrismaRepository } from './infrastructure/campana.prisma.repository';
import { CampanasService } from './application/campanas.service';
import { CampanasController } from './presentation/campanas.controller';

@Module({
  imports: [ParcelasModule, CultivosModule, PrediccionModule],
  controllers: [CampanasController],
  providers: [
    CampanasService,
    { provide: CAMPANA_REPOSITORY, useClass: CampanaPrismaRepository },
  ],
  exports: [CampanasService, CAMPANA_REPOSITORY],
})
export class CampanasModule {}
