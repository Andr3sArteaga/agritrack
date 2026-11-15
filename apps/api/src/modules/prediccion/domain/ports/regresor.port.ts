export const REGRESOR_PORT = Symbol('REGRESOR_PORT');

/** Un modelo ya entrenado. El dominio no sabe con que libreria se hizo. */
export interface ModeloRegresion {
  predecir(X: number[][]): number[];
  serializar(): unknown;
}

/** Algoritmo de regresion (hoy: Random Forest). Lo implementa un adaptador. */
export interface RegresorPort {
  entrenar(X: number[][], y: number[]): ModeloRegresion;
  cargar(serializado: unknown): ModeloRegresion;
}
