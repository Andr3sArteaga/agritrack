// @nestjs/* v12 es ESM-only y Jest corre en CJS (Node < 24.9): se mockean solo
// los decoradores/excepciones; la logica del servicio corre intacta.
jest.mock('@nestjs/common', () => ({
  Injectable: () => () => undefined,
  Inject: () => () => undefined,
  BadRequestException: class BadRequestException extends Error {},
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

import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import {
  CategoriaGasto,
  EstadoGasto,
  TipoInsumo,
} from '../../../generated/prisma/enums';
import type { CampanaEntity } from '../../campanas/domain/entities/campana.entity';
import type { CampanaRepository } from '../../campanas/domain/repositories/campana.repository';
import { GastoEntity } from '../domain/entities/gasto.entity';
import { InsumoEntity } from '../domain/entities/insumo.entity';
import { PrecioInsumoEntity } from '../domain/entities/precio-insumo.entity';
import type { GastoRepository } from '../domain/repositories/gasto.repository';
import type { InsumoRepository } from '../domain/repositories/insumo.repository';
import { campanaPermiteGastos } from '../domain/rules/campana-permite-gastos';
import type { CreateGastoDto } from './dto/create-gasto.dto';
import { GastosService } from './gastos.service';

const permiteGastos = jest.mocked(campanaPermiteGastos);

const CAMPANA = { id: 'camp_1' } as CampanaEntity;
const FECHA = new Date('2026-07-01T00:00:00.000Z');

function unGasto(extra: Partial<GastoEntity> = {}): GastoEntity {
  return Object.assign(
    new GastoEntity(
      'gasto_1',
      'camp_1',
      CategoriaGasto.OTROS,
      'Gasto de prueba',
      1000,
      FECHA,
      EstadoGasto.PAGADO,
      null,
      null,
      null,
      'user_1',
      false,
      null,
      null,
      FECHA,
      FECHA,
    ),
    extra,
  );
}

function unInsumo(extra: Partial<InsumoEntity> = {}): InsumoEntity {
  return Object.assign(
    new InsumoEntity(
      'ins_1',
      'Semilla de soya',
      TipoInsumo.SEMILLA,
      'kg',
      true,
      9.5,
      FECHA,
      FECHA,
      FECHA,
    ),
    extra,
  );
}

function crearServicio() {
  const gastos = {
    findByCampana: jest.fn(),
    findById: jest.fn(),
    create: jest.fn((data: Partial<GastoEntity>) =>
      Promise.resolve(unGasto({ id: 'nuevo', ...data })),
    ),
    update: jest.fn((id: string, data: Partial<GastoEntity>) =>
      Promise.resolve(unGasto({ id, ...stripUndefined(data) })),
    ),
    anular: jest.fn((id: string, motivo: string, anuladoEn: Date) =>
      Promise.resolve(
        unGasto({ id, anulado: true, motivoAnulacion: motivo, anuladoEn }),
      ),
    ),
  };
  const insumos = {
    findById: jest.fn(),
    findPrecioVigente: jest.fn(),
  };
  const campanas = { findById: jest.fn().mockResolvedValue(CAMPANA) };

  return {
    servicio: new GastosService(
      gastos as unknown as GastoRepository,
      insumos as unknown as InsumoRepository,
      campanas as unknown as CampanaRepository,
    ),
    gastos,
    insumos,
    campanas,
  };
}

function stripUndefined<T extends object>(data: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(data).filter(([, valor]) => valor !== undefined),
  ) as Partial<T>;
}

function dtoManual(extra: Partial<CreateGastoDto> = {}): CreateGastoDto {
  return {
    campanaId: 'camp_1',
    categoria: CategoriaGasto.MAQUINARIA,
    descripcion: 'Alquiler de cosechadora',
    fecha: '2026-07-01',
    estado: EstadoGasto.PAGADO,
    monto: 4500,
    ...extra,
  };
}

describe('GastosService', () => {
  beforeEach(() => {
    permiteGastos.mockReset();
    permiteGastos.mockReturnValue(true);
  });

  describe('crear', () => {
    it('registra un gasto manual con el monto indicado', async () => {
      const { servicio, gastos } = crearServicio();

      const creado = await servicio.crear(dtoManual(), 'user_1');

      expect(gastos.create).toHaveBeenCalledWith(
        expect.objectContaining({
          campanaId: 'camp_1',
          monto: 4500,
          insumoId: null,
          cantidad: null,
          precioUnitario: null,
          registradoPorId: 'user_1',
        }),
      );
      expect(creado.monto).toBe(4500);
    });

    it('rechaza una campana inexistente', async () => {
      const { servicio, campanas } = crearServicio();
      campanas.findById.mockResolvedValue(null);

      await expect(servicio.crear(dtoManual(), 'user_1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('rechaza cantidad sin insumo del catalogo', async () => {
      const { servicio, gastos } = crearServicio();

      await expect(
        servicio.crear(dtoManual({ cantidad: 3 }), 'user_1'),
      ).rejects.toThrow(BadRequestException);
      expect(gastos.create).not.toHaveBeenCalled();
    });

    describe('con insumo del catalogo (precio vigente segun la fecha)', () => {
      const dtoInsumo = (extra: Partial<CreateGastoDto> = {}) =>
        dtoManual({
          categoria: CategoriaGasto.INSUMOS,
          insumoId: 'ins_1',
          cantidad: 100,
          monto: undefined,
          ...extra,
        });

      it('monto = cantidad x precio vigente a la fecha del gasto', async () => {
        const { servicio, gastos, insumos } = crearServicio();
        insumos.findById.mockResolvedValue(unInsumo());
        insumos.findPrecioVigente.mockResolvedValue(
          new PrecioInsumoEntity('p1', 'ins_1', 8.8, FECHA, FECHA),
        );

        await servicio.crear(dtoInsumo({ fecha: '2025-03-10' }), 'user_1');

        // Consulta el precio vigente a la fecha del GASTO, no a "hoy".
        expect(insumos.findPrecioVigente).toHaveBeenCalledWith(
          'ins_1',
          new Date('2025-03-10'),
        );
        expect(gastos.create).toHaveBeenCalledWith(
          expect.objectContaining({
            insumoId: 'ins_1',
            cantidad: 100,
            precioUnitario: 8.8,
            monto: 880,
          }),
        );
      });

      it('gastos en fechas distintas usan el precio de cada fecha', async () => {
        const { servicio, gastos, insumos } = crearServicio();
        insumos.findById.mockResolvedValue(unInsumo());
        insumos.findPrecioVigente.mockImplementation(
          (_id: string, fecha: Date) =>
            Promise.resolve(
              new PrecioInsumoEntity(
                'p',
                'ins_1',
                fecha < new Date('2025-10-01') ? 8.8 : 9.5,
                FECHA,
                FECHA,
              ),
            ),
        );

        await servicio.crear(dtoInsumo({ fecha: '2025-09-30' }), 'user_1');
        await servicio.crear(dtoInsumo({ fecha: '2025-10-01' }), 'user_1');

        const montos = gastos.create.mock.calls.map(
          ([data]) => (data as { monto: number }).monto,
        );
        expect(montos).toEqual([880, 950]);
      });

      it('redondea el monto a 2 decimales', async () => {
        const { servicio, gastos, insumos } = crearServicio();
        insumos.findById.mockResolvedValue(unInsumo());
        insumos.findPrecioVigente.mockResolvedValue(
          new PrecioInsumoEntity('p1', 'ins_1', 3.72, FECHA, FECHA),
        );

        await servicio.crear(dtoInsumo({ cantidad: 1.3333 }), 'user_1');

        expect(gastos.create).toHaveBeenCalledWith(
          expect.objectContaining({ monto: 4.96 }),
        );
      });

      it('falla si no hay precio vigente a esa fecha', async () => {
        const { servicio, gastos, insumos } = crearServicio();
        insumos.findById.mockResolvedValue(unInsumo());
        insumos.findPrecioVigente.mockResolvedValue(null);

        await expect(
          servicio.crear(dtoInsumo({ fecha: '2020-01-01' }), 'user_1'),
        ).rejects.toThrow('precio vigente');
        expect(gastos.create).not.toHaveBeenCalled();
      });

      it('exige categoria INSUMOS', async () => {
        const { servicio } = crearServicio();

        await expect(
          servicio.crear(
            dtoInsumo({ categoria: CategoriaGasto.OTROS }),
            'user_1',
          ),
        ).rejects.toThrow(BadRequestException);
      });

      it('rechaza un insumo inexistente o desactivado', async () => {
        const { servicio, insumos } = crearServicio();

        insumos.findById.mockResolvedValue(null);
        await expect(servicio.crear(dtoInsumo(), 'user_1')).rejects.toThrow(
          NotFoundException,
        );

        insumos.findById.mockResolvedValue(unInsumo({ activo: false }));
        await expect(servicio.crear(dtoInsumo(), 'user_1')).rejects.toThrow(
          'desactivado',
        );
      });
    });
  });

  describe('editar', () => {
    it('actualiza descripcion, fecha y estado de un gasto manual', async () => {
      const { servicio, gastos } = crearServicio();
      gastos.findById.mockResolvedValue(unGasto());

      await servicio.editar('gasto_1', {
        estado: EstadoGasto.COMPROMETIDO,
        monto: 1200,
        fecha: '2026-08-01',
      });

      expect(gastos.update).toHaveBeenCalledWith('gasto_1', {
        categoria: undefined,
        descripcion: undefined,
        monto: 1200,
        fecha: new Date('2026-08-01'),
        estado: EstadoGasto.COMPROMETIDO,
      });
    });

    it('en un gasto de insumo no deja cambiar el monto ni la categoria', async () => {
      const { servicio, gastos } = crearServicio();
      gastos.findById.mockResolvedValue(
        unGasto({
          insumoId: 'ins_1',
          categoria: CategoriaGasto.INSUMOS,
          cantidad: 10,
          precioUnitario: 5,
        }),
      );

      await expect(servicio.editar('gasto_1', { monto: 1 })).rejects.toThrow(
        BadRequestException,
      );
      await expect(
        servicio.editar('gasto_1', { categoria: CategoriaGasto.OTROS }),
      ).rejects.toThrow(BadRequestException);
      expect(gastos.update).not.toHaveBeenCalled();

      // Descripcion, fecha y estado si se pueden editar.
      await servicio.editar('gasto_1', { descripcion: 'Semilla lote 2' });
      expect(gastos.update).toHaveBeenCalledTimes(1);
    });

    it('no permite editar un gasto anulado', async () => {
      const { servicio, gastos } = crearServicio();
      gastos.findById.mockResolvedValue(unGasto({ anulado: true }));

      await expect(
        servicio.editar('gasto_1', { descripcion: 'otra cosa' }),
      ).rejects.toThrow(ConflictException);
      expect(gastos.update).not.toHaveBeenCalled();
    });

    it('404 si el gasto no existe', async () => {
      const { servicio, gastos } = crearServicio();
      gastos.findById.mockResolvedValue(null);

      await expect(servicio.editar('x', {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('anular (sin borrar, con motivo)', () => {
    it('marca el gasto como anulado guardando el motivo y la fecha', async () => {
      const { servicio, gastos } = crearServicio();
      gastos.findById.mockResolvedValue(unGasto());

      const anulado = await servicio.anular('gasto_1', {
        motivo: 'Registrado dos veces',
      });

      expect(gastos.anular).toHaveBeenCalledWith(
        'gasto_1',
        'Registrado dos veces',
        expect.any(Date),
      );
      expect(anulado.anulado).toBe(true);
      expect(anulado.motivoAnulacion).toBe('Registrado dos veces');
    });

    it('no anula dos veces el mismo gasto', async () => {
      const { servicio, gastos } = crearServicio();
      gastos.findById.mockResolvedValue(
        unGasto({ anulado: true, motivoAnulacion: 'ya anulado' }),
      );

      await expect(
        servicio.anular('gasto_1', { motivo: 'otra vez' }),
      ).rejects.toThrow(ConflictException);
      expect(gastos.anular).not.toHaveBeenCalled();
    });

    it('404 si el gasto no existe', async () => {
      const { servicio, gastos } = crearServicio();
      gastos.findById.mockResolvedValue(null);

      await expect(
        servicio.anular('x', { motivo: 'no existe' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('bloqueo cuando la campana no permite gastos (RF-57)', () => {
    beforeEach(() => {
      permiteGastos.mockReturnValue(false);
    });

    it('no deja crear', async () => {
      const { servicio, gastos } = crearServicio();

      await expect(servicio.crear(dtoManual(), 'user_1')).rejects.toThrow(
        ConflictException,
      );
      expect(gastos.create).not.toHaveBeenCalled();
    });

    it('no deja editar', async () => {
      const { servicio, gastos } = crearServicio();
      gastos.findById.mockResolvedValue(unGasto());

      await expect(
        servicio.editar('gasto_1', { descripcion: 'cambio' }),
      ).rejects.toThrow(ConflictException);
      expect(gastos.update).not.toHaveBeenCalled();
    });

    it('no deja anular', async () => {
      const { servicio, gastos } = crearServicio();
      gastos.findById.mockResolvedValue(unGasto());

      await expect(
        servicio.anular('gasto_1', { motivo: 'campana cerrada' }),
      ).rejects.toThrow(ConflictException);
      expect(gastos.anular).not.toHaveBeenCalled();
    });

    it('consulta la regla con la campana del gasto', async () => {
      const { servicio } = crearServicio();

      await servicio.crear(dtoManual(), 'user_1').catch(() => undefined);

      expect(permiteGastos).toHaveBeenCalledWith(CAMPANA);
    });
  });

  describe('listar', () => {
    it('excluye anulados por defecto y los incluye si se pide', async () => {
      const { servicio, gastos } = crearServicio();
      gastos.findByCampana.mockResolvedValue([unGasto()]);

      await servicio.listar({ campanaId: 'camp_1' });
      await servicio.listar({ campanaId: 'camp_1', incluirAnulados: true });

      expect(gastos.findByCampana).toHaveBeenNthCalledWith(1, 'camp_1', false);
      expect(gastos.findByCampana).toHaveBeenNthCalledWith(2, 'camp_1', true);
    });
  });
});
