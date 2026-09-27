import { Module } from '@nestjs/common';
import { PREDICTOR_PORT } from './domain/ports/predictor.port';
import { PromedioHistoricoPredictor } from './infrastructure/promedio-historico.predictor';
import { PrediccionService } from './application/prediccion.service';
import { PrediccionController } from './presentation/prediccion.controller';

@Module({
  controllers: [PrediccionController],
  providers: [
    PrediccionService,
    { provide: PREDICTOR_PORT, useClass: PromedioHistoricoPredictor },
  ],
  exports: [PrediccionService],
})
export class PrediccionModule {}
