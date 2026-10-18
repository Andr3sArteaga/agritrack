import { TipoInsumo } from '../../../../generated/prisma/enums';
import { InsumoEntity } from '../entities/insumo.entity';
import { PrecioInsumoEntity } from '../entities/precio-insumo.entity';

export const INSUMO_REPOSITORY = Symbol('INSUMO_REPOSITORY');

export interface FiltrosInsumo {
  tipo?: TipoInsumo;
  soloActivos?: boolean;
}

export interface CrearInsumoData {
  nombre: string;
  tipo: TipoInsumo;
  unidad: string;
  precioInicial: number;
  vigenteDesde: Date;
}

export interface ActualizarInsumoData {
  nombre?: string;
  tipo?: TipoInsumo;
  unidad?: string;
  activo?: boolean;
}

export interface InsumoRepository {
  findAll(filtros?: FiltrosInsumo): Promise<InsumoEntity[]>;
  findById(id: string): Promise<InsumoEntity | null>;
  findByNombre(nombre: string): Promise<InsumoEntity | null>;
  create(data: CrearInsumoData): Promise<InsumoEntity>;
  update(id: string, data: ActualizarInsumoData): Promise<InsumoEntity>;
  findPrecios(insumoId: string): Promise<PrecioInsumoEntity[]>;
  findPrecioVigente(
    insumoId: string,
    fecha: Date,
  ): Promise<PrecioInsumoEntity | null>;
  agregarPrecio(
    insumoId: string,
    precio: number,
    vigenteDesde: Date,
  ): Promise<PrecioInsumoEntity>;
}
