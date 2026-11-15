/**
 * Variables del modelo de rendimiento. Unidad: lote por campaña.
 * Objetivo: rendimiento = toneladas cosechadas / hectareas cosechadas.
 * Predictores: SOLO lo que se conoce a la fecha de siembra.
 */
import type {
  Codificador,
  EntradaPredictores,
  FilaModelo,
  RegistroLote,
  TemporadaCultivo,
} from '../modelo-rendimiento';

export const COLUMNA_HA_SEMBRADAS = 'ha_sembradas';
export const COLUMNA_DIAS_SIEMBRA = 'dias_siembra';
export const COLUMNA_LAG_1 = 'lag_1';
export const PREFIJO_VARIEDAD = 'variedad=';

/**
 * Datos que se registran DESPUES de la siembra: nunca pueden ser predictores.
 * Se comparan sin mayusculas, tildes ni separadores.
 */
export const CAMPOS_PROHIBIDOS: readonly string[] = [
  'ha_cosechadas',
  'hectareas_cosechadas',
  'fecha_cosecha',
  'dias_cosecha',
  'toneladas',
  'rendimiento',
  'clima',
  'lluvia',
  'temperatura',
  'fumigacion',
  'fumigaciones',
  'fertilizacion',
  'costo',
  'costos',
  'gasto',
  'gastos',
];

const normalizar = (texto: string): string =>
  texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

/** Falla si alguna columna del vector de entrada es un dato posterior a la siembra. */
export function verificarPredictores(columnas: readonly string[]): void {
  for (const columna of columnas) {
    // lag_1 es el rendimiento de la campaña ANTERIOR: se conoce a la siembra.
    if (columna === COLUMNA_LAG_1) continue;
    // En las columnas de variedad solo se revisa el prefijo (el nombre de la variedad es libre).
    const nombre = columna.startsWith(PREFIJO_VARIEDAD)
      ? PREFIJO_VARIEDAD
      : columna;
    const limpio = normalizar(nombre);
    const prohibido = CAMPOS_PROHIBIDOS.find((campo) =>
      limpio.includes(normalizar(campo)),
    );
    if (prohibido) {
      throw new Error(
        `Predictor prohibido: "${columna}" es un dato posterior a la siembra (${prohibido}).`,
      );
    }
  }
}

const MS_POR_DIA = 24 * 60 * 60 * 1000;

/**
 * Dias desde el 1 de octubre del inicio de la campaña hasta la siembra.
 * La campaña agricola empieza en el segundo semestre: si la fecha de inicio cae
 * antes de julio, el 1 de octubre de referencia es el del año anterior.
 */
export function diasDesdePrimeroDeOctubre(
  inicioCampana: Date,
  fechaSiembra: Date,
): number {
  const anio =
    inicioCampana.getUTCMonth() >= 6
      ? inicioCampana.getUTCFullYear()
      : inicioCampana.getUTCFullYear() - 1;
  const primeroDeOctubre = Date.UTC(anio, 9, 1);
  const siembra = Date.UTC(
    fechaSiembra.getUTCFullYear(),
    fechaSiembra.getUTCMonth(),
    fechaSiembra.getUTCDate(),
  );
  return Math.round((siembra - primeroDeOctubre) / MS_POR_DIA);
}

/** Rendimiento de un lote; null si falta la cosecha o la superficie cosechada es 0. */
export function rendimientoDeLote(
  registro: Pick<RegistroLote, 'toneladas' | 'haCosechadas'>,
): number | null {
  if (registro.toneladas === null || registro.haCosechadas === null) return null;
  if (registro.haCosechadas <= 0) return null;
  return registro.toneladas / registro.haCosechadas;
}

/**
 * Convierte los registros en filas del modelo. Solo entran los lotes con cosecha.
 * lag_1 = rendimiento del MISMO lote en la campaña inmediatamente anterior del cultivo.
 */
