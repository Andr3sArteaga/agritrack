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
  OmitType: <T>(clase: T) => clase,
  PartialType: <T>(clase: T) => clase,
}));

import { ConflictException, NotFoundException } from '@nestjs/common';
import { TipoInsumo } from '../../../generated/prisma/enums';
import { InsumoEntity } from '../domain/entities/insumo.entity';
import { PrecioInsumoEntity } from '../domain/entities/precio-insumo.entity';
import type { InsumoRepository } from '../domain/repositories/insumo.repository';
import { InsumosService } from './insumos.service';

const FECHA = new Date('2026-01-01T00:00:00.000Z');

function unInsumo(nombre = 'Semilla de soya'): InsumoEntity {
  return new InsumoEntity(
    'ins_1',
    nombre,
    TipoInsumo.SEMILLA,
    'kg',
    true,
    9.5,
    FECHA,
    FECHA,
    FECHA,
  );
}

function crearServicio() {
  const repo = {
    findAll: jest.fn().mockResolvedValue([unInsumo()]),
    findById: jest.fn().mockResolvedValue(unInsumo()),
    findByNombre: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue(unInsumo()),
    update: jest.fn().mockResolvedValue(unInsumo()),
    findPrecios: jest.fn(),
    agregarPrecio: jest.fn(
      (insumoId: string, precio: number, vigenteDesde: Date) =>
        Promise.resolve(
          new PrecioInsumoEntity('p_nuevo', insumoId, precio, vigenteDesde, FECHA),
        ),
    ),
  };
  return {
    servicio: new InsumosService(repo as unknown as InsumoRepository),
    repo,
  };
}

describe('InsumosService', () => {
  describe('create', () => {
    it('crea el insumo con su precio inicial', async () => {
      const { servicio, repo } = crearServicio();

      await servicio.create({
        nombre: 'Urea',
        tipo: TipoInsumo.FERTILIZANTE,
        unidad: 'kg',
        precioInicial: 4.5,
        vigenteDesde: '2026-03-01',
      });

      expect(repo.create).toHaveBeenCalledWith({
        nombre: 'Urea',
        tipo: TipoInsumo.FERTILIZANTE,
        unidad: 'kg',
        precioInicial: 4.5,
        vigenteDesde: new Date('2026-03-01'),
      });
    });

    it('rechaza un nombre repetido', async () => {
      const { servicio, repo } = crearServicio();
      repo.findByNombre.mockResolvedValue(unInsumo('Urea'));

      await expect(
        servicio.create({
          nombre: 'Urea',
          tipo: TipoInsumo.FERTILIZANTE,
          unidad: 'kg',
          precioInicial: 4.5,
        }),
      ).rejects.toThrow(ConflictException);
      expect(repo.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('404 si el insumo no existe', async () => {
      const { servicio, repo } = crearServicio();
      repo.findById.mockResolvedValue(null);

      await expect(servicio.update('x', { activo: false })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('no deja renombrar a un nombre que ya existe', async () => {
      const { servicio, repo } = crearServicio();
      repo.findByNombre.mockResolvedValue(unInsumo('Urea'));

      await expect(
        servicio.update('ins_1', { nombre: 'Urea' }),
      ).rejects.toThrow(ConflictException);
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('permite guardar con su propio nombre sin validar duplicado', async () => {
      const { servicio, repo } = crearServicio();

      await servicio.update('ins_1', { nombre: 'Semilla de soya', activo: false });

      expect(repo.findByNombre).not.toHaveBeenCalled();
      expect(repo.update).toHaveBeenCalled();
    });
  });

  describe('historial de precios', () => {
    it('agregar un precio nuevo no toca los anteriores (solo agrega)', async () => {
      const { servicio, repo } = crearServicio();

      const precio = await servicio.agregarPrecio('ins_1', {
        precio: 10,
        vigenteDesde: '2026-10-01',
      });

      expect(repo.agregarPrecio).toHaveBeenCalledWith(
        'ins_1',
        10,
        new Date('2026-10-01'),
      );
      expect(repo.update).not.toHaveBeenCalled();
      expect(precio.precio).toBe(10);
    });

    it('sin vigenteDesde el precio rige desde ahora', async () => {
      const { servicio, repo } = crearServicio();

      await servicio.agregarPrecio('ins_1', { precio: 10 });

      const [, , desde] = repo.agregarPrecio.mock.calls[0] as [
        string,
        number,
        Date,
      ];
      expect(Math.abs(desde.getTime() - Date.now())).toBeLessThan(5000);
    });

    it('404 al agregar o listar precios de un insumo inexistente', async () => {
      const { servicio, repo } = crearServicio();
      repo.findById.mockResolvedValue(null);

      await expect(
        servicio.agregarPrecio('x', { precio: 1 }),
      ).rejects.toThrow(NotFoundException);
      await expect(servicio.listarPrecios('x')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('lista el historial tal como lo entrega el repositorio', async () => {
      const { servicio, repo } = crearServicio();
      repo.findPrecios.mockResolvedValue([
        new PrecioInsumoEntity('p2', 'ins_1', 9.5, new Date('2025-10-01'), FECHA),
        new PrecioInsumoEntity('p1', 'ins_1', 8.8, new Date('2024-10-01'), FECHA),
      ]);

      const precios = await servicio.listarPrecios('ins_1');

      expect(precios.map((p) => p.precio)).toEqual([9.5, 8.8]);
    });
  });
});
