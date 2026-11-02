import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TipoActividad } from '../../../generated/prisma/enums';
import { calcularResumenCostos } from '../../costos/domain/rules/calcular-resumen-costos';
import { PrediccionService } from '../../prediccion/application/prediccion.service';
import {
  REPORTES_QUERY_PORT,
  type ReportesQueryPort,
} from '../domain/ports/reportes-query.port';
import { resolverPeriodo } from '../domain/rules/periodo-reporte';
import { HistoricoItemDto } from './dto/historico-item.dto';
import { ReporteCampanaQueryDto } from './dto/reporte-campana-query.dto';
import { ReporteCampanaDto } from './dto/reporte-campana.dto';
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

  /**
   * RF-42: reporte de una campana para el periodo consultado. Las actividades
   * y los gastos se filtran por el periodo; el presupuesto es el total de la
   * campana. La fecha de generacion es el momento de la consulta.
   */
  async reporteCampana(
    campanaId: string,
    pedido: ReporteCampanaQueryDto,
  ): Promise<ReporteCampanaDto> {
    const campana = await this.reportesQuery.campanaParaReporte(campanaId);
    if (!campana) {
      throw new NotFoundException('Campana no encontrada');
    }

    const generadoEn = new Date();
    const periodo = resolverPeriodo(pedido, campana, generadoEn);
    if (periodo.desde > periodo.hasta) {
      throw new BadRequestException(
        'La fecha "desde" no puede ser posterior a la fecha "hasta"',
      );
    }

    const { actividades, gastos } =
      await this.reportesQuery.movimientosDelPeriodo(campanaId, {
        desde: periodo.desde,
        hastaExclusivo: periodo.hastaExclusivo,
      });

    // Las actividades vienen ordenadas por fecha: la ultima cosecha es la vigente.
    const cosecha =
      actividades
        .filter(
          (actividad) =>
            actividad.tipo === TipoActividad.COSECHA &&
            actividad.rendimientoTnHa !== null,
        )
        .at(-1) ?? null;

    const costos = calcularResumenCostos({
      gastos,
      presupuesto: campana.presupuestoTotal,
      hectareas: campana.parcela.hectareas,
      rendimientoTnHa: cosecha?.rendimientoTnHa ?? null,
    });

    return {
      periodo: {
        desde: periodo.desde,
        hasta: periodo.hasta,
        porDefecto: periodo.porDefecto,
      },
      generadoEn,
      campana: {
        id: campana.id,
        temporada: campana.temporada,
        estado: campana.estado,
        fechaInicio: campana.fechaInicio,
        fechaFin: campana.fechaFin,
      },
      parcela: campana.parcela,
      cultivo: campana.cultivo,
      actividades,
      cosecha: cosecha
        ? { rendimientoTnHa: cosecha.rendimientoTnHa as number, fecha: cosecha.fecha }
        : null,
      costos,
    };
  }
}
