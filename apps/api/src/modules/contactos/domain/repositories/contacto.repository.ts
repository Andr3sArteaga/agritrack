import { TipoContacto } from '../../../../generated/prisma/enums';
import { ContactoEntity } from '../entities/contacto.entity';

export const CONTACTO_REPOSITORY = Symbol('CONTACTO_REPOSITORY');

export interface FiltrosContacto {
  tipo?: TipoContacto;
  search?: string;
}

export interface CrearContactoData {
  tipo: TipoContacto;
  nombre: string;
  empresa?: string | null;
  telefono?: string | null;
  email?: string | null;
  notas?: string | null;
}

export interface ActualizarContactoData {
  tipo?: TipoContacto;
  nombre?: string;
  empresa?: string | null;
  telefono?: string | null;
  email?: string | null;
  notas?: string | null;
}

export interface ContactoRepository {
  findAll(filtros?: FiltrosContacto): Promise<ContactoEntity[]>;
  findById(id: string): Promise<ContactoEntity | null>;
  create(data: CrearContactoData): Promise<ContactoEntity>;
  update(id: string, data: ActualizarContactoData): Promise<ContactoEntity>;
}
