import {
  errorAnalisisSuelo,
  errorRegistroClima,
  esFechaFutura,
  esLluvia,
} from './validar-monitoreo';

const vacio = { ph: null, nitrogeno: null, fosforo: null, potasio: null, materiaOrganica: null, humedad: null };

describe('Analisis de suelo', () => {
  it('exige al menos un valor', () => {
    expect(errorAnalisisSuelo(vacio)).toContain('al menos un valor');
  });

  it('acepta un analisis parcial (solo pH)', () => {
    expect(errorAnalisisSuelo({ ...vacio, ph: 6.2 })).toBeNull();
  });

  it('acepta un analisis completo', () => {
    expect(
      errorAnalisisSuelo({ ph: 5.8, nitrogeno: 18, fosforo: 12, potasio: 140, materiaOrganica: 2.4, humedad: 22 }),
    ).toBeNull();
  });

  it('rechaza un pH fuera de 0 a 14', () => {
    expect(errorAnalisisSuelo({ ...vacio, ph: 15 })).toContain('pH');
    expect(errorAnalisisSuelo({ ...vacio, ph: 14 })).toBeNull();
    expect(errorAnalisisSuelo({ ...vacio, ph: 0 })).toBeNull();
  });

  it('acepta solo la humedad (medicion de campo) y rechaza mas de 100 %', () => {
    expect(errorAnalisisSuelo({ ...vacio, humedad: 22 })).toBeNull();
    expect(errorAnalisisSuelo({ ...vacio, humedad: 120 })).toContain('humedad');
  });

  it('rechaza valores negativos y materia organica mayor a 100 %', () => {
    expect(errorAnalisisSuelo({ ...vacio, potasio: -1 })).toContain('negativos');
    expect(errorAnalisisSuelo({ ...vacio, materiaOrganica: 101 })).toContain('100');
  });
});

describe('Registro de clima', () => {
  it('sin milimetros siempre es valido', () => {
    expect(errorRegistroClima('SOLEADO', null)).toBeNull();
    expect(errorRegistroClima('LLUVIA_FUERTE', null)).toBeNull();
  });

  it('los milimetros solo se aceptan en dias de lluvia', () => {
    expect(errorRegistroClima('LLUVIA_FUERTE', 35)).toBeNull();
    expect(errorRegistroClima('LLUVIA_LIGERA', 4)).toBeNull();
    expect(errorRegistroClima('SOLEADO', 10)).toContain('lluvia');
    expect(errorRegistroClima('SOLEADO', 0)).toBeNull();
  });

  it('rechaza milimetros negativos', () => {
    expect(errorRegistroClima('LLUVIA_LIGERA', -2)).toContain('negativos');
  });

  it('solo lluvia ligera y lluvia fuerte cuentan como lluvia', () => {
    expect(esLluvia('LLUVIA_LIGERA')).toBe(true);
    expect(esLluvia('LLUVIA_FUERTE')).toBe(true);
    expect(esLluvia('GRANIZO')).toBe(false);
    expect(esLluvia('NUBLADO')).toBe(false);
  });
});

describe('Fecha del dato', () => {
  const hoy = new Date('2026-11-14T15:30:00.000Z');
  it('hoy y dias pasados se aceptan; mañana no', () => {
    expect(esFechaFutura(new Date('2026-11-14T00:00:00.000Z'), hoy)).toBe(false);
    expect(esFechaFutura(new Date('2026-11-01T00:00:00.000Z'), hoy)).toBe(false);
    expect(esFechaFutura(new Date('2026-11-15T00:00:00.000Z'), hoy)).toBe(true);
  });
});
