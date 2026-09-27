import { Module } from '@nestjs/common';
import { ActividadesModule } from '../actividades/actividades.module';
import { CampanasModule } from '../campanas/campanas.module';
import { CultivosModule } from '../cultivos/cultivos.module';
import { IntegridadModule } from '../integridad/integridad.module';
import { ParcelasModule } from '../parcelas/parcelas.module';
import { PrediccionModule } from '../prediccion/prediccion.module';
import { ReportesModule } from '../reportes/reportes.module';
import { PublicService } from './application/public.service';
import { PublicController } from './presentation/public.controller';

@Module({
  imports: [
    ParcelasModule,
    CampanasModule,
    CultivosModule,
    ActividadesModule,
    PrediccionModule,
    IntegridadModule,
    ReportesModule,
  ],
  controllers: [PublicController],
  providers: [PublicService],
})
export class PublicModule {}
