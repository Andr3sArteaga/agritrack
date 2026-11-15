import { Injectable } from '@nestjs/common';
import type {
  Insumo as InsumoModel,
  PrecioInsumo as PrecioInsumoModel,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { InsumoEntity } from '../domain/entities/insumo.entity';
import { PrecioInsumoEntity } from '../domain/entities/precio-insumo.entity';
import {
  ActualizarInsumoData,
  CrearInsumoData,
  FiltrosInsumo,
  InsumoRepository,
} from '../domain/repositories/insumo.repository';

type InsumoConPrecioVigente = InsumoModel & { precios: PrecioInsumoModel[] };

const ORDEN_PRECIOS_RECIENTES = [
  { vigenteDesde: 'desc' as const },
  { createdAt: 'desc' as const },
];

@Injectable()
export class InsumoPrismaRepository implements InsumoRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filtros?: FiltrosInsumo): Promise<InsumoEntity[]> {
    const insumos = await this.prisma.insumo.findMany({
      where: {
        tipo: filtros?.tipo,
        ...(filtros?.soloActivos ? { activo: true } : {}),
      },
      include: this.incluirPrecioVigente(),
      orderBy: { nombre: 'asc' },
    });
    return insumos.map((insumo) => this.toEntity(insumo));
  }

  async findById(id: string): Promise<InsumoEntity | null> {
    const insumo = await this.prisma.insumo.findUnique({
      where: { id },
      include: this.incluirPrecioVigente(),
    });
    return insumo ? this.toEntity(insumo) : null;
  }

  async findByNombre(nombre: string): Promise<InsumoEntity | null> {
    const insumo = await this.prisma.insumo.findUnique({
      where: { nombre },
      include: this.incluirPrecioVigente(),
    });
    return insumo ? this.toEntity(insumo) : null;
  }

  async create(data: CrearInsumoData): Promise<InsumoEntity> {
    const insumo = await this.prisma.insumo.create({
      data: {
        nombre: data.nombre,
        tipo: data.tipo,
        unidad: data.unidad,
        precios: {
          create: {
            precio: data.precioInicial,
            vigenteDesde: data.vigenteDesde,
          },
        },
      },
      include: this.incluirPrecioVigente(),
    });
    return this.toEntity(insumo);
  }

  async update(id: string, data: ActualizarInsumoData): Promise<InsumoEntity> {
    const insumo = await this.prisma.insumo.update({
      where: { id },
      data,
      include: this.incluirPrecioVigente(),
    });
    return this.toEntity(insumo);
  }

  async findPrecios(insumoId: string): Promise<PrecioInsumoEntity[]> {
    const precios = await this.prisma.precioInsumo.findMany({
      where: { insumoId },
      orderBy: ORDEN_PRECIOS_RECIENTES,
    });
    return precios.map((precio) => this.toPrecioEntity(precio));
  }

  async findPrecioVigente(
    insumoId: string,
    fecha: Date,
  ): Promise<PrecioInsumoEntity | null> {
    const precio = await this.prisma.precioInsumo.findFirst({
      where: { insumoId, vigenteDesde: { lte: fecha } },
      orderBy: ORDEN_PRECIOS_RECIENTES,
    });
    return precio ? this.toPrecioEntity(precio) : null;
  }

  async agregarPrecio(
    insumoId: string,
    precio: number,
    vigenteDesde: Date,
  ): Promise<PrecioInsumoEntity> {
    const creado = await this.prisma.precioInsumo.create({
      data: { insumoId, precio, vigenteDesde },
    });
    return this.toPrecioEntity(creado);
  }

  // El precio vigente es el ultimo cuya vigencia ya comenzo (no los futuros).
  private incluirPrecioVigente() {
    return {
      precios: {
        where: { vigenteDesde: { lte: new Date() } },
        orderBy: ORDEN_PRECIOS_RECIENTES,
        take: 1,
      },
    };
  }

  private toEntity(insumo: InsumoConPrecioVigente): InsumoEntity {
    const vigente = insumo.precios[0];
    return new InsumoEntity(
      insumo.id,
      insumo.nombre,
      insumo.tipo,
      insumo.unidad,
      insumo.activo,
      vigente?.precio ?? null,
      vigente?.vigenteDesde ?? null,
      insumo.createdAt,
      insumo.updatedAt,
    );
  }

  private toPrecioEntity(precio: PrecioInsumoModel): PrecioInsumoEntity {
    return new PrecioInsumoEntity(
      precio.id,
      precio.insumoId,
      precio.precio,
      precio.vigenteDesde,
      precio.createdAt,
    );
  }
}
