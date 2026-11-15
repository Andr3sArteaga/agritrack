import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import type {
  ContextoEstimacion,
  DatosCosechaInput,
  DatosSiembraInput,
  OrigenDatos,
  RegistroCosechaCampana,
  RegistroLote,
  TemporadaCultivo,
} from '../domain/modelo-rendimiento';
import type { DatosRendimientoRepository } from '../domain/repositories/datos-rendimiento.repository';

const ORIGEN_DEMO: OrigenDatos = 'demo_enmascarado';
const aOrigen = (valor: string): OrigenDatos =>
  valor === ORIGEN_DEMO ? ORIGEN_DEMO : 'real';

const aRegistroCosecha = (fila: {
  id: string;
  campanaId: string;
  variedad: string | null;
  fechaSiembra: Date | null;
  haSembradas: number;
  fechaCosecha: Date | null;
  haCosechadas: number | null;
  toneladas: number | null;
  origen: string;
  updatedAt: Date;
}): RegistroCosechaCampana => ({
  id: fila.id,
  campanaId: fila.campanaId,
  variedad: fila.variedad,
  fechaSiembra: fila.fechaSiembra,
  haSembradas: fila.haSembradas,
  fechaCosecha: fila.fechaCosecha,
  haCosechadas: fila.haCosechadas,
  toneladas: fila.toneladas,
  origen: aOrigen(fila.origen),
  updatedAt: fila.updatedAt,
});

@Injectable()
export class DatosRendimientoPrismaRepository
  implements DatosRendimientoRepository
{
  constructor(private readonly prisma: PrismaService) {}

  async origenesConDatos(cultivoId: string): Promise<OrigenDatos[]> {
    const grupos = await this.prisma.registroCosecha.groupBy({
      by: ['origen'],
      where: {
        campana: { cultivoId },
        toneladas: { not: null },
        haCosechadas: { gt: 0 },
      },
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
      include: {
        registroCosecha: true,
        parcela: { select: { hectareas: true } },
      },
    });
    if (!campana) return null;

    let origen: OrigenDatos = 'real';
    if (campana.registroCosecha?.origen === ORIGEN_DEMO) {
      origen = ORIGEN_DEMO;
    } else {
      // Sin registro propio de demo: el lote es de demostracion si sus otros registros lo son.
      const demoParcela = await this.prisma.registroCosecha.findFirst({
        where: { origen: ORIGEN_DEMO, campana: { parcelaId } },
        select: { id: true },
      });
      if (demoParcela) {
        origen = ORIGEN_DEMO;
      } else {
        // Si el cultivo aun no tiene cosechas reales previas, se apoya en los Datos iniciales (V1) si existen.
        const [cosechaReal, demoCultivo] = await Promise.all([
          this.prisma.registroCosecha.findFirst({
            where: {
              origen: 'real',
              campana: {
                cultivoId: campana.cultivoId,
                fechaInicio: { lt: campana.fechaInicio },
              },
              toneladas: { not: null },
              haCosechadas: { gt: 0 },
            },
            select: { id: true },
          }),
          this.prisma.registroCosecha.findFirst({
            where: {
              origen: ORIGEN_DEMO,
              campana: { cultivoId: campana.cultivoId },
            },
            select: { id: true },
          }),
        ]);
        if (!cosechaReal && demoCultivo) {
          origen = ORIGEN_DEMO;
        }
      }
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
      hectareasParcela: campana.parcela.hectareas,
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

  async existeCampana(campanaId: string): Promise<boolean> {
    const campana = await this.prisma.campana.findUnique({
      where: { id: campanaId },
      select: { id: true },
    });
    return campana !== null;
  }

  async cultivoDeCampana(campanaId: string): Promise<string | null> {
    const campana = await this.prisma.campana.findUnique({
      where: { id: campanaId },
      select: { cultivoId: true },
    });
    return campana?.cultivoId ?? null;
  }

  async obtenerRegistroCosecha(
    campanaId: string,
  ): Promise<RegistroCosechaCampana | null> {
    const fila = await this.prisma.registroCosecha.findUnique({
      where: { campanaId },
    });
    return fila ? aRegistroCosecha(fila) : null;
  }

  async guardarSiembra(
    campanaId: string,
    datos: DatosSiembraInput,
  ): Promise<RegistroCosechaCampana> {
    const fila = await this.prisma.registroCosecha.upsert({
      where: { campanaId },
      create: {
        campanaId,
        haSembradas: datos.haSembradas,
        variedad: datos.variedad,
        fechaSiembra: datos.fechaSiembra,
        origen: 'real',
      },
      update: {
        haSembradas: datos.haSembradas,
        variedad: datos.variedad,
        fechaSiembra: datos.fechaSiembra,
        origen: 'real',
      },
    });
    return aRegistroCosecha(fila);
  }

  async guardarCosecha(
    campanaId: string,
    datos: DatosCosechaInput,
  ): Promise<RegistroCosechaCampana> {
    const fila = await this.prisma.registroCosecha.update({
      where: { campanaId },
      data: {
        haCosechadas: datos.haCosechadas,
        toneladas: datos.toneladas,
        fechaCosecha: datos.fechaCosecha,
        origen: 'real',
      },
    });
    return aRegistroCosecha(fila);
  }
}
