import { Injectable } from '@nestjs/common';
import { TipoActividad } from '../../../generated/prisma/enums';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import {
  PredictorPort,
  PrediccionResultado,
} from '../domain/ports/predictor.port';

/**
 * Linea base de prediccion: promedio historico de rendimiento t/ha de
 * cosechas vigentes (sin corregir). Si la parcela no tiene historial propio
 * con ese cultivo, usa el promedio del cultivo en todas las parcelas.
 * Implementa PredictorPort para poder reemplazarse luego por un modelo
 * Random Forest sin tocar a los consumidores (reportes, dashboard, publico).
 */
@Injectable()
export class PromedioHistoricoPredictor implements PredictorPort {
  constructor(private readonly prisma: PrismaService) {}

  async predecir(
    parcelaId: string,
    cultivoId: string,
  ): Promise<PrediccionResultado> {
    const propias = await this.obtenerCosechasVigentes(parcelaId, cultivoId);
    if (propias.length > 0) {
      return this.promediar(propias);
    }
    const delCultivo = await this.obtenerCosechasVigentes(undefined, cultivoId);
    return this.promediar(delCultivo);
  }

  private async obtenerCosechasVigentes(
    parcelaId: string | undefined,
    cultivoId: string,
  ): Promise<{ rendimientoTnHa: number | null }[]> {
    return this.prisma.actividad.findMany({
      where: {
        tipo: TipoActividad.COSECHA,
        rendimientoTnHa: { not: null },
        correcciones: { none: {} },
        campana: {
          cultivoId,
          ...(parcelaId ? { parcelaId } : {}),
        },
      },
      select: { rendimientoTnHa: true },
    });
  }

  private promediar(
    cosechas: { rendimientoTnHa: number | null }[],
  ): PrediccionResultado {
    if (cosechas.length === 0) {
      return { rendimientoEstimadoTnHa: null, campanasHistoricasUsadas: 0 };
    }
    const suma = cosechas.reduce(
      (acumulado, cosecha) => acumulado + (cosecha.rendimientoTnHa ?? 0),
      0,
    );
    return {
      rendimientoEstimadoTnHa:
        Math.round((suma / cosechas.length) * 100) / 100,
      campanasHistoricasUsadas: cosechas.length,
    };
  }
}
