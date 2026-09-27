import { Module } from '@nestjs/common';
import { PrediccionModule } from '../prediccion/prediccion.module';
import { REPORTES_QUERY_PORT } from './domain/ports/reportes-query.port';
import { ReportesPrismaQuery } from './infrastructure/reportes-prisma.query';
import { ReportesService } from './application/reportes.service';
import { ReportesController } from './presentation/reportes.controller';

@Module({
  imports: [PrediccionModule],
  controllers: [ReportesController],
  providers: [
    ReportesService,
    { provide: REPORTES_QUERY_PORT, useClass: ReportesPrismaQuery },
  ],
  exports: [ReportesService],
})
export class ReportesModule {}
