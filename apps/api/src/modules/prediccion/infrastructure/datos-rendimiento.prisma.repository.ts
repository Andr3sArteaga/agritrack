import { Injectable } from '@nestjs/common';
import { EstadoCampana, TipoActividad } from '../../../generated/prisma/enums';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import type {
  ContextoEstimacion,
  DatosCosechaInput,
  DatosSiembraInput,
  OrigenDatos,
  PreparacionParcelaDev,
  RegistroCosechaCampana,
  RegistroLote,
  TemporadaCultivo,
} from '../domain/modelo-rendimiento';
import type { DatosRendimientoRepository } from '../domain/repositories/datos-rendimiento.repository';
import {
  obtenerPerfilCultivoDev,
  PLANTILLA_TEMPORADAS_DEV,
} from '../domain/rules/impacto-prediccion';

const ORIGEN_DEMO: OrigenDatos = 'demo_enmascarado';
const aOrigen = (valor: string): OrigenDatos =>
  valor === ORIGEN_DEMO ? ORIGEN_DEMO : 'real';
const redondear2 = (valor: number): number => Math.round(valor * 100) / 100;
const aDia = (texto: string): Date => new Date(`${texto}T00:00:00.000Z`);

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

  async prepararHistorialDev(
    parcelaId: string,
    cultivoId?: string,
  ): Promise<PreparacionParcelaDev | null> {
    const parcela = await this.prisma.parcela.findUnique({
      where: { id: parcelaId },
    });
    if (!parcela) return null;

    const campanasExistentes = await this.prisma.campana.findMany({
      where: { parcelaId },
      include: { actividades: { select: { tipo: true } } },
      orderBy: { fechaInicio: 'desc' },
    });

    const cultivo = await this.resolverCultivoDev(cultivoId, campanasExistentes);
    if (!cultivo) return null;

    const perfil = obtenerPerfilCultivoDev(cultivo.nombre);
    const haBase = Math.max(1, redondear2(parcela.hectareas));
    const porTemporada = new Map(
      campanasExistentes.map((campana) => [campana.temporada, campana]),
    );

    const faltantesCosecha: PreparacionParcelaDev['campanasSinActividadCosecha'] =
      [];

    for (const item of PLANTILLA_TEMPORADAS_DEV) {
      let campana = porTemporada.get(item.temporada);
      if (campana) {
        if (
          campana.cultivoId !== cultivo.id ||
          campana.estado !== EstadoCampana.COSECHADA
        ) {
          campana = await this.prisma.campana.update({
            where: { id: campana.id },
            data: { cultivoId: cultivo.id, estado: EstadoCampana.COSECHADA },
            include: { actividades: { select: { tipo: true } } },
          });
        }
      } else {
        campana = await this.prisma.campana.create({
          data: {
            parcelaId,
            cultivoId: cultivo.id,
            temporada: item.temporada,
            fechaInicio: aDia(item.fechaInicio),
            fechaFin: aDia(item.fechaFin),
            estado: EstadoCampana.COSECHADA,
          },
          include: { actividades: { select: { tipo: true } } },
        });
      }

      const ha =
        item.nivel === 'alto'
          ? haBase
          : item.nivel === 'medio'
            ? Math.max(1, redondear2(haBase * 0.9))
            : Math.max(1, redondear2(haBase * 0.75));
      const rinde = perfil.rendimientos[item.nivel];
      const toneladas = redondear2(ha * rinde);
      const variedad =
        item.nivel === 'alto'
          ? perfil.variedades.alta
          : item.nivel === 'medio'
            ? perfil.variedades.media
            : perfil.variedades.baja;

      await this.prisma.registroCosecha.upsert({
        where: { campanaId: campana.id },
        create: {
          campanaId: campana.id,
          haSembradas: ha,
          variedad,
          fechaSiembra: aDia(item.fechaSiembra),
          haCosechadas: ha,
          toneladas,
          fechaCosecha: aDia(item.fechaCosecha),
          origen: 'real',
        },
        update: {
          haSembradas: ha,
          variedad,
          fechaSiembra: aDia(item.fechaSiembra),
          haCosechadas: ha,
          toneladas,
          fechaCosecha: aDia(item.fechaCosecha),
          origen: 'real',
        },
      });

      const tieneCosecha = campana.actividades.some(
        (act) => act.tipo === TipoActividad.COSECHA,
      );
      if (!tieneCosecha) {
        faltantesCosecha.push({
          campanaId: campana.id,
          fechaSiembra: item.fechaSiembra,
          fechaCosecha: item.fechaCosecha,
          rendimientoTnHa: rinde,
        });
      }
    }

    const temporadasHistoricas = new Set(
      PLANTILLA_TEMPORADAS_DEV.map((t) => t.temporada),
    );
    const fechaCorte = aDia('2026-03-15');
    let campanaActual = campanasExistentes.find(
      (c) =>
        !temporadasHistoricas.has(c.temporada) &&
        (c.estado === EstadoCampana.EN_CURSO ||
          c.estado === EstadoCampana.PLANIFICADA ||
          c.temporada === 'Verano 2026' ||
          c.fechaInicio > fechaCorte),
    );

    if (campanaActual) {
      if (
        campanaActual.estado === EstadoCampana.PLANIFICADA ||
        campanaActual.cultivoId !== cultivo.id
      ) {
        campanaActual = await this.prisma.campana.update({
          where: { id: campanaActual.id },
          data: {
            cultivoId: cultivo.id,
            estado:
              campanaActual.estado === EstadoCampana.PLANIFICADA
                ? EstadoCampana.EN_CURSO
                : campanaActual.estado,
          },
          include: { actividades: { select: { tipo: true } } },
        });
      }
    } else {
      campanaActual = await this.prisma.campana.create({
        data: {
          parcelaId,
          cultivoId: cultivo.id,
          temporada: 'Verano 2026',
          fechaInicio: aDia('2026-06-01'),
          fechaFin: aDia('2026-12-01'),
          estado: EstadoCampana.EN_CURSO,
        },
        include: { actividades: { select: { tipo: true } } },
      });
    }

    const inicioActual = campanaActual.fechaInicio;
    const anioOct =
      inicioActual.getUTCMonth() >= 6
        ? inicioActual.getUTCFullYear()
        : inicioActual.getUTCFullYear() - 1;
    const fechaSiembraActual = `${anioOct}-10-15`;

    await this.prisma.registroCosecha.upsert({
      where: { campanaId: campanaActual.id },
      create: {
        campanaId: campanaActual.id,
        haSembradas: haBase,
        variedad: perfil.variedades.alta,
        fechaSiembra: aDia(fechaSiembraActual),
        origen: 'real',
      },
      update: {
        haSembradas: haBase,
        variedad: perfil.variedades.alta,
        fechaSiembra: aDia(fechaSiembraActual),
        origen: 'real',
      },
    });

    const tieneSiembraActual = campanaActual.actividades.some(
      (act) => act.tipo === TipoActividad.SIEMBRA,
    );

    return {
      parcelaId,
      cultivoId: cultivo.id,
      cultivoNombre: cultivo.nombre,
      campanaActualId: campanaActual.id,
      temporadaActual: campanaActual.temporada,
      campanasHabilitadas: PLANTILLA_TEMPORADAS_DEV.length,
      campanasSinActividadCosecha: faltantesCosecha.slice(-3),
      campanaActualNecesitaSiembra: tieneSiembraActual
        ? null
        : { campanaId: campanaActual.id, fechaSiembra: fechaSiembraActual },
    };
  }

  private async resolverCultivoDev(
    cultivoId: string | undefined,
    campanas: readonly { cultivoId: string; estado: EstadoCampana }[],
  ): Promise<{ id: string; nombre: string } | null> {
    if (cultivoId) {
      const elegido = await this.prisma.cultivo.findUnique({
        where: { id: cultivoId },
        select: { id: true, nombre: true },
      });
      if (elegido) return elegido;
    }

    const preferida =
      campanas.find((c) => c.estado === EstadoCampana.EN_CURSO) ?? campanas[0];
    if (preferida) {
      const deCampana = await this.prisma.cultivo.findUnique({
        where: { id: preferida.cultivoId },
        select: { id: true, nombre: true },
      });
      if (deCampana) return deCampana;
    }

    return (
      (await this.prisma.cultivo.findFirst({
        where: { nombre: 'Soya' },
        select: { id: true, nombre: true },
      })) ??
      this.prisma.cultivo.findFirst({
        orderBy: { nombre: 'asc' },
        select: { id: true, nombre: true },
      })
    );
  }
}
