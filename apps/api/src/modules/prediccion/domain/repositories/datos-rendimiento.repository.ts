import type {
  ContextoEstimacion,
  DatosCosechaInput,
  DatosSiembraInput,
  OrigenDatos,
  RegistroCosechaCampana,
  RegistroLote,
  TemporadaCultivo,
} from '../modelo-rendimiento';

export const DATOS_RENDIMIENTO_REPOSITORY = Symbol(
  'DATOS_RENDIMIENTO_REPOSITORY',
);

export interface DatosRendimientoRepository {
  /** Origenes que tienen registros de ese cultivo. Nunca se mezclan entre si. */
  origenesConDatos(cultivoId: string): Promise<OrigenDatos[]>;
  registros(cultivoId: string, origen: OrigenDatos): Promise<RegistroLote[]>;
  /** Campañas del cultivo con registros de ese origen, de la mas antigua a la mas nueva. */
  temporadas(
    cultivoId: string,
    origen: OrigenDatos,
  ): Promise<TemporadaCultivo[]>;
  contextoEstimacion(
    parcelaId: string,
    campanaId: string,
  ): Promise<ContextoEstimacion | null>;
  /** Parcelas que solo existen como datos de demostracion. */
  parcelasDemo(): Promise<string[]>;
  existeCampana(campanaId: string): Promise<boolean>;
  cultivoDeCampana?(campanaId: string): Promise<string | null>;
  obtenerRegistroCosecha(campanaId: string): Promise<RegistroCosechaCampana | null>;
  guardarSiembra(
    campanaId: string,
    datos: DatosSiembraInput,
  ): Promise<RegistroCosechaCampana>;
  guardarCosecha(
    campanaId: string,
    datos: DatosCosechaInput,
  ): Promise<RegistroCosechaCampana>;
}
