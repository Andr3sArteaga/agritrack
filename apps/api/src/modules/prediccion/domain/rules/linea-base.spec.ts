import type { RegistroLote, TemporadaCultivo } from '../modelo-rendimiento';
import { calcularLineaBase, rendimientosPorTemporada } from './linea-base';

const dia = (texto: string): Date => new Date(`${texto}T00:00:00.000Z`);

const temporadas: TemporadaCultivo[] = [
  { temporada: '2021-2022', inicio: dia('2021-10-01'), rendimientoTotal: null },
  { temporada: '2022-2023', inicio: dia('2022-10-01'), rendimientoTotal: 2.0 },
  { temporada: '2023-2024', inicio: dia('2023-10-01'), rendimientoTotal: 1.0 },
  { temporada: '2024-2025', inicio: dia('2024-10-01'), rendimientoTotal: 2.4 },
];

describe('Linea base oficial', () => {
  const rendimientos = rendimientosPorTemporada(temporadas, []);

  it('promedia los rendimientos totales de las campañas anteriores', () => {
    const base = calcularLineaBase(rendimientos, dia('2024-10-01'));
    expect(base.valor).toBeCloseTo(1.5, 10);
    expect(base.campanasUsadas).toEqual(['2022-2023', '2023-2024']);
  });

  it('no usa la campaña que se estima ni las posteriores', () => {
    const base = calcularLineaBase(rendimientos, dia('2023-10-01'));
    expect(base.valor).toBe(2.0);
    expect(base.campanasUsadas).toEqual(['2022-2023']);
  });

  it('sin campañas anteriores devuelve "sin datos" (null), nunca 0', () => {
    const base = calcularLineaBase(rendimientos, dia('2021-10-01'));
    expect(base.valor).toBeNull();
    expect(base.campanasUsadas).toEqual([]);
  });

  it('version (a): una campaña sin superficie total conocida no entra', () => {
    // Antes de 2022-2023 solo existe 2021-2022, que no tiene total.
    expect(calcularLineaBase(rendimientos, dia('2022-10-01')).valor).toBeNull();
  });

  it('si una campaña no tiene total registrado, usa toneladas totales / hectareas totales de sus lotes', () => {
    const registros: RegistroLote[] = [
      { parcelaId: 'L1', campanaId: 'c1', temporada: 'T1', variedad: null, fechaSiembra: null, haSembradas: 10, haCosechadas: 10, toneladas: 30 },
      { parcelaId: 'L2', campanaId: 'c2', temporada: 'T1', variedad: null, fechaSiembra: null, haSembradas: 30, haCosechadas: 30, toneladas: 30 },
    ];
    const resueltos = rendimientosPorTemporada(
      [{ temporada: 'T1', inicio: dia('2020-10-01'), rendimientoTotal: undefined }],
      registros,
    );
    // 60 t / 40 ha = 1.5 (no el promedio de 3 y 1).
    expect(resueltos[0].rendimiento).toBe(1.5);
    const base = calcularLineaBase(resueltos, dia('2021-10-01'));
    expect(base.valor).toBe(1.5);
    expect(base.calculadaDesdeLotes).toBe(true);
  });
});
