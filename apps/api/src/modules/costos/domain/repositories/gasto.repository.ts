import {
  CategoriaGasto,
  EstadoGasto,
} from '../../../../generated/prisma/enums';
import { GastoEntity } from '../entities/gasto.entity';

export const GASTO_REPOSITORY = Symbol('GASTO_REPOSITORY');

export interface CrearGastoData {
  campanaId: string;
  categoria: CategoriaGasto;
  descripcion: string;
  monto: number;
  fecha: Date;
  estado: EstadoGasto;
  insumoId: string | null;
  cantidad: number | null;
  precioUnitario: number | null;
  registradoPorId: string;
}

export interface ActualizarGastoData {
  categoria?: CategoriaGasto;
  descripcion?: string;
  monto?: number;
  fecha?: Date;
  estado?: EstadoGasto;
}

export interface GastoRepository {
  findByCampana(
    campanaId: string,
    incluirAnulados: boolean,
  ): Promise<GastoEntity[]>;
  findById(id: string): Promise<GastoEntity | null>;
  create(data: CrearGastoData): Promise<GastoEntity>;
  update(id: string, data: ActualizarGastoData): Promise<GastoEntity>;
  anular(id: string, motivo: string, anuladoEn: Date): Promise<GastoEntity>;
}
