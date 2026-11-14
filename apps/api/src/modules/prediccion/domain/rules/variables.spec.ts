import type { RegistroLote, TemporadaCultivo } from '../modelo-rendimiento';
import {
  CAMPOS_PROHIBIDOS,
  ajustarCodificador,
  codificar,
  construirFilas,
  diasDesdePrimeroDeOctubre,
  mediana,
  verificarPredictores,
} from './variables';

const dia = (texto: string): Date => new Date(`${texto}T00:00:00.000Z`);

const temporadas: TemporadaCultivo[] = [
  { temporada: '2021-2022', inicio: dia('2021-10-01'), rendimientoTotal: null },
  { temporada: '2022-2023', inicio: dia('2022-10-01'), rendimientoTotal: 2 },
  { temporada: '2023-2024', inicio: dia('2023-10-01'), rendimientoTotal: 1 },
];

function registro(parcial: Partial<RegistroLote> & Pick<RegistroLote, 'parcelaId' | 'temporada'>): RegistroLote {
  return {
    campanaId: `${parcial.parcelaId}-${parcial.temporada}`,
    variedad: '6410',
    fechaSiembra: dia(`${parcial.temporada.slice(0, 4)}-12-01`),
    haSembradas: 50,
    haCosechadas: 50,
    toneladas: 100,
    ...parcial,
  };
}

describe('Dias de siembra desde el 1 de octubre', () => {
  it('cuenta los dias desde el 1 de octubre del inicio de la campaña', () => {
    expect(diasDesdePrimeroDeOctubre(dia('2021-10-01'), dia('2021-12-25'))).toBe(85);
    expect(diasDesdePrimeroDeOctubre(dia('2021-10-01'), dia('2022-01-08'))).toBe(99);
    expect(diasDesdePrimeroDeOctubre(dia('2021-10-01'), dia('2021-10-01'))).toBe(0);
  });

  it('si la campaña se registro iniciando en el primer semestre, usa el octubre anterior', () => {
    expect(diasDesdePrimeroDeOctubre(dia('2022-01-15'), dia('2022-01-08'))).toBe(99);
  });
});

describe('Filas del modelo: objetivo y lag_1', () => {
  it('el objetivo es toneladas / hectareas cosechadas', () => {
    const [fila] = construirFilas(
      [registro({ parcelaId: 'L1', temporada: '2022-2023', toneladas: 90, haCosechadas: 45 })],
      temporadas,
    );
    expect(fila.rendimiento).toBe(2);
  });

  it('deja fuera los lotes sin cosecha o con superficie cosechada 0', () => {
    const filas = construirFilas(
      [
        registro({ parcelaId: 'L1', temporada: '2022-2023', toneladas: null }),
        registro({ parcelaId: 'L2', temporada: '2022-2023', haCosechadas: 0 }),
        registro({ parcelaId: 'L3', temporada: '2022-2023' }),
      ],
      temporadas,
    );
    expect(filas.map((f) => f.parcelaId)).toEqual(['L3']);
  });

  it('lag_1 es el rendimiento del MISMO lote en la campaña anterior; si no existe queda null', () => {
    const filas = construirFilas(
      [
        registro({ parcelaId: 'L1', temporada: '2021-2022', toneladas: 75 }), // 1.5
        registro({ parcelaId: 'L1', temporada: '2022-2023', toneladas: 100 }),
        registro({ parcelaId: 'L2', temporada: '2022-2023', toneladas: 100 }), // sin 2021-2022
        registro({ parcelaId: 'L1', temporada: '2023-2024', toneladas: 50 }),
      ],
      temporadas,
    );
    const lag = (lote: string, temporada: string) =>
      filas.find((f) => f.parcelaId === lote && f.temporada === temporada)?.lag1;
    expect(lag('L1', '2021-2022')).toBeNull();
    expect(lag('L1', '2022-2023')).toBe(1.5);
    expect(lag('L2', '2022-2023')).toBeNull();
    expect(lag('L1', '2023-2024')).toBe(2);
  });

  it('lag_1 no salta campañas: sin registro en la inmediata anterior queda null', () => {
    const filas = construirFilas(
      [
        registro({ parcelaId: 'L1', temporada: '2021-2022' }),
        registro({ parcelaId: 'L1', temporada: '2023-2024' }),
      ],
      temporadas,
    );
    expect(filas[1].lag1).toBeNull();
  });
});