export function construirFilas(
  registros: readonly RegistroLote[],
  temporadas: readonly TemporadaCultivo[],
): FilaModelo[] {
  const posicion = new Map(temporadas.map((t, i) => [t.temporada, i]));
  const inicio = new Map(temporadas.map((t) => [t.temporada, t.inicio]));
  const rendimientoPor = new Map<string, number>();
  for (const registro of registros) {
    const rendimiento = rendimientoDeLote(registro);
    if (rendimiento !== null) {
      rendimientoPor.set(`${registro.parcelaId}|${registro.temporada}`, rendimiento);
    }
  }

  const filas: FilaModelo[] = [];
  for (const registro of registros) {
    const rendimiento = rendimientoDeLote(registro);
    const indice = posicion.get(registro.temporada);
    const inicioCampana = inicio.get(registro.temporada);
    if (rendimiento === null || indice === undefined || !inicioCampana) continue;
    const anterior = indice > 0 ? temporadas[indice - 1].temporada : null;
    filas.push({
      parcelaId: registro.parcelaId,
      temporada: registro.temporada,
      haSembradas: registro.haSembradas,
      diasSiembra: registro.fechaSiembra
        ? diasDesdePrimeroDeOctubre(inicioCampana, registro.fechaSiembra)
        : null,
      variedad: registro.variedad,
      lag1: anterior
        ? (rendimientoPor.get(`${registro.parcelaId}|${anterior}`) ?? null)
        : null,
      rendimiento,
    });
  }
  return filas;
}

export function mediana(valores: readonly number[]): number | null {
  if (valores.length === 0) return null;
  const orden = [...valores].sort((a, b) => a - b);
  const mitad = Math.floor(orden.length / 2);
  return orden.length % 2 === 1
    ? orden[mitad]
    : (orden[mitad - 1] + orden[mitad]) / 2;
}

/**
 * Aprende la codificacion SOLO con las filas de entrenamiento: categorias de
 * variedad (one-hot) y mediana de dias de siembra (para imputar faltantes).
 */
export function ajustarCodificador(
  entrenamiento: readonly EntradaPredictores[],
  usaLag: boolean,
): Codificador {
  const categoriasVariedad = [
    ...new Set(
      entrenamiento
        .map((fila) => fila.variedad)
        .filter((variedad): variedad is string => variedad !== null),
    ),
  ].sort();
  const columnas = [
    COLUMNA_HA_SEMBRADAS,
    COLUMNA_DIAS_SIEMBRA,
    ...(usaLag ? [COLUMNA_LAG_1] : []),
    ...categoriasVariedad.map((variedad) => `${PREFIJO_VARIEDAD}${variedad}`),
  ];
  verificarPredictores(columnas);
  return {
    columnas,
    categoriasVariedad,
    medianaDiasSiembra: mediana(
      entrenamiento
        .map((fila) => fila.diasSiembra)
        .filter((dias): dias is number => dias !== null),
    ),
    usaLag,
  };
}

export interface MatrizCodificada {
  X: number[][];
  /** true en las filas cuya fecha de siembra faltaba y se imputo con la mediana. */
  imputadas: boolean[];
  /** true en las filas cuya variedad no estaba en el entrenamiento (todas sus columnas quedan en 0). */
  variedadDesconocida: boolean[];
}

/** Convierte predictores en numeros. Recibe EntradaPredictores: no puede ver datos de cosecha. */
export function codificar(
  filas: readonly EntradaPredictores[],
  codificador: Codificador,
): MatrizCodificada {
  verificarPredictores(codificador.columnas);
  const imputadas: boolean[] = [];
  const variedadDesconocida: boolean[] = [];
  const X = filas.map((fila) => {
    const falta = fila.diasSiembra === null;
    imputadas.push(falta);
    variedadDesconocida.push(
      fila.variedad === null ||
        !codificador.categoriasVariedad.includes(fila.variedad),
    );
    if (codificador.usaLag && fila.lag1 === null) {
      throw new Error('Falta lag_1 en una fila de la variante con lag.');
    }
    return [
      fila.haSembradas,
      falta ? (codificador.medianaDiasSiembra ?? 0) : (fila.diasSiembra as number),
      ...(codificador.usaLag ? [fila.lag1 as number] : []),
      ...codificador.categoriasVariedad.map((variedad) =>
        fila.variedad === variedad ? 1 : 0,
      ),
    ];
  });
  return { X, imputadas, variedadDesconocida };
}
