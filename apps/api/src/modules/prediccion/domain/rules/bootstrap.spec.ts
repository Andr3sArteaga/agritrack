import {
  REPETICIONES_BOOTSTRAP,
  SEMILLA_BOOTSTRAP,
  crearGenerador,
  intervaloBootstrap,
  percentil,
} from './bootstrap';

describe('Bootstrap reproducible', () => {
  const unidades = [[0.1], [0.4], [-0.2], [0.3, 0.5], [0.0], [0.25], [-0.1, 0.2]];

  it('usa 1000 repeticiones y la semilla 12345 por defecto', () => {
    expect(REPETICIONES_BOOTSTRAP).toBe(1000);
    expect(SEMILLA_BOOTSTRAP).toBe(12345);
  });

  it('la misma semilla da exactamente el mismo intervalo', () => {
    expect(intervaloBootstrap(unidades)).toEqual(intervaloBootstrap(unidades));
  });

  it('otra semilla da otro intervalo', () => {
    expect(intervaloBootstrap(unidades, 1000, 1)).not.toEqual(
      intervaloBootstrap(unidades, 1000, 2),
    );
  });

  it('el generador es determinista y devuelve valores en [0, 1)', () => {
    const a = crearGenerador(12345);
    const b = crearGenerador(12345);
    for (let i = 0; i < 1000; i += 1) {
      const valor = a();
      expect(valor).toBe(b());
      expect(valor).toBeGreaterThanOrEqual(0);
      expect(valor).toBeLessThan(1);
    }
  });

  it('el intervalo contiene al promedio y esta ordenado', () => {
    const [inferior, superior] = intervaloBootstrap(unidades);
    const todas = unidades.flat();
    const media = todas.reduce((s, v) => s + v, 0) / todas.length;
    expect(inferior).toBeLessThanOrEqual(media);
    expect(superior).toBeGreaterThanOrEqual(media);
  });

  it('sin variacion el intervalo se reduce a un punto', () => {
    const [inferior, superior] = intervaloBootstrap([[0.5], [0.5], [0.5]]);
    expect(inferior).toBeCloseTo(0.5, 12);
    expect(superior).toBeCloseTo(0.5, 12);
  });

  it('percentil con interpolacion lineal', () => {
    expect(percentil([1, 2, 3, 4], 0.5)).toBe(2.5);
    expect(percentil([1, 2, 3, 4], 0)).toBe(1);
    expect(percentil([1, 2, 3, 4], 1)).toBe(4);
  });
});
