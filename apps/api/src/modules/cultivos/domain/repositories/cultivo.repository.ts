import { CultivoEntity } from '../entities/cultivo.entity';

export const CULTIVO_REPOSITORY = Symbol('CULTIVO_REPOSITORY');

export interface CrearCultivoData {
  nombre: string;
}

export interface CultivoRepository {
  findAll(): Promise<CultivoEntity[]>;
  findById(id: string): Promise<CultivoEntity | null>;
  findByNombre(nombre: string): Promise<CultivoEntity | null>;
  create(data: CrearCultivoData): Promise<CultivoEntity>;
}
