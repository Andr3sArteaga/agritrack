/**
 * Intervalos de confianza por bootstrap, reproducibles con semilla.
 * Se remuestrean UNIDADES (lotes): cada unidad lleva todas sus observaciones.
 */
import type { Intervalo } from '../modelo-rendimiento';

export const REPETICIONES_BOOTSTRAP = 1000;
export const SEMILLA_BOOTSTRAP = 12345;

/** Generador pseudoaleatorio mulberry32: misma semilla, misma secuencia. Devuelve numeros en [0, 1). */
export function crearGenerador(semilla: number): () => number {
  let estado = semilla >>> 0;
  return () => {
    estado = (estado + 0x6d2b79f5) >>> 0;
    let t = estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Percentil con interpolacion lineal (igual que numpy.percentile por defecto). */
export function percentil(ordenados: readonly number[], p: number): number {
  const posicion = (ordenados.length - 1) * p;
  const abajo = Math.floor(posicion);
  const arriba = Math.ceil(posicion);
  return (
    ordenados[abajo] + (ordenados[arriba] - ordenados[abajo]) * (posicion - abajo)
  );
}

export const promedio = (valores: readonly number[]): number =>
  valores.reduce((total, valor) => total + valor, 0) / valores.length;

/**
 * IC 95 % del promedio de las observaciones, remuestreando unidades con reemplazo.
 * @param unidades cada unidad es la lista de observaciones de un lote.
 */
export function intervaloBootstrap(
  unidades: readonly (readonly number[])[],
  repeticiones = REPETICIONES_BOOTSTRAP,
  semilla = SEMILLA_BOOTSTRAP,
): Intervalo {
  const aleatorio = crearGenerador(semilla);
  const n = unidades.length;
  const estadisticos: number[] = [];
  for (let r = 0; r < repeticiones; r += 1) {
    let suma = 0;
    let cuenta = 0;
    for (let i = 0; i < n; i += 1) {
      const unidad = unidades[Math.floor(aleatorio() * n)];
      for (const valor of unidad) suma += valor;
      cuenta += unidad.length;
    }
    estadisticos.push(suma / cuenta);
  }
  estadisticos.sort((a, b) => a - b);
  return [percentil(estadisticos, 0.025), percentil(estadisticos, 0.975)];
}
