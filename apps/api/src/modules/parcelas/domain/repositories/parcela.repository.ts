import { ParcelaEntity, PoligonoGeoJson } from '../entities/parcela.entity';

export const PARCELA_REPOSITORY = Symbol('PARCELA_REPOSITORY');

export interface CrearParcelaData {
  nombre: string;
  hectareas: number;
  ubicacionTexto: string;
  lat?: number | null;
  lng?: number | null;
  disponibleParaPreventa?: boolean;
  poligono?: PoligonoGeoJson | null;
}

export interface ActualizarParcelaData {
  nombre?: string;
  hectareas?: number;
  ubicacionTexto?: string;
  lat?: number | null;
  lng?: number | null;
  disponibleParaPreventa?: boolean;
  activa?: boolean;
  poligono?: PoligonoGeoJson | null;
}

export interface ParcelaRepository {
  findAll(): Promise<ParcelaEntity[]>;
  findById(id: string): Promise<ParcelaEntity | null>;
  create(data: CrearParcelaData): Promise<ParcelaEntity>;
  update(id: string, data: ActualizarParcelaData): Promise<ParcelaEntity>;
}
