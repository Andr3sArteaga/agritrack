/** Tipos del dominio de estimacion de rendimiento. Sin Nest, sin Prisma, sin librerias de ML. */

export type OrigenDatos = 'demo_enmascarado' | 'real';
export type EstadoModelo = 'experimental' | 'activo' | 'archivado';

export const ETIQUETA_DEMO = 'Datos iniciales (V1)';

/** Datos de siembra y cosecha de un lote (parcela) en una campaña, tal como estan guardados. */
export interface RegistroLote {
  parcelaId: string;
  campanaId: string;
  temporada: string;
  variedad: string | null;
  fechaSiembra: Date | null;
  haSembradas: number;
  haCosechadas: number | null;
  toneladas: number | null;
}

/**
 * Una campaña (temporada) de un cultivo.
 * rendimientoTotal: toneladas totales / hectareas cosechadas totales.
 *   - numero    = total registrado.
 *   - null      = la superficie total no se conoce: no entra en la linea base.
 *   - undefined = no hay total registrado: se calcula con la suma de los lotes.
 */
export interface TemporadaCultivo {
  temporada: string;
  inicio: Date;
  rendimientoTotal: number | null | undefined;
}

/** Lo que se sabe de un lote A LA FECHA DE SIEMBRA. Es lo unico que puede ver el modelo. */
export interface EntradaPredictores {
  haSembradas: number;
  /** null = fecha de siembra no anotada: se imputa con la mediana del entrenamiento. */
  diasSiembra: number | null;
  variedad: string | null;
  /** Rendimiento del mismo lote en la campaña anterior (solo variante B). */
  lag1: number | null;
}

/** Fila de entrenamiento o prueba: predictores + objetivo. */
export interface FilaModelo extends EntradaPredictores {
  parcelaId: string;
  temporada: string;
  /** Objetivo: toneladas cosechadas / hectareas cosechadas. */
  rendimiento: number;
}

export type Intervalo = [number, number];

export type ConclusionCorte =
  | 'supera'
  | 'no_concluyente'
  | 'peor'
  | 'sin_linea_base';

export interface MetricaCorte {
  campana: string;
  entrenamiento: string[];
  filasEntrenamiento: number;
  filasPrueba: number;
  filasImputadas: number;
  maeModelo: number;
  icMaeModelo: Intervalo;
  lineaBase: number | null;
  maeLineaBase: number | null;
  /** MAE del modelo - MAE de la linea base. Negativo = el modelo es mejor. */
  diferencia: number | null;
  icDiferencia: Intervalo | null;
  conclusion: ConclusionCorte;
}

export interface MetricaGlobal {
  cortes: string[];
  filas: number;
  lotes: number;
  maeModelo: number;
  maeLineaBase: number;
  diferencia: number;
  icDiferencia: Intervalo;
  conclusion: Exclude<ConclusionCorte, 'sin_linea_base'>;
}

export interface ResultadoWalkForward {
  variante: 'A' | 'B';
  cortes: MetricaCorte[];
  /** null = ningun corte tiene linea base contra la cual comparar. */
  global: MetricaGlobal | null;
}

/** Como se convierten los predictores en numeros. Se guarda junto con el modelo. */
export interface Codificador {
  columnas: string[];
  categoriasVariedad: string[];
  medianaDiasSiembra: number | null;
  usaLag: boolean;
}

export interface MetricasModelo {
  varianteA: ResultadoWalkForward;
  /** Informativa: con lag_1, solo en las filas que lo tienen. */
  varianteB: ResultadoWalkForward | null;
  activacion: { estado: EstadoModelo; motivos: string[] };
  parametros: {
    arboles: number;
    semillaModelo: number;
    repeticionesBootstrap: number;
    semillaBootstrap: number;
  };
}

export interface ModeloIa {
  id: string;
  cultivoId: string;
  version: number;
  origenDatos: OrigenDatos;
  campanasUsadas: string[];
  hashDatos: string;
  codificador: Codificador;
  metricas: MetricasModelo;
  estado: EstadoModelo;
  createdAt: Date;
}

export interface ModeloIaConPesos extends ModeloIa {
  /** Modelo serializado por el adaptador (opaco para el dominio). */
  modelo: unknown;
}

export interface NuevoModeloIa {
  cultivoId: string;
  origenDatos: OrigenDatos;
  campanasUsadas: string[];
  hashDatos: string;
  codificador: Codificador;
  metricas: MetricasModelo;
  modelo: unknown;
  estado: Exclude<EstadoModelo, 'archivado'>;
}

/** Lo que se necesita saber de un lote y una campaña para estimar. */
export interface ContextoEstimacion {
  parcelaId: string;
  campanaId: string;
  cultivoId: string;
  temporada: string;
  inicioCampana: Date;
  origen: OrigenDatos;
  hectareasParcela?: number;
  /** Datos de siembra, si ya se registraron. */
  siembra: {
    variedad: string | null;
    fechaSiembra: Date | null;
    haSembradas: number;
  } | null;
}

/** Registro persistido de siembra y cosecha de una campaña (tabla registros_cosecha). */
export interface RegistroCosechaCampana {
  id: string;
  campanaId: string;
  variedad: string | null;
  fechaSiembra: Date | null;
  haSembradas: number;
  fechaCosecha: Date | null;
  haCosechadas: number | null;
  toneladas: number | null;
  origen: OrigenDatos;
  updatedAt: Date;
}

export interface DatosSiembraInput {
  haSembradas: number;
  variedad: string | null;
  fechaSiembra: Date | null;
}

export interface DatosCosechaInput {
  haCosechadas: number;
  toneladas: number;
  fechaCosecha: Date;
}

export type EfectoImpacto = 'POSITIVO' | 'NEUTRO' | 'NEGATIVO';

export interface FactorImpacto {
  variable: 'fecha_siembra' | 'variedad' | 'ha_sembradas';
  etiqueta: string;
  valorIngresado: string;
  efecto: EfectoImpacto;
  delta_t_ha: number;
  detalle: string;
}

export interface EscenarioSiembraImpacto {
  haSembradas: number;
  fechaSiembra: string;
  variedad: string;
  estimado_t_ha: number;
  diferencia_t_ha: number;
}

export interface EscenariosImpacto {
  positivo: EscenarioSiembraImpacto | null;
  neutro: EscenarioSiembraImpacto | null;
  negativo: EscenarioSiembraImpacto | null;
}

export interface ResultadoImpacto {
  efectoGlobal: EfectoImpacto;
  resumen: string;
  estimado_t_ha: number | null;
  referencia_t_ha: number | null;
  diferencia_t_ha: number | null;
  produccion_estimada_tn: number | null;
  fuenteReferencia: 'linea_base' | 'mediana_modelo' | 'sin_referencia';
  version_modelo: string | null;
  origen_datos: OrigenDatos;
  etiqueta_datos: string | null;
  variedadesConocidas: string[];
  advertencias: string[];
  factores: FactorImpacto[];
  escenarios?: EscenariosImpacto;
}

export interface PreparacionParcelaDev {
  parcelaId: string;
  cultivoId: string;
  cultivoNombre: string;
  campanaActualId: string;
  temporadaActual: string;
  campanasHabilitadas: number;
  campanasSinActividadCosecha: {
    campanaId: string;
    fechaSiembra: string;
    fechaCosecha: string;
    rendimientoTnHa: number;
  }[];
  campanaActualNecesitaSiembra: {
    campanaId: string;
    fechaSiembra: string;
  } | null;
}
