// @nestjs/* v12 es ESM-only y Jest corre en CJS (Node < 24.9): se mockean solo
// los decoradores/excepciones; la logica del servicio corre intacta.
jest.mock('@nestjs/common', () => ({
  Injectable: () => () => undefined,
  Inject: () => () => undefined,
  BadRequestException: class BadRequestException extends Error {},
  NotFoundException: class NotFoundException extends Error {},
}));
jest.mock('@nestjs/swagger', () => ({
  ApiProperty: () => () => undefined,
  ApiPropertyOptional: () => () => undefined,
}));

import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  EstadoCampana,
  EstadoGasto,
  TipoActividad,
} from '../../../generated/prisma/enums';
import type { PrediccionService } from '../../prediccion/application/prediccion.service';
import type {
  ActividadReporte,
  CampanaReporte,
  MovimientosPeriodo,
  ReportesQueryPort,
} from '../domain/ports/reportes-query.port';
import { ReportesService } from './reportes.service';

const dia = (texto: string) => new Date(`${texto}T00:00:00.000Z`);
const AHORA = new Date('2026-11-02T15:30:00.000Z');

const CAMPANA: CampanaReporte = {
  id: 'camp_1',
  temporada: 'Verano 2025',
  estado: EstadoCampana.COSECHADA,
  fechaInicio: dia('2025-11-01'),
  fechaFin: dia('2026-03-15'),
  parcela: {
    id: 'parc_1',
    nombre: 'Parcela El Ceibo',
    hectareas: 10,
    ubicacionTexto: 'Km 12',
  },
  cultivo: { id: 'cult_1', nombre: 'Soya' },
  presupuestoTotal: 50000,
};

function actividad(extra: Partial<ActividadReporte>): ActividadReporte {
  return {
    id: 'act',
    secuencia: 1,
    tipo: TipoActividad.SIEMBRA,
    fecha: dia('2025-11-05'),
    descripcion: 'Siembra',
    insumo: null,
    cantidad: null,
    unidad: null,
    responsableNombre: 'Operativo',
    tercerizado: false,
    rendimientoTnHa: null,
    correccionDeId: null,
    ...extra,
  };
}

function crearServicio(
  campana: CampanaReporte | null = CAMPANA,
  movimientos: MovimientosPeriodo = { actividades: [], gastos: [] },
) {
  const query = {
    campanaParaReporte: jest.fn().mockResolvedValue(campana),
    movimientosDelPeriodo: jest.fn().mockResolvedValue(movimientos),
  };
  return {
    servicio: new ReportesService(
      query as unknown as ReportesQueryPort,
      {} as PrediccionService,
    ),
    query,
  };
}

describe('ReportesService.reporteCampana (RF-42)', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(AHORA);
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('periodo por defecto: fechas de la campana y fecha de generacion', async () => {
    const { servicio, query } = crearServicio();

    const reporte = await servicio.reporteCampana('camp_1', {});

    expect(reporte.periodo).toEqual({
      desde: dia('2025-11-01'),
      hasta: dia('2026-03-15'),
      porDefecto: true,
    });
    expect(reporte.generadoEn).toEqual(AHORA);
    expect(query.movimientosDelPeriodo).toHaveBeenCalledWith('camp_1', {
      desde: dia('2025-11-01'),
      hastaExclusivo: dia('2026-03-16'),
    });
  });

  it('filtro por rango: consulta solo el periodo pedido (hasta inclusivo)', async () => {
    const { servicio, query } = crearServicio();

    const reporte = await servicio.reporteCampana('camp_1', {
      desde: '2025-12-01',
      hasta: '2025-12-31',
    });

    expect(reporte.periodo).toEqual({
      desde: dia('2025-12-01'),
      hasta: dia('2025-12-31'),
      porDefecto: false,
    });
    expect(query.movimientosDelPeriodo).toHaveBeenCalledWith('camp_1', {
      desde: dia('2025-12-01'),
      hastaExclusivo: dia('2026-01-01'),
    });
  });

  it('400 si desde es posterior a hasta, sin consultar movimientos', async () => {
    const { servicio, query } = crearServicio();

    await expect(
      servicio.reporteCampana('camp_1', { desde: '2026-02-01', hasta: '2026-01-01' }),
    ).rejects.toThrow(BadRequestException);
    expect(query.movimientosDelPeriodo).not.toHaveBeenCalled();
  });

  it('400 tambien cuando solo desde queda despues del fin de la campana', async () => {
    const { servicio } = crearServicio();

    await expect(
      servicio.reporteCampana('camp_1', { desde: '2026-04-01' }),
    ).rejects.toThrow('posterior');
  });

  it('404 si la campana no existe', async () => {
    const { servicio } = crearServicio(null);

    await expect(servicio.reporteCampana('nada', {})).rejects.toThrow(
      NotFoundException,
    );
  });

  it('cosecha y costos salen de los movimientos del periodo', async () => {
    const { servicio } = crearServicio(CAMPANA, {
      actividades: [
        actividad({ id: 'a1', tipo: TipoActividad.SIEMBRA }),
        actividad({
          id: 'a2',
          tipo: TipoActividad.COSECHA,
          fecha: dia('2026-03-10'),
          rendimientoTnHa: 3,
        }),
      ],
      gastos: [
        { monto: 6000, estado: EstadoGasto.PAGADO, anulado: false },
        { monto: 1500, estado: EstadoGasto.COMPROMETIDO, anulado: false },
      ],
    });

    const reporte = await servicio.reporteCampana('camp_1', {});

    expect(reporte.actividades.map((a) => a.id)).toEqual(['a1', 'a2']);
    expect(reporte.cosecha).toEqual({ rendimientoTnHa: 3, fecha: dia('2026-03-10') });
    expect(reporte.costos).toEqual({
      gastado: 6000,
      comprometido: 1500,
      presupuesto: 50000,
      ahorro: 44000,
      costoPorHa: 600,
      costoPorTonelada: 200, // 6000 Bs / (3 t/ha x 10 ha)
    });
    expect(reporte.parcela.nombre).toBe('Parcela El Ceibo');
    expect(reporte.cultivo.nombre).toBe('Soya');
  });

  it('sin cosecha en el periodo: cosecha y costo por tonelada en null', async () => {
    const { servicio } = crearServicio(CAMPANA, {
      actividades: [actividad({ tipo: TipoActividad.FUMIGACION })],
      gastos: [{ monto: 100, estado: EstadoGasto.PAGADO, anulado: false }],
    });

    const reporte = await servicio.reporteCampana('camp_1', {});

    expect(reporte.cosecha).toBeNull();
    expect(reporte.costos.costoPorTonelada).toBeNull();
  });
});
