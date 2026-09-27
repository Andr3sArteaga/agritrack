import { Injectable } from '@nestjs/common';
import { TipoActividad, EstadoCampana } from '../../../generated/prisma/enums';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import {
  CampanaPlanificada,
  CosechaHistorica,
  FiltrosHistorico,
  ProximaCosecha,
  ReportesQueryPort,
} from '../domain/ports/reportes-query.port';

@Injectable()
export class ReportesPrismaQuery implements ReportesQueryPort {
  constructor(private readonly prisma: PrismaService) {}

  async historicoRendimiento(
    filtros?: FiltrosHistorico,
  ): Promise<CosechaHistorica[]> {
    const cosechas = await this.prisma.actividad.findMany({
      where: {
        tipo: TipoActividad.COSECHA,
        rendimientoTnHa: { not: null },
        correcciones: { none: {} },
        campana: {
          parcelaId: filtros?.parcelaId,
          cultivoId: filtros?.cultivoId,
        },
      },
      include: { campana: { include: { parcela: true, cultivo: true } } },
      orderBy: { fecha: 'asc' },
    });

    return cosechas.map((cosecha) => ({
      campanaId: cosecha.campanaId,
      parcelaId: cosecha.campana.parcelaId,
      parcelaNombre: cosecha.campana.parcela.nombre,
      cultivoId: cosecha.campana.cultivoId,
      cultivoNombre: cosecha.campana.cultivo.nombre,
      temporada: cosecha.campana.temporada,
      rendimientoTnHa: cosecha.rendimientoTnHa as number,
      fecha: cosecha.fecha,
    }));
  }

  async hectareasTotalesActivas(): Promise<number> {
    const resultado = await this.prisma.parcela.aggregate({
      where: { activa: true },
      _sum: { hectareas: true },
    });
    return resultado._sum.hectareas ?? 0;
  }

  async contarCampanasEnCurso(): Promise<number> {
    return this.prisma.campana.count({
      where: { estado: EstadoCampana.EN_CURSO },
    });
  }

  async proximasCosechas(limite: number): Promise<ProximaCosecha[]> {
    const campanas = await this.prisma.campana.findMany({
      where: { estado: EstadoCampana.EN_CURSO },
      include: { parcela: true, cultivo: true },
      orderBy: { fechaFin: 'asc' },
      take: limite,
    });
    return campanas.map((campana) => ({
      campanaId: campana.id,
      parcelaNombre: campana.parcela.nombre,
      cultivoNombre: campana.cultivo.nombre,
      fechaFin: campana.fechaFin,
    }));
  }

  async ultimaCosecha(): Promise<CosechaHistorica | null> {
    const cosecha = await this.prisma.actividad.findFirst({
      where: {
        tipo: TipoActividad.COSECHA,
        rendimientoTnHa: { not: null },
        correcciones: { none: {} },
      },
      include: { campana: { include: { parcela: true, cultivo: true } } },
      orderBy: { fecha: 'desc' },
    });
    if (!cosecha) {
      return null;
    }
    return {
      campanaId: cosecha.campanaId,
      parcelaId: cosecha.campana.parcelaId,
      parcelaNombre: cosecha.campana.parcela.nombre,
      cultivoId: cosecha.campana.cultivoId,
      cultivoNombre: cosecha.campana.cultivo.nombre,
      temporada: cosecha.campana.temporada,
      rendimientoTnHa: cosecha.rendimientoTnHa as number,
      fecha: cosecha.fecha,
    };
  }

  async proximaCampanaPlanificada(): Promise<CampanaPlanificada | null> {
    const campana = await this.prisma.campana.findFirst({
      where: { estado: EstadoCampana.PLANIFICADA },
      include: { parcela: true, cultivo: true },
      orderBy: { fechaInicio: 'asc' },
    });
    if (!campana) {
      return null;
    }
    return {
      campanaId: campana.id,
      parcelaId: campana.parcelaId,
      parcelaNombre: campana.parcela.nombre,
      cultivoId: campana.cultivoId,
      cultivoNombre: campana.cultivo.nombre,
      temporada: campana.temporada,
      fechaInicio: campana.fechaInicio,
    };
  }
}
