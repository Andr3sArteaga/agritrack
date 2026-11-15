// @nestjs/* v12 es ESM-only y Jest corre en CJS (Node < 24.9): se mockean solo
// los decoradores/excepciones; la logica del servicio corre intacta.
jest.mock('@nestjs/common', () => ({
  Injectable: () => () => undefined,
  Inject: () => () => undefined,
  ConflictException: class ConflictException extends Error {},
  NotFoundException: class NotFoundException extends Error {},
}));
jest.mock('@nestjs/swagger', () => ({
  ApiProperty: () => () => undefined,
  ApiPropertyOptional: () => () => undefined,
}));
// RF-57: hoy la regla siempre permite; aqui se controla para probar el bloqueo.
jest.mock('../domain/rules/campana-permite-gastos', () => ({
  campanaPermiteGastos: jest.fn(() => true),
}));

import { ConflictException, NotFoundException } from '@nestjs/common';
import type { CampanaEntity } from '../../campanas/domain/entities/campana.entity';
import type { CampanaRepository } from '../../campanas/domain/repositories/campana.repository';
import { PresupuestoEntity } from '../domain/entities/presupuesto.entity';
import type { PresupuestoRepository } from '../domain/repositories/presupuesto.repository';
import { campanaPermiteGastos } from '../domain/rules/campana-permite-gastos';
import { PresupuestosService } from './presupuestos.service';

const permiteGastos = jest.mocked(campanaPermiteGastos);
const FECHA = new Date('2026-01-01T00:00:00.000Z');

function crearServicio() {
  const presupuestos = {
    findByCampana: jest.fn(),
    guardar: jest.fn((campanaId: string, montoTotal: number, notas: string | null) =>
      Promise.resolve(
        new PresupuestoEntity('pres_1', campanaId, montoTotal, notas, FECHA, FECHA),
      ),
    ),
  };
  const campanas = {
    findById: jest.fn().mockResolvedValue({ id: 'camp_1' } as CampanaEntity),
  };
  return {
    servicio: new PresupuestosService(
      presupuestos as unknown as PresupuestoRepository,
      campanas as unknown as CampanaRepository,
    ),
    presupuestos,
    campanas,
  };
}

describe('PresupuestosService', () => {
  beforeEach(() => {
    permiteGastos.mockReset();
    permiteGastos.mockReturnValue(true);
  });

  it('guarda un unico presupuesto total por campana (RF-29)', async () => {
    const { servicio, presupuestos } = crearServicio();

    const guardado = await servicio.guardar('camp_1', { montoTotal: 63425.85 });

    expect(presupuestos.guardar).toHaveBeenCalledWith('camp_1', 63425.85, null);
    expect(guardado.montoTotal).toBe(63425.85);
  });

  it('conserva las notas cuando se envian', async () => {
    const { servicio, presupuestos } = crearServicio();

    await servicio.guardar('camp_1', { montoTotal: 1000, notas: 'Ajustado' });

    expect(presupuestos.guardar).toHaveBeenCalledWith('camp_1', 1000, 'Ajustado');
  });

  it('404 al guardar u obtener en una campana inexistente', async () => {
    const { servicio, campanas } = crearServicio();
    campanas.findById.mockResolvedValue(null);

    await expect(
      servicio.guardar('x', { montoTotal: 1000 }),
    ).rejects.toThrow(NotFoundException);
    await expect(servicio.obtener('x')).rejects.toThrow(NotFoundException);
  });

  it('404 si la campana todavia no tiene presupuesto', async () => {
    const { servicio, presupuestos } = crearServicio();
    presupuestos.findByCampana.mockResolvedValue(null);

    await expect(servicio.obtener('camp_1')).rejects.toThrow(
      'todavia no tiene presupuesto',
    );
  });

  it('bloquea el cambio de presupuesto si la campana no permite gastos (RF-57)', async () => {
    const { servicio, presupuestos } = crearServicio();
    permiteGastos.mockReturnValue(false);

    await expect(
      servicio.guardar('camp_1', { montoTotal: 1000 }),
    ).rejects.toThrow(ConflictException);
    expect(presupuestos.guardar).not.toHaveBeenCalled();
  });
});
