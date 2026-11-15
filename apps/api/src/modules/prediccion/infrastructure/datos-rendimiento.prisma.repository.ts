import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import type {
  ContextoEstimacion,
  OrigenDatos,
  RegistroLote,
  TemporadaCultivo,
} from '../domain/modelo-rendimiento';
import type { DatosRendimientoRepository } from '../domain/repositories/datos-rendimiento.repository';

const ORIGEN_DEMO: OrigenDatos = 'demo_enmascarado';
const aOrigen = (valor: string): OrigenDatos =>
  valor === ORIGEN_DEMO ? ORIGEN_DEMO : 'real';

@Injectable()
export class DatosRendimientoPrismaRepository
  implements DatosRendimientoRepository
{
  constructor(private readonly prisma: PrismaService) {}

  async origenesConDatos(cultivoId: string): Promise<OrigenDatos[]> {
    const grupos = await this.prisma.registroCosecha.groupBy({
      by: ['origen'],
      where: { campana: { cultivoId } },
    });
    return grupos.map((grupo) => aOrigen(grupo.origen));
  }

  async registros(cultivoId: string, origen: OrigenDatos): Promise<RegistroLote[]> {
    const filas = await this.prisma.registroCosecha.findMany({
      where: { origen, campana: { cultivoId } },
      include: { campana: { select: { parcelaId: true, temporada: true } } },
      orderBy: [{ campana: { fechaInicio: 'asc' } }, { campanaId: 'asc' }],
    });
    return filas.map((fila) => ({
      parcelaId: fila.campana.parcelaId,
      campanaId: fila.campanaId,
      temporada: fila.campana.temporada,
      variedad: fila.variedad,
      fechaSiembra: fila.fechaSiembra,
      haSembradas: fila.haSembradas,
      haCosechadas: fila.haCosechadas,
      toneladas: fila.toneladas,
    }));
  }

  async temporadas(
    cultivoId: string,
    origen: OrigenDatos,
  ): Promise<TemporadaCultivo[]> {
    const [grupos, totales] = await Promise.all([
      this.prisma.campana.groupBy({
        by: ['temporada'],
        where: { cultivoId, registroCosecha: { origen } },
        _min: { fechaInicio: true },
      }),
      this.prisma.totalCampana.findMany({ where: { cultivoId, origen } }),
    ]);
    const total = new Map(
      totales.map((t) => [t.temporada, t.rendimientoTotalTnHa]),
    );
    return grupos
      .map((grupo) => ({
        temporada: grupo.temporada,
        inicio: grupo._min.fechaInicio as Date,
        // undefined = sin total registrado (se calcula con la suma de los lotes).
        rendimientoTotal: total.get(grupo.temporada),
      }))
      .sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
  }

  async contextoEstimacion(
    parcelaId: string,
    campanaId: string,
  ): Promise<ContextoEstimacion | null> {
    const campana = await this.prisma.campana.findFirst({
      where: { id: campanaId, parcelaId },
      include: { registroCosecha: true },
    });
    if (!campana) return null;

    let origen: OrigenDatos = 'real';
    if (campana.registroCosecha) {
      origen = aOrigen(campana.registroCosecha.origen);
    } else {
      // Sin registro propio: el lote es de demostracion si sus otros registros lo son.
      const demo = await this.prisma.registroCosecha.findFirst({
        where: { origen: ORIGEN_DEMO, campana: { parcelaId } },
        select: { id: true },
      });
      if (demo) origen = ORIGEN_DEMO;
    }

    // El inicio de la temporada es el de su campaña mas temprana en el cultivo.
    const inicio = await this.prisma.campana.aggregate({
      where: { cultivoId: campana.cultivoId, temporada: campana.temporada },
      _min: { fechaInicio: true },
    });

    return {
      parcelaId,
      campanaId,
      cultivoId: campana.cultivoId,
      temporada: campana.temporada,
      inicioCampana: inicio._min.fechaInicio ?? campana.fechaInicio,
      origen,
      siembra: campana.registroCosecha
        ? {
            variedad: campana.registroCosecha.variedad,
            fechaSiembra: campana.registroCosecha.fechaSiembra,
            haSembradas: campana.registroCosecha.haSembradas,
          }
        : null,
    };
  }

  async parcelasDemo(): Promise<string[]> {
    const campanas = await this.prisma.campana.findMany({
      where: { registroCosecha: { origen: ORIGEN_DEMO } },
      select: { parcelaId: true },
      distinct: ['parcelaId'],
    });
    return campanas.map((campana) => campana.parcelaId);
  }
}
