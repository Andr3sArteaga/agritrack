import { EstadoCampana } from '../../../../generated/prisma/enums';
import { CampanaEntity } from '../entities/campana.entity';

export const CAMPANA_REPOSITORY = Symbol('CAMPANA_REPOSITORY');

export interface CrearCampanaData {
  parcelaId: string;
  cultivoId: string;
  temporada: string;
  fechaInicio: Date;
  fechaFin?: Date | null;
  estado?: EstadoCampana;
}

export interface ActualizarCampanaData {
  temporada?: string;
  fechaInicio?: Date;
  fechaFin?: Date | null;
  estado?: EstadoCampana;
}

export interface CampanaRepository {
  findAll(parcelaId?: string): Promise<CampanaEntity[]>;
  findById(id: string): Promise<CampanaEntity | null>;
  findEnCursoByParcela(
    parcelaId: string,
    excludeId?: string,
  ): Promise<CampanaEntity | null>;
  findProximaPlanificada(parcelaId: string): Promise<CampanaEntity | null>;
  create(data: CrearCampanaData): Promise<CampanaEntity>;
  update(id: string, data: ActualizarCampanaData): Promise<CampanaEntity>;
  delete(id: string): Promise<void>;
  countActividades(id: string): Promise<number>;
}
