import { TipoActividad } from '../../../../generated/prisma/enums';
import { ActividadEntity } from '../entities/actividad.entity';

export const ACTIVIDAD_REPOSITORY = Symbol('ACTIVIDAD_REPOSITORY');

export interface CrearActividadData {
  campanaId: string;
  tipo: TipoActividad;
  fecha: Date;
  descripcion: string;
  insumo: string | null;
  cantidad: number | null;
  unidad: string | null;
  responsableId: string;
  tercerizado: boolean;
  maquinariaUtilizada: string | null;
  rendimientoTnHa: number | null;
  correccionDeId: string | null;
  motivoCorreccion: string | null;
}

export interface ActividadRepository {
  findAll(campanaId?: string): Promise<ActividadEntity[]>;
  findById(id: string): Promise<ActividadEntity | null>;
  findTodasOrdenadas(): Promise<ActividadEntity[]>;
  findPorParcela(parcelaId: string): Promise<ActividadEntity[]>;
  crearConIntegridad(data: CrearActividadData): Promise<ActividadEntity>;
}
