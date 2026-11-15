export const MONITOREO_REPOSITORY = Symbol('MONITOREO_REPOSITORY');

export const CONDICIONES_CLIMA = [
  'SOLEADO',
  'NUBLADO',
  'LLUVIA_LIGERA',
  'LLUVIA_FUERTE',
  'HELADA',
  'GRANIZO',
  'VIENTO_FUERTE',
] as const;
export type CondicionClima = (typeof CONDICIONES_CLIMA)[number];

/** Valores de un analisis de suelo. pH 0-14; N, P y K en ppm (mg/kg); materia organica en %. */
export interface ValoresSuelo {
  ph: number | null;
  nitrogeno: number | null;
  fosforo: number | null;
  potasio: number | null;
  materiaOrganica: number | null;
  /** Humedad del suelo en %, medida en campo. */
  humedad: number | null;
}

export interface AnalisisSuelo extends ValoresSuelo {
  id: string;
  parcelaId: string;
  fecha: Date;
  notas: string | null;
  registradoPorId: string;
  createdAt: Date;
}

export interface RegistroClima {
  id: string;
  parcelaId: string;
  fecha: Date;
  condicion: CondicionClima;
  lluviaMm: number | null;
  notas: string | null;
  registradoPorId: string;
  createdAt: Date;
}

export type NuevoAnalisisSuelo = Omit<AnalisisSuelo, 'id' | 'createdAt'>;
export type NuevoRegistroClima = Omit<RegistroClima, 'id' | 'createdAt'>;

export interface MonitoreoRepository {
  /** Del mas reciente al mas antiguo. */
  listarSuelo(parcelaId: string): Promise<AnalisisSuelo[]>;
  crearSuelo(datos: NuevoAnalisisSuelo): Promise<AnalisisSuelo>;
  /** Del mas reciente al mas antiguo; `desde` incluido. */
  listarClima(parcelaId: string, desde?: Date): Promise<RegistroClima[]>;
  /** Un registro por parcela y dia: si ya existe el de ese dia, lo reemplaza. */
  guardarClima(datos: NuevoRegistroClima): Promise<RegistroClima>;
}
