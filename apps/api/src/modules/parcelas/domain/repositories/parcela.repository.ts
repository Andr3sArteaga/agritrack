import { ParcelaEntity } from '../entities/parcela.entity';

export const PARCELA_REPOSITORY = Symbol('PARCELA_REPOSITORY');

export interface CrearParcelaData {
  nombre: string;
  hectareas: number;
  ubicacionTexto: string;
  lat?: number | null;
  lng?: number | null;
  disponibleParaPreventa?: boolean;
}

export interface ActualizarParcelaData {
  nombre?: string;
  hectareas?: number;
  ubicacionTexto?: string;
  lat?: number | null;
  lng?: number | null;
  disponibleParaPreventa?: boolean;
  activa?: boolean;
}

export interface ParcelaRepository {
  findAll(): Promise<ParcelaEntity[]>;
  findById(id: string): Promise<ParcelaEntity | null>;
  create(data: CrearParcelaData): Promise<ParcelaEntity>;
  update(id: string, data: ActualizarParcelaData): Promise<ParcelaEntity>;
}
