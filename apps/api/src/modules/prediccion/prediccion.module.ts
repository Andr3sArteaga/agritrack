import { Module } from '@nestjs/common';
import { EntrenamientoService } from './application/entrenamiento.service';
import { EstimacionService } from './application/estimacion.service';
import { PrediccionService } from './application/prediccion.service';
import {
  ESTIMADOR_LINEA_BASE,
  ESTIMADOR_MODELO,
} from './domain/ports/estimador-rendimiento.port';
import { PREDICTOR_PORT } from './domain/ports/predictor.port';
import { REGRESOR_PORT } from './domain/ports/regresor.port';
import { DATOS_RENDIMIENTO_REPOSITORY } from './domain/repositories/datos-rendimiento.repository';
import { MODELO_IA_REPOSITORY } from './domain/repositories/modelo-ia.repository';
import { DatosRendimientoPrismaRepository } from './infrastructure/datos-rendimiento.prisma.repository';
import { LineaBaseAdapter } from './infrastructure/linea-base.adapter';
import { ModeloIaPrismaRepository } from './infrastructure/modelo-ia.prisma.repository';
import { PromedioHistoricoPredictor } from './infrastructure/promedio-historico.predictor';
import { RandomForestAdapter } from './infrastructure/random-forest.adapter';
import { RandomForestRegresor } from './infrastructure/random-forest.regresor';
import { PrediccionController } from './presentation/prediccion.controller';

@Module({
  controllers: [PrediccionController],
  providers: [
    PrediccionService,
    EstimacionService,
    EntrenamientoService,
    // Puerto original (GET /prediccion): sin cambios.
    { provide: PREDICTOR_PORT, useClass: PromedioHistoricoPredictor },
    // Puerto ampliado: linea base (oficial) y Random Forest (experimental).
    { provide: ESTIMADOR_LINEA_BASE, useClass: LineaBaseAdapter },
    { provide: ESTIMADOR_MODELO, useClass: RandomForestAdapter },
    { provide: REGRESOR_PORT, useClass: RandomForestRegresor },
    {
      provide: DATOS_RENDIMIENTO_REPOSITORY,
      useClass: DatosRendimientoPrismaRepository,
    },
    { provide: MODELO_IA_REPOSITORY, useClass: ModeloIaPrismaRepository },
  ],
  exports: [PrediccionService, EntrenamientoService],
})
export class PrediccionModule {}
