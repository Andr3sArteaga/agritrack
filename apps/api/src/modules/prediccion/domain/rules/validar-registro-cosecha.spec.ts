import {
  errorDatosCosecha,
  errorDatosSiembra,
  esFechaFutura,
} from './validar-registro-cosecha';

const dia = (texto: string): Date => new Date(`${texto}T00:00:00.000Z`);
const HOY = new Date('2026-11-15T14:00:00.000Z');

describe('Validacion de registro de siembra y cosecha', () => {
  describe('esFechaFutura', () => {
    it('acepta hoy y fechas pasadas; rechaza mañana', () => {
      expect(esFechaFutura(dia('2026-11-15'), HOY)).toBe(false);
      expect(esFechaFutura(dia('2026-10-01'), HOY)).toBe(false);
      expect(esFechaFutura(dia('2026-11-16'), HOY)).toBe(true);
    });
  });

  describe('errorDatosSiembra', () => {
    it('acepta una siembra valida', () => {
      expect(
        errorDatosSiembra(
          { haSembradas: 25.5, variedad: '6410', fechaSiembra: dia('2026-11-01') },
          null,
          HOY,
        ),
      ).toBeNull();
    });

    it('exige hectareas sembradas mayores a 0', () => {
      expect(
        errorDatosSiembra(
          { haSembradas: 0, variedad: null, fechaSiembra: null },
          null,
          HOY,
        ),
      ).toContain('mayores a 0');
      expect(
        errorDatosSiembra(
          { haSembradas: -5, variedad: null, fechaSiembra: null },
          null,
          HOY,
        ),
      ).toContain('mayores a 0');
    });

    it('rechaza fecha de siembra futura', () => {
      expect(
        errorDatosSiembra(
          { haSembradas: 20, variedad: 'MUNASQA', fechaSiembra: dia('2026-11-16') },
          null,
          HOY,
        ),
      ).toContain('futura');
    });

    it('no permite reducir hectareas sembradas por debajo de las ya cosechadas', () => {
      expect(
        errorDatosSiembra(
          { haSembradas: 15, variedad: '6410', fechaSiembra: dia('2026-09-01') },
          { haCosechadas: 20, fechaCosecha: dia('2026-11-10') },
          HOY,
        ),
      ).toContain('menores a las ya cosechadas');
    });

    it('exige que la siembra sea anterior a una cosecha ya cargada', () => {
      expect(
        errorDatosSiembra(
          { haSembradas: 25, variedad: '6410', fechaSiembra: dia('2026-11-10') },
          { haCosechadas: 25, fechaCosecha: dia('2026-11-10') },
          HOY,
        ),
      ).toContain('anterior a la fecha de cosecha');
    });
  });

  describe('errorDatosCosecha', () => {
    const siembra = { haSembradas: 25, fechaSiembra: dia('2026-08-01') };

    it('acepta una cosecha valida con toneladas 0 o positivas', () => {
      expect(
        errorDatosCosecha(
          { haCosechadas: 25, toneladas: 62.5, fechaCosecha: dia('2026-11-10') },
          siembra,
          HOY,
        ),
      ).toBeNull();
      expect(
        errorDatosCosecha(
          { haCosechadas: 10, toneladas: 0, fechaCosecha: dia('2026-11-10') },
          siembra,
          HOY,
        ),
      ).toBeNull();
    });

    it('exige siembra previa', () => {
      expect(
        errorDatosCosecha(
          { haCosechadas: 10, toneladas: 20, fechaCosecha: dia('2026-11-10') },
          null,
          HOY,
        ),
      ).toContain('siembra');
    });

    it('exige hectareas cosechadas > 0 y <= haSembradas', () => {
      expect(
        errorDatosCosecha(
          { haCosechadas: 0, toneladas: 0, fechaCosecha: dia('2026-11-10') },
          siembra,
          HOY,
        ),
      ).toContain('mayores a 0');
      expect(
        errorDatosCosecha(
          { haCosechadas: 26, toneladas: 50, fechaCosecha: dia('2026-11-10') },
          siembra,
          HOY,
        ),
      ).toContain('superar a las hectáreas sembradas');
    });

    it('rechaza toneladas negativas', () => {
      expect(
        errorDatosCosecha(
          { haCosechadas: 20, toneladas: -1, fechaCosecha: dia('2026-11-10') },
          siembra,
          HOY,
        ),
      ).toContain('negativas');
    });

    it('rechaza fecha de cosecha futura o igual/anterior a la siembra', () => {
      expect(
        errorDatosCosecha(
          { haCosechadas: 20, toneladas: 40, fechaCosecha: dia('2026-11-16') },
          siembra,
          HOY,
        ),
      ).toContain('futura');
      expect(
        errorDatosCosecha(
          { haCosechadas: 20, toneladas: 40, fechaCosecha: dia('2026-08-01') },
          siembra,
          HOY,
        ),
      ).toContain('posterior a la fecha de siembra');
    });
  });
});
