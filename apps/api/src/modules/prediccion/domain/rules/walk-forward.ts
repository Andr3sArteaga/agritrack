/**
 * Validacion walk-forward: para cada campaña desde la segunda, se entrena SOLO
 * con las campañas anteriores y se prueba en ella. Nunca se usan datos de la
 * campaña de prueba para entrenar (ni para la codificacion ni para la imputacion).
 */
import type {
  ConclusionCorte,
  FilaModelo,
  Intervalo,
  MetricaCorte,
  MetricaGlobal,
  ResultadoWalkForward,
} from '../modelo-rendimiento';
import type { RegresorPort } from '../ports/regresor.port';
import { intervaloBootstrap, promedio } from './bootstrap';
import { calcularLineaBase, type RendimientoTemporada } from './linea-base';
import { ajustarCodificador, codificar } from './variables';

export interface Corte {
  prueba: string;
  entrenamiento: string[];
}

/** Un corte por campaña desde la segunda; el entrenamiento son todas las anteriores. */
export function cortesWalkForward(temporadas: readonly string[]): Corte[] {
  return temporadas.slice(1).map((prueba, i) => ({
    prueba,
    entrenamiento: temporadas.slice(0, i + 1),
  }));
}

/** Parte las filas de un corte. El entrenamiento jamas contiene la campaña de prueba ni posteriores. */
export function separarCorte(
  filas: readonly FilaModelo[],
  corte: Corte,
): { entrenamiento: FilaModelo[]; prueba: FilaModelo[] } {
  const previas = new Set(corte.entrenamiento);
  return {
    entrenamiento: filas.filter((fila) => previas.has(fila.temporada)),
    prueba: filas.filter((fila) => fila.temporada === corte.prueba),
  };
}

/** Negativo con intervalo que excluye 0 = supera; positivo con intervalo que excluye 0 = peor. */
export function concluir(
  intervalo: Intervalo,
): Exclude<ConclusionCorte, 'sin_linea_base'> {
  if (intervalo[1] < 0) return 'supera';
  if (intervalo[0] > 0) return 'peor';
  return 'no_concluyente';
}

/** Raiz del error cuadratico medio (RMSE) a partir de errores individuales o absolutos. */
export function calcularRmse(erroresAbsolutos: readonly number[]): number {
  if (erroresAbsolutos.length === 0) return 0;
  return Math.sqrt(promedio(erroresAbsolutos.map((e) => e * e)));
}

/**
 * Coeficiente de determinacion R^2 = 1 - SS_res / SS_tot.
 * Devuelve null si hay menos de 2 observaciones o varianza total nula.
 */
export function calcularR2(
  reales: readonly number[],
  predichos: readonly number[],
): number | null {
  if (reales.length < 2 || reales.length !== predichos.length) return null;
  const media = promedio(reales);
  let ssRes = 0;
  let ssTot = 0;
  for (let i = 0; i < reales.length; i += 1) {
    const residual = reales[i] - predichos[i];
    const desviacion = reales[i] - media;
    ssRes += residual * residual;
    ssTot += desviacion * desviacion;
  }
  if (ssTot / reales.length <= 1e-4) return null;
  return 1 - ssRes / ssTot;
}

interface ErrorFila {
  parcelaId: string;
  real: number;
  predicho: number;
  errorModelo: number;
  /** null = el corte no tiene linea base. */
  errorBase: number | null;
}

