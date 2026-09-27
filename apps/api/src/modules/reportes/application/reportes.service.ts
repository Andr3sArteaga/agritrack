import { Inject, Injectable } from '@nestjs/common';
import { PrediccionService } from '../../prediccion/application/prediccion.service';
import {
  REPORTES_QUERY_PORT,
  type ReportesQueryPort,
} from '../domain/ports/reportes-query.port';
import { HistoricoItemDto } from './dto/historico-item.dto';
import { ResumenDashboardDto } from './dto/resumen-dashboard.dto';

const LIMITE_PROXIMAS_COSECHAS = 5;

@Injectable()
export class ReportesService {
  constructor(
    @Inject(REPORTES_QUERY_PORT)
    private readonly reportesQuery: ReportesQueryPort,
    private readonly prediccionService: PrediccionService,
  ) {}

  historicoRendimiento(
    parcelaId?: string,
    cultivoId?: string,
  ): Promise<HistoricoItemDto[]> {
    return this.reportesQuery.historicoRendimiento({ parcelaId, cultivoId });
  }

  async resumenDashboard(): Promise<ResumenDashboardDto> {
    const [
      hectareasTotales,
      campanasEnCurso,
      proximasCosechas,
      ultimaCosecha,
      historicoRendimiento,
      proximaCampana,
    ] = await Promise.all([
      this.reportesQuery.hectareasTotalesActivas(),
      this.reportesQuery.contarCampanasEnCurso(),
      this.reportesQuery.proximasCosechas(LIMITE_PROXIMAS_COSECHAS),
      this.reportesQuery.ultimaCosecha(),
      this.reportesQuery.historicoRendimiento(),
      this.reportesQuery.proximaCampanaPlanificada(),
    ]);

    let prediccionProximaCampana: ResumenDashboardDto['prediccionProximaCampana'] =
      null;
    if (proximaCampana) {
      const prediccion = await this.prediccionService.predecir(
        proximaCampana.parcelaId,
        proximaCampana.cultivoId,
      );
      prediccionProximaCampana = {
        campanaId: proximaCampana.campanaId,
        parcelaNombre: proximaCampana.parcelaNombre,
        cultivoNombre: proximaCampana.cultivoNombre,
        temporada: proximaCampana.temporada,
        rendimientoEstimadoTnHa: prediccion.rendimientoEstimadoTnHa,
        campanasHistoricasUsadas: prediccion.campanasHistoricasUsadas,
      };
    }

    return {
      hectareasTotales,
      campanasEnCurso,
      proximasCosechas,
      ultimaCosecha,
      historicoRendimiento,
      prediccionProximaCampana,
    };
  }
}
