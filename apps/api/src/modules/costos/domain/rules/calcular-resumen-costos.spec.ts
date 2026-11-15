import {
  CategoriaGasto,
  EstadoGasto,
} from '../../../../generated/prisma/enums';
import { GastoEntity } from '../entities/gasto.entity';
import { calcularResumenCostos } from './calcular-resumen-costos';

function gasto(
  monto: number,
  estado: EstadoGasto,
  anulado = false,
): GastoEntity {
  const fecha = new Date('2026-07-01T00:00:00.000Z');
  return new GastoEntity(
    `g_${monto}_${estado}_${anulado}`,
    'camp_1',
    CategoriaGasto.OTROS,
    'Gasto de prueba',
    monto,
    fecha,
    estado,
    null,
    null,
    null,
    'user_1',
    anulado,
    anulado ? 'Registrado dos veces' : null,
    anulado ? fecha : null,
    fecha,
    fecha,
  );
}

const PAGADO = EstadoGasto.PAGADO;
const COMPROMETIDO = EstadoGasto.COMPROMETIDO;

describe('calcularResumenCostos (RF-30)', () => {
  it('separa lo pagado de lo comprometido', () => {
    const resumen = calcularResumenCostos({
      gastos: [
        gasto(1000, PAGADO),
        gasto(500.5, PAGADO),
        gasto(300, COMPROMETIDO),
        gasto(200, COMPROMETIDO),
      ],
      presupuesto: 5000,
      hectareas: 10,
      rendimientoTnHa: null,
    });

    expect(resumen.gastado).toBe(1500.5);
    expect(resumen.comprometido).toBe(500);
  });

  it('los gastos anulados no cuentan en ningun total', () => {
    const resumen = calcularResumenCostos({
      gastos: [
        gasto(1000, PAGADO),
        gasto(9999, PAGADO, true),
        gasto(300, COMPROMETIDO),
        gasto(8888, COMPROMETIDO, true),
      ],
      presupuesto: 2000,
      hectareas: 10,
      rendimientoTnHa: null,
    });

    expect(resumen.gastado).toBe(1000);
    expect(resumen.comprometido).toBe(300);
    expect(resumen.ahorro).toBe(1000);
  });

  it('ahorro = presupuesto - gasto real (solo pagado), puede ser negativo', () => {
    const conAhorro = calcularResumenCostos({
      gastos: [gasto(1000, PAGADO), gasto(700, COMPROMETIDO)],
      presupuesto: 1800,
      hectareas: 10,
      rendimientoTnHa: null,
    });
    // El comprometido (700) NO se resta del ahorro.
    expect(conAhorro.ahorro).toBe(800);

    const sobrepasado = calcularResumenCostos({
      gastos: [gasto(2500, PAGADO)],
      presupuesto: 2000,
      hectareas: 10,
      rendimientoTnHa: null,
    });
    expect(sobrepasado.ahorro).toBe(-500);
  });

  it('ahorro es null si la campana no tiene presupuesto', () => {
    const resumen = calcularResumenCostos({
      gastos: [gasto(1000, PAGADO)],
      presupuesto: null,
      hectareas: 10,
      rendimientoTnHa: null,
    });

    expect(resumen.presupuesto).toBeNull();
    expect(resumen.ahorro).toBeNull();
    expect(resumen.gastado).toBe(1000);
  });

  it('costo por ha = gasto real / hectareas (redondeado a 2 decimales)', () => {
    const resumen = calcularResumenCostos({
      gastos: [gasto(1000, PAGADO), gasto(5000, COMPROMETIDO)],
      presupuesto: 5000,
      hectareas: 3,
      rendimientoTnHa: null,
    });

    expect(resumen.costoPorHa).toBe(333.33);
  });

  it('costo por ha es null si la parcela no tiene hectareas', () => {
    const resumen = calcularResumenCostos({
      gastos: [gasto(1000, PAGADO)],
      presupuesto: 5000,
      hectareas: 0,
      rendimientoTnHa: null,
    });

    expect(resumen.costoPorHa).toBeNull();
  });

  describe('costo por tonelada', () => {
    it('es null si no hay produccion real registrada', () => {
      const resumen = calcularResumenCostos({
        gastos: [gasto(1000, PAGADO)],
        presupuesto: 5000,
        hectareas: 10,
        rendimientoTnHa: null,
      });

      expect(resumen.costoPorTonelada).toBeNull();
    });

    it('es null si el rendimiento registrado es 0', () => {
      const resumen = calcularResumenCostos({
        gastos: [gasto(1000, PAGADO)],
        presupuesto: 5000,
        hectareas: 10,
        rendimientoTnHa: 0,
      });

      expect(resumen.costoPorTonelada).toBeNull();
    });

    it('con produccion = gasto real / (rendimiento t/ha x hectareas)', () => {
      const resumen = calcularResumenCostos({
        gastos: [gasto(6000, PAGADO), gasto(4000, COMPROMETIDO)],
        presupuesto: 8000,
        hectareas: 10,
        rendimientoTnHa: 3,
      });

      // 6000 Bs pagados / 30 t = 200 Bs/t (el comprometido no entra).
      expect(resumen.costoPorTonelada).toBe(200);
    });
  });

  it('sin gastos devuelve ceros (no null) y el ahorro es todo el presupuesto', () => {
    const resumen = calcularResumenCostos({
      gastos: [],
      presupuesto: 1000,
      hectareas: 5,
      rendimientoTnHa: null,
    });

    expect(resumen).toEqual({
      gastado: 0,
      comprometido: 0,
      presupuesto: 1000,
      ahorro: 1000,
      costoPorHa: 0,
      costoPorTonelada: null,
    });
  });
});
