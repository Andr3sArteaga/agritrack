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

export interface FotoParcelaItem {
  id: string;
  parcelaId: string;
  imagenData: string;
  descripcion: string | null;
  visibleEnPreventa: boolean;
  subidaPorId: string;
  createdAt: Date;
}

export interface CrearFotoParcelaData {
  parcelaId: string;
  imagenData: string;
  descripcion?: string | null;
  visibleEnPreventa: boolean;
  subidaPorId: string;
}

export interface ActualizarFotoParcelaData {
  descripcion?: string | null;
  visibleEnPreventa?: boolean;
}

export interface ParcelaRepository {
  findAll(): Promise<ParcelaEntity[]>;
  findById(id: string): Promise<ParcelaEntity | null>;
  create(data: CrearParcelaData): Promise<ParcelaEntity>;
  update(id: string, data: ActualizarParcelaData): Promise<ParcelaEntity>;
  listarFotos(parcelaId: string, soloPreventa?: boolean): Promise<FotoParcelaItem[]>;
  buscarFotoPorId(fotoId: string): Promise<FotoParcelaItem | null>;
  crearFoto(data: CrearFotoParcelaData): Promise<FotoParcelaItem>;
  actualizarFoto(fotoId: string, data: ActualizarFotoParcelaData): Promise<FotoParcelaItem>;
  eliminarFoto(fotoId: string): Promise<void>;
}
