import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import type {
  Codificador,
  EstadoModelo,
  MetricasModelo,
  ModeloIa,
  ModeloIaConPesos,
  NuevoModeloIa,
  OrigenDatos,
} from '../domain/modelo-rendimiento';
import type { ModeloIaRepository } from '../domain/repositories/modelo-ia.repository';

/** Columnas sin el modelo serializado. */
const SIN_PESOS = {
  id: true,
  cultivoId: true,
  version: true,
  origenDatos: true,
  campanasUsadas: true,
  hashDatos: true,
  predictores: true,
  categoriasVariedad: true,
  medianaDiasSiembra: true,
  metricas: true,
  estado: true,
  createdAt: true,
} as const;

type FilaSinPesos = Prisma.ModeloIaGetPayload<{ select: typeof SIN_PESOS }>;

const aJson = (valor: unknown): Prisma.InputJsonValue =>
  valor as Prisma.InputJsonValue;

@Injectable()
export class ModeloIaPrismaRepository implements ModeloIaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async crearVersion(datos: NuevoModeloIa): Promise<ModeloIa> {
    const fila = await this.prisma.$transaction(async (tx) => {
      const ultimo = await tx.modeloIa.aggregate({
        where: { cultivoId: datos.cultivoId },
        _max: { version: true },
      });
      if (datos.estado === 'activo') {
        await tx.modeloIa.updateMany({
          where: { cultivoId: datos.cultivoId, estado: 'activo' },
          data: { estado: 'archivado' },
        });
      }
      return tx.modeloIa.create({
        data: {
          cultivoId: datos.cultivoId,
          version: (ultimo._max.version ?? 0) + 1,
          origenDatos: datos.origenDatos,
          campanasUsadas: datos.campanasUsadas,
          hashDatos: datos.hashDatos,
          predictores: datos.codificador.columnas,
          categoriasVariedad: datos.codificador.categoriasVariedad,
          medianaDiasSiembra: datos.codificador.medianaDiasSiembra,
          metricas: aJson(datos.metricas),
          modelo: aJson(datos.modelo),
          estado: datos.estado,
        },
        select: SIN_PESOS,
      });
    });
    return this.aDominio(fila);
  }

  async listar(cultivoId?: string): Promise<ModeloIa[]> {
    const filas = await this.prisma.modeloIa.findMany({
      where: cultivoId ? { cultivoId } : {},
      select: SIN_PESOS,
      orderBy: [{ cultivoId: 'asc' }, { version: 'desc' }],
    });
    return filas.map((fila) => this.aDominio(fila));
  }

  async vigente(
    cultivoId: string,
    origen: OrigenDatos,
  ): Promise<ModeloIaConPesos | null> {
    const fila =
      (await this.prisma.modeloIa.findFirst({
        where: { cultivoId, origenDatos: origen, estado: 'activo' },
        orderBy: { version: 'desc' },
      })) ??
      (await this.prisma.modeloIa.findFirst({
        where: { cultivoId, origenDatos: origen, estado: 'experimental' },
        orderBy: { version: 'desc' },
      }));
    return fila ? { ...this.aDominio(fila), modelo: fila.modelo } : null;
  }

  private aDominio(fila: FilaSinPesos): ModeloIa {
    const columnas = fila.predictores as string[];
    const codificador: Codificador = {
      columnas,
      categoriasVariedad: fila.categoriasVariedad as string[],
      medianaDiasSiembra: fila.medianaDiasSiembra,
      usaLag: columnas.includes('lag_1'),
    };
    return {
      id: fila.id,
      cultivoId: fila.cultivoId,
      version: fila.version,
      origenDatos: fila.origenDatos as OrigenDatos,
      campanasUsadas: fila.campanasUsadas as string[],
      hashDatos: fila.hashDatos,
      codificador,
      metricas: fila.metricas as unknown as MetricasModelo,
      estado: fila.estado as EstadoModelo,
      createdAt: fila.createdAt,
    };
  }
}