export function evaluarWalkForward(
  filas: readonly FilaModelo[],
  rendimientos: readonly RendimientoTemporada[],
  regresor: RegresorPort,
  usaLag: boolean,
): ResultadoWalkForward {
  const utiles = usaLag ? filas.filter((fila) => fila.lag1 !== null) : filas;
  const cortes: MetricaCorte[] = [];
  const erroresConBase: (ErrorFila & { errorBase: number })[] = [];
  const cortesConBase: string[] = [];

  for (const corte of cortesWalkForward(rendimientos.map((r) => r.temporada))) {
    const { entrenamiento, prueba } = separarCorte(utiles, corte);
    if (entrenamiento.length === 0 || prueba.length === 0) continue;

    const codificador = ajustarCodificador(entrenamiento, usaLag);
    const modelo = regresor.entrenar(
      codificar(entrenamiento, codificador).X,
      entrenamiento.map((fila) => fila.rendimiento),
    );
    const matrizPrueba = codificar(prueba, codificador);
    const predicciones = modelo.predecir(matrizPrueba.X);

    const inicioPrueba = rendimientos.find((r) => r.temporada === corte.prueba)!.inicio;
    const base = calcularLineaBase(rendimientos, inicioPrueba).valor;

    const errores: ErrorFila[] = prueba.map((fila, i) => ({
      parcelaId: fila.parcelaId,
      real: fila.rendimiento,
      predicho: predicciones[i],
      errorModelo: Math.abs(fila.rendimiento - predicciones[i]),
      errorBase: base === null ? null : Math.abs(fila.rendimiento - base),
    }));

    const erroresModelo = errores.map((e) => e.errorModelo);
    const rmseModelo = calcularRmse(erroresModelo);
    const r2Modelo = calcularR2(
      errores.map((e) => e.real),
      errores.map((e) => e.predicho),
    );
    let maeLineaBase: number | null = null;
    let rmseLineaBase: number | null = null;
    let diferencia: number | null = null;
    let icDiferencia: Intervalo | null = null;
    let conclusion: ConclusionCorte = 'sin_linea_base';
    if (base !== null) {
      const erroresBase = errores.map((e) => e.errorBase as number);
      const diferencias = errores.map((e) => e.errorModelo - (e.errorBase as number));
      maeLineaBase = promedio(erroresBase);
      rmseLineaBase = calcularRmse(erroresBase);
      diferencia = promedio(diferencias);
      // Dentro de un corte cada lote aparece una vez: la unidad es la fila.
      icDiferencia = intervaloBootstrap(diferencias.map((d) => [d]));
      conclusion = concluir(icDiferencia);
      cortesConBase.push(corte.prueba);
      for (const e of errores) {
        erroresConBase.push({ ...e, errorBase: e.errorBase as number });
      }
    }

    cortes.push({
      campana: corte.prueba,
      entrenamiento: corte.entrenamiento,
      filasEntrenamiento: entrenamiento.length,
      filasPrueba: prueba.length,
      filasImputadas:
        codificar(entrenamiento, codificador).imputadas.filter(Boolean).length +
        matrizPrueba.imputadas.filter(Boolean).length,
      maeModelo: promedio(erroresModelo),
      rmseModelo,
      r2Modelo,
      icMaeModelo: intervaloBootstrap(erroresModelo.map((e) => [e])),
      lineaBase: base,
      maeLineaBase,
      rmseLineaBase,
      diferencia,
      icDiferencia,
      conclusion,
    });
  }

  return {
    variante: usaLag ? 'B' : 'A',
    cortes,
    global: calcularGlobal(erroresConBase, cortesConBase),
  };
}

/** Resultado global: todos los cortes con linea base. Bootstrap por lote (un lote aparece en varios cortes). */
function calcularGlobal(
  errores: readonly (ErrorFila & { errorBase: number })[],
  cortes: string[],
): MetricaGlobal | null {
  if (errores.length === 0) return null;
  const porLote = new Map<string, number[]>();
  for (const e of errores) {
    const lista = porLote.get(e.parcelaId) ?? [];
    lista.push(e.errorModelo - e.errorBase);
    porLote.set(e.parcelaId, lista);
  }
  const icDiferencia = intervaloBootstrap([...porLote.values()]);
  const erroresModelo = errores.map((e) => e.errorModelo);
  const erroresBase = errores.map((e) => e.errorBase);
  const maeModelo = promedio(erroresModelo);
  const maeLineaBase = promedio(erroresBase);
  const rmseModelo = calcularRmse(erroresModelo);
  const rmseLineaBase = calcularRmse(erroresBase);
  const r2Modelo = calcularR2(
    errores.map((e) => e.real),
    errores.map((e) => e.predicho),
  );
  return {
    cortes,
    filas: errores.length,
    lotes: porLote.size,
    maeModelo,
    maeLineaBase,
    rmseModelo,
    rmseLineaBase,
    r2Modelo,
    diferencia: maeModelo - maeLineaBase,
    icDiferencia,
    conclusion: concluir(icDiferencia),
  };
}
