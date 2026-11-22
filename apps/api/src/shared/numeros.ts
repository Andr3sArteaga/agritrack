/** Redondea a `decimales` cifras (2 = centavos de Bs o t/ha). */
export const redondear = (valor: number, decimales = 2): number => {
  const factor = 10 ** decimales;
  return Math.round(valor * factor) / factor;
};

export const promedio = (valores: readonly number[]): number =>
  valores.reduce((total, valor) => total + valor, 0) / valores.length;
