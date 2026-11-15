import type { FilaModelo } from '../modelo-rendimiento';
import type { RegresorPort } from '../ports/regresor.port';
import type { RendimientoTemporada } from './linea-base';
import {
  calcularR2,
  calcularRmse,
  concluir,
  cortesWalkForward,
  evaluarWalkForward,
  separarCorte,
} from './walk-forward';

const dia = (texto: string): Date => new Date(`${texto}T00:00:00.000Z`);
const TEMPORADAS = ['2021-2022', '2022-2023', '2023-2024', '2024-2025'];

const rendimientos: RendimientoTemporada[] = TEMPORADAS.map((temporada, i) => ({
  temporada,
  inicio: dia(`${temporada.slice(0, 4)}-10-01`),
  rendimiento: i === 0 ? null : 1 + i * 0.5,
  calculadoDesdeLotes: false,
}));

/**
 * Cada fila lleva en haSembradas un codigo unico de su campaña (1000, 2000...),
 * asi se puede ver en la matriz de entrenamiento de que campaña salio cada fila.
 */
const filas: FilaModelo[] = TEMPORADAS.flatMap((temporada, t) =>
  ['L1', 'L2', 'L3', 'L4'].map((parcelaId, l) => ({
    parcelaId,
    temporada,
    haSembradas: (t + 1) * 1000 + l,
    diasSiembra: t === 0 && l === 0 ? null : 60 + t * 10 + l,
    variedad: l % 2 === 0 ? 'A' : `B${t}`,
    lag1: t === 0 ? null : 1.5,
    rendimiento: 1 + t * 0.4 + l * 0.1,
  })),
);

/** Regresor espia: anota con que entreno y predice el promedio del entrenamiento. */
function regresorEspia(): RegresorPort & { entrenamientos: { X: number[][]; y: number[] }[] } {
  const entrenamientos: { X: number[][]; y: number[] }[] = [];
  return {
    entrenamientos,
    entrenar(X, y) {
      entrenamientos.push({ X, y });
      const media = y.reduce((s, v) => s + v, 0) / y.length;
      return { predecir: (prueba) => prueba.map(() => media), serializar: () => ({ media }) };
    },
    cargar: () => {
      throw new Error('no se usa');
    },
  };
}

describe('Walk-forward: cortes', () => {
  it('hay un corte por campaña desde la segunda, entrenando con todas las anteriores', () => {
    expect(cortesWalkForward(TEMPORADAS)).toEqual([
      { prueba: '2022-2023', entrenamiento: ['2021-2022'] },
      { prueba: '2023-2024', entrenamiento: ['2021-2022', '2022-2023'] },
      { prueba: '2024-2025', entrenamiento: ['2021-2022', '2022-2023', '2023-2024'] },
    ]);
  });

  it('con una sola campaña no hay cortes', () => {
    expect(cortesWalkForward(['2021-2022'])).toEqual([]);
  });
});

describe('Walk-forward: sin fuga de datos', () => {
  it('el entrenamiento de cada corte nunca contiene la campaña de prueba ni posteriores', () => {
    for (const corte of cortesWalkForward(TEMPORADAS)) {
      const { entrenamiento, prueba } = separarCorte(filas, corte);
      const indicePrueba = TEMPORADAS.indexOf(corte.prueba);
      expect(prueba.every((f) => f.temporada === corte.prueba)).toBe(true);
      expect(
        entrenamiento.every((f) => TEMPORADAS.indexOf(f.temporada) < indicePrueba),
      ).toBe(true);
    }
  });

  it('lo que recibe el modelo en cada corte son SOLO filas de campañas anteriores', () => {
    const espia = regresorEspia();
    evaluarWalkForward(filas, rendimientos, espia, false);

    expect(espia.entrenamientos).toHaveLength(3);
    espia.entrenamientos.forEach(({ X, y }, i) => {
      const campanaDePrueba = i + 2; // codigo 2000, 3000, 4000
      const codigos = X.map((fila) => Math.floor(fila[0] / 1000));
      expect(Math.max(...codigos)).toBeLessThan(campanaDePrueba);
      expect(X).toHaveLength(4 * (i + 1));
      expect(y).toHaveLength(X.length);
    });
  });

  it('las categorias de variedad salen solo del entrenamiento (no ve las de la prueba)', () => {
    const espia = regresorEspia();
    evaluarWalkForward(filas, rendimientos, espia, false);
    // Corte 1: entrenamiento con 2021-2022 => categorias A y B0 => 2 + 2 columnas.
    expect(espia.entrenamientos[0].X[0]).toHaveLength(4);
    // Corte 2: A, B0, B1 => 5 columnas. La variedad B2 (de la prueba) no aparece.
    expect(espia.entrenamientos[1].X[0]).toHaveLength(5);
  });

  it('la imputacion usa la mediana del entrenamiento del corte, no la de la prueba', () => {
    const espia = regresorEspia();
    evaluarWalkForward(filas, rendimientos, espia, false);
    // Corte 1: dias conocidos del entrenamiento = 61, 62, 63 => mediana 62.
    expect(espia.entrenamientos[0].X[0][1]).toBe(62);
  });
});

