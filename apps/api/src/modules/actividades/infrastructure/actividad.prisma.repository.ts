import { Injectable } from '@nestjs/common';
import type { Actividad as ActividadModel } from '../../../generated/prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import {
  calcularHashSha256,
  canonicalizarActividad,
  LOCK_KEY_CADENA_ACTIVIDADES,
} from '../../../shared/integridad/canonicalizar-actividad';
import { ActividadEntity } from '../domain/entities/actividad.entity';
import {
  ActividadRepository,
  CrearActividadData,
} from '../domain/repositories/actividad.repository';

type ActividadConCorrecciones = ActividadModel & {
  correcciones: { id: string }[];
};

@Injectable()
export class ActividadPrismaRepository implements ActividadRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(campanaId?: string): Promise<ActividadEntity[]> {
    const actividades = await this.prisma.actividad.findMany({
      where: campanaId ? { campanaId } : undefined,
      include: { correcciones: { select: { id: true } } },
      orderBy: { secuencia: 'asc' },
    });
    return actividades.map((actividad) => this.toEntity(actividad));
  }

  async findById(id: string): Promise<ActividadEntity | null> {
    const actividad = await this.prisma.actividad.findUnique({
      where: { id },
      include: { correcciones: { select: { id: true } } },
    });
    return actividad ? this.toEntity(actividad) : null;
  }

  async findTodasOrdenadas(): Promise<ActividadEntity[]> {
    const actividades = await this.prisma.actividad.findMany({
      include: { correcciones: { select: { id: true } } },
      orderBy: { secuencia: 'asc' },
    });
    return actividades.map((actividad) => this.toEntity(actividad));
  }

  async findPorParcela(parcelaId: string): Promise<ActividadEntity[]> {
    const actividades = await this.prisma.actividad.findMany({
      where: { campana: { parcelaId } },
      include: { correcciones: { select: { id: true } } },
      orderBy: { secuencia: 'asc' },
    });
    return actividades.map((actividad) => this.toEntity(actividad));
  }

  async crearConIntegridad(
    data: CrearActividadData,
  ): Promise<ActividadEntity> {
    const creada = await this.prisma.$transaction(async (tx) => {
      // Serializa las inserciones para que dos actividades concurrentes
      // nunca calculen el hash a partir del mismo hashAnterior.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${LOCK_KEY_CADENA_ACTIVIDADES})`;

      const secuenciaRows = await tx.$queryRaw<{ secuencia: number }[]>`
        SELECT nextval(pg_get_serial_sequence('actividades', 'secuencia'))::int AS secuencia
      `;
      const secuencia = secuenciaRows[0].secuencia;

      const ultima = await tx.actividad.findFirst({
        orderBy: { secuencia: 'desc' },
        select: { hash: true },
      });
      const hashAnterior = ultima?.hash ?? null;

      const contenidoCanonico = canonicalizarActividad({
        secuencia,
        campanaId: data.campanaId,
        tipo: data.tipo,
        fecha: data.fecha,
        descripcion: data.descripcion,
        insumo: data.insumo,
        cantidad: data.cantidad,
        unidad: data.unidad,
        responsableId: data.responsableId,
        tercerizado: data.tercerizado,
        maquinariaUtilizada: data.maquinariaUtilizada,
        rendimientoTnHa: data.rendimientoTnHa,
        correccionDeId: data.correccionDeId,
        motivoCorreccion: data.motivoCorreccion,
        hashAnterior,
      });
      const hash = calcularHashSha256(contenidoCanonico);

      return tx.actividad.create({
        data: { ...data, secuencia, hash, hashAnterior },
        include: { correcciones: { select: { id: true } } },
      });
    });

    return this.toEntity(creada);
  }

  private toEntity(actividad: ActividadConCorrecciones): ActividadEntity {
    return new ActividadEntity(
      actividad.id,
      actividad.secuencia,
      actividad.campanaId,
      actividad.tipo,
      actividad.fecha,
      actividad.descripcion,
      actividad.insumo,
      actividad.cantidad,
      actividad.unidad,
      actividad.responsableId,
      actividad.tercerizado,
      actividad.maquinariaUtilizada,
      actividad.rendimientoTnHa,
      actividad.correccionDeId,
      actividad.motivoCorreccion,
      actividad.hash,
      actividad.hashAnterior,
      actividad.createdAt,
      actividad.correcciones.length === 0,
    );
  }
}