describe('Codificacion de predictores', () => {
  const entrenamiento = [
    { haSembradas: 40, diasSiembra: 70, variedad: 'MUNASQA', lag1: null },
    { haSembradas: 50, diasSiembra: 90, variedad: '6410', lag1: null },
    { haSembradas: 60, diasSiembra: null, variedad: '6410', lag1: null },
  ];

  it('one-hot de variedad con las categorias del entrenamiento, guardadas en orden', () => {
    const codificador = ajustarCodificador(entrenamiento, false);
    expect(codificador.categoriasVariedad).toEqual(['6410', 'MUNASQA']);
    expect(codificador.columnas).toEqual([
      'ha_sembradas',
      'dias_siembra',
      'variedad=6410',
      'variedad=MUNASQA',
    ]);
    expect(codificar(entrenamiento, codificador).X[0]).toEqual([40, 70, 0, 1]);
  });

  it('una variedad que no estaba en el entrenamiento queda en ceros y se avisa', () => {
    const codificador = ajustarCodificador(entrenamiento, false);
    const matriz = codificar(
      [{ haSembradas: 10, diasSiembra: 80, variedad: 'NUEVA', lag1: null }],
      codificador,
    );
    expect(matriz.X[0]).toEqual([10, 80, 0, 0]);
    expect(matriz.variedadDesconocida).toEqual([true]);
  });

  it('fecha de siembra faltante: se imputa con la mediana del entrenamiento y se marca', () => {
    const codificador = ajustarCodificador(entrenamiento, false);
    expect(codificador.medianaDiasSiembra).toBe(80);
    const matriz = codificar(entrenamiento, codificador);
    expect(matriz.X[2][1]).toBe(80);
    expect(matriz.imputadas).toEqual([false, false, true]);
  });

  it('la variante con lag agrega la columna lag_1 y exige que exista', () => {
    const conLag = entrenamiento.map((f) => ({ ...f, lag1: 1.7 }));
    const codificador = ajustarCodificador(conLag, true);
    expect(codificador.columnas).toContain('lag_1');
    expect(codificar(conLag, codificador).X[0]).toEqual([40, 70, 1.7, 0, 1]);
    expect(() => codificar(entrenamiento, codificador)).toThrow('lag_1');
  });

  it('mediana', () => {
    expect(mediana([3, 1, 2])).toBe(2);
    expect(mediana([4, 1, 2, 3])).toBe(2.5);
    expect(mediana([])).toBeNull();
  });
});

describe('PROHIBIDO: datos posteriores a la siembra como predictores', () => {
  it.each([
    'ha_cosechadas',
    'hectareas_cosechadas',
    'haCosechadas',
    'fecha_cosecha',
    'fechaCosecha',
    'dias_cosecha',
    'toneladas',
    'toneladas_descargadas',
    'rendimiento',
    'clima_ciclo',
    'lluvia_mm',
    'fumigaciones',
    'costos',
    'gasto_total',
  ])('falla si "%s" entra al vector de entrada', (columna) => {
    expect(() =>
      verificarPredictores(['ha_sembradas', 'dias_siembra', columna]),
    ).toThrow('Predictor prohibido');
  });

  it('todos los campos de la lista de prohibidos fallan', () => {
    for (const campo of CAMPOS_PROHIBIDOS) {
      expect(() => verificarPredictores([campo])).toThrow('Predictor prohibido');
    }
  });

  it('ajustar o codificar con un codificador que trae una columna prohibida falla', () => {
    const codificador = {
      columnas: ['ha_sembradas', 'dias_siembra', 'toneladas'],
      categoriasVariedad: [],
      medianaDiasSiembra: 80,
      usaLag: false,
    };
    expect(() =>
      codificar([{ haSembradas: 1, diasSiembra: 1, variedad: null, lag1: null }], codificador),
    ).toThrow('Predictor prohibido');
  });

  it('las columnas reales del modelo (variantes A y B) pasan la verificacion', () => {
    const filas = [{ haSembradas: 40, diasSiembra: 70, variedad: 'MUNASQA Y 6410', lag1: 1.5 }];
    expect(() => ajustarCodificador(filas, false)).not.toThrow();
    expect(() => ajustarCodificador(filas, true)).not.toThrow();
  });

  it('el vector no cambia aunque cambien los datos de cosecha del lote', () => {
    const base = registro({ parcelaId: 'L1', temporada: '2022-2023' });
    const vector = (r: RegistroLote): number[] => {
      const [fila] = construirFilas([r], temporadas);
      return codificar([fila], ajustarCodificador([fila], false)).X[0];
    };
    expect(
      vector({ ...base, toneladas: 999, haCosechadas: 1, }),
    ).toEqual(vector(base));
  });
});