describe('Walk-forward: metricas', () => {
  const resultado = evaluarWalkForward(filas, rendimientos, regresorEspia(), false);

  it('el primer corte no tiene linea base (la campaña anterior no tiene total)', () => {
    expect(resultado.cortes[0]).toMatchObject({
      campana: '2022-2023',
      lineaBase: null,
      maeLineaBase: null,
      diferencia: null,
      conclusion: 'sin_linea_base',
      filasImputadas: 1,
    });
    expect(resultado.cortes[0].maeModelo).toBeGreaterThan(0);
  });

  it('cada corte con linea base trae MAE del modelo, MAE de la base, diferencia e intervalo', () => {
    const corte = resultado.cortes[1];
    expect(corte.lineaBase).toBe(1.5);
    expect(corte.diferencia).toBeCloseTo(corte.maeModelo - (corte.maeLineaBase as number), 10);
    expect(corte.icDiferencia?.[0]).toBeLessThanOrEqual(corte.diferencia as number);
    expect(corte.icDiferencia?.[1]).toBeGreaterThanOrEqual(corte.diferencia as number);
  });

  it('el resultado global solo junta los cortes con linea base y agrupa por lote', () => {
    expect(resultado.global).toMatchObject({
      cortes: ['2023-2024', '2024-2025'],
      filas: 8,
      lotes: 4,
    });
  });

  it('es reproducible: dos corridas dan lo mismo', () => {
    expect(evaluarWalkForward(filas, rendimientos, regresorEspia(), false)).toEqual(resultado);
  });

  it('la variante con lag solo usa las filas que tienen lag_1', () => {
    const espia = regresorEspia();
    const conLag = evaluarWalkForward(filas, rendimientos, espia, true);
    // 2021-2022 no tiene lag: el corte 2022-2023 se queda sin entrenamiento y se omite.
    expect(conLag.cortes.map((c) => c.campana)).toEqual(['2023-2024', '2024-2025']);
    expect(espia.entrenamientos[0].X).toHaveLength(4);
  });

  it('conclusion: supera / peor solo si el intervalo excluye 0', () => {
    expect(concluir([-0.3, -0.1])).toBe('supera');
    expect(concluir([0.1, 0.3])).toBe('peor');
    expect(concluir([-0.1, 0.2])).toBe('no_concluyente');
  });

  it('calcula RMSE y R2 en cada corte y en el resultado global', () => {
    expect(calcularRmse([3, 4])).toBeCloseTo(Math.sqrt(12.5), 10);
    expect(calcularR2([2, 4, 6], [2, 4, 6])).toBeCloseTo(1, 10);
    expect(calcularR2([2, 2, 2], [2, 2, 2])).toBeNull();
    expect(calcularR2([2], [2])).toBeNull();

    const corte = resultado.cortes[1];
    expect(corte.rmseModelo).toBeGreaterThanOrEqual(corte.maeModelo);
    expect(corte.rmseLineaBase).toBeGreaterThanOrEqual(corte.maeLineaBase as number);
    expect(resultado.global?.rmseModelo).toBeGreaterThanOrEqual(resultado.global!.maeModelo);
    expect(resultado.global?.rmseLineaBase).toBeGreaterThanOrEqual(resultado.global!.maeLineaBase);
    expect(typeof resultado.global?.r2Modelo).toBe('number');
  });
});
