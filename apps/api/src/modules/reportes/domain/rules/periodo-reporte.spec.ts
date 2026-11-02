import { resolverPeriodo } from './periodo-reporte';

const dia = (texto: string) => new Date(`${texto}T00:00:00.000Z`);

const CAMPANA_CERRADA = {
  fechaInicio: dia('2025-11-01'),
  fechaFin: dia('2026-03-15'),
};
const AHORA = new Date('2026-11-02T15:30:00.000Z');

describe('resolverPeriodo (RF-42)', () => {
  it('sin desde ni hasta usa las fechas de la campana (periodo por defecto)', () => {
    const periodo = resolverPeriodo({}, CAMPANA_CERRADA, AHORA);

    expect(periodo).toEqual({
      desde: dia('2025-11-01'),
      hasta: dia('2026-03-15'),
      hastaExclusivo: dia('2026-03-16'),
      porDefecto: true,
    });
  });

  it('con desde y hasta usa el rango pedido; hasta es inclusivo (todo ese dia)', () => {
    const periodo = resolverPeriodo(
      { desde: '2025-12-01', hasta: '2026-01-31' },
      CAMPANA_CERRADA,
      AHORA,
    );

    expect(periodo.desde).toEqual(dia('2025-12-01'));
    expect(periodo.hasta).toEqual(dia('2026-01-31'));
    expect(periodo.hastaExclusivo).toEqual(dia('2026-02-01'));
    expect(periodo.porDefecto).toBe(false);
  });

  it('si solo viene uno, el otro se completa con la fecha de la campana', () => {
    const soloDesde = resolverPeriodo({ desde: '2026-01-10' }, CAMPANA_CERRADA, AHORA);
    const soloHasta = resolverPeriodo({ hasta: '2026-01-10' }, CAMPANA_CERRADA, AHORA);

    expect([soloDesde.desde, soloDesde.hasta]).toEqual([dia('2026-01-10'), dia('2026-03-15')]);
    expect([soloHasta.desde, soloHasta.hasta]).toEqual([dia('2025-11-01'), dia('2026-01-10')]);
    expect(soloDesde.porDefecto).toBe(false);
    expect(soloHasta.porDefecto).toBe(false);
  });

  it('campana sin fecha de fin (en curso): el fin por defecto es hoy, sin la hora', () => {
    const periodo = resolverPeriodo(
      {},
      { fechaInicio: dia('2026-06-01'), fechaFin: null },
      AHORA,
    );

    expect(periodo.desde).toEqual(dia('2026-06-01'));
    expect(periodo.hasta).toEqual(dia('2026-11-02'));
  });

  it('campana planificada que aun no empieza: el periodo por defecto no queda invertido', () => {
    const periodo = resolverPeriodo(
      {},
      { fechaInicio: dia('2027-01-15'), fechaFin: null },
      AHORA,
    );

    expect(periodo.desde).toEqual(dia('2027-01-15'));
    expect(periodo.hasta).toEqual(dia('2027-01-15'));
    expect(periodo.desde <= periodo.hasta).toBe(true);
  });

  it('no corrige un rango invertido: lo detecta quien llama (400)', () => {
    const periodo = resolverPeriodo(
      { desde: '2026-02-01', hasta: '2026-01-01' },
      CAMPANA_CERRADA,
      AHORA,
    );

    expect(periodo.desde > periodo.hasta).toBe(true);
  });
});
