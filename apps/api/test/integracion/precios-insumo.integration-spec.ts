/**
 * PRUEBA DE INTEGRACION (RF-26): el precio vigente de un insumo segun la fecha
 * se resuelve en la consulta del repositorio, asi que se prueba contra
 * PostgreSQL real (base agritrack_test, ver cadena-integridad.integration-spec).
 */
// @nestjs/* v12 es ESM-only y Jest corre en CJS (Node < 24.9): solo se
// mockean decoradores y el PrismaService (que depende de @nestjs/config).
jest.mock('@nestjs/common', () => ({
  Injectable: () => () => undefined,
  Inject: () => () => undefined,
}));
jest.mock('../../src/shared/prisma/prisma.service', () => ({
  PrismaService: class {},
}));

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client';
import { InsumoPrismaRepository } from '../../src/modules/costos/infrastructure/insumo.prisma.repository';
import type { PrismaService } from '../../src/shared/prisma/prisma.service';

const URL_PRUEBAS =
  process.env.DATABASE_URL_TEST ??
  'postgresql://agritrack:agritrack@localhost:5433/agritrack_test?schema=public';

if (!/\/[^/?]*_test(\?|$)/.test(URL_PRUEBAS)) {
  throw new Error(
    'La prueba de integracion borra datos: la base debe terminar en "_test".',
  );
}

const dia = (fecha: string): Date => new Date(`${fecha}T00:00:00.000Z`);

describe('Precio vigente de un insumo segun la fecha (PostgreSQL real)', () => {
  let prisma: PrismaClient;
  let repositorio: InsumoPrismaRepository;
  let insumoId: string;

  beforeAll(() => {
    prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString: URL_PRUEBAS }),
    });
    repositorio = new InsumoPrismaRepository(prisma as unknown as PrismaService);
  });

  beforeEach(async () => {
    await prisma.$executeRawUnsafe(
      'TRUNCATE precios_insumo, insumos RESTART IDENTITY CASCADE',
    );
    const insumo = await repositorio.create({
      nombre: 'Semilla de soya IT',
      tipo: 'SEMILLA',
      unidad: 'kg',
      precioInicial: 8.8,
      vigenteDesde: dia('2024-10-01'),
    });
    insumoId = insumo.id;
    await repositorio.agregarPrecio(insumoId, 9.5, dia('2025-10-01'));
    // Precio futuro (programado): no debe regir todavia.
    await repositorio.agregarPrecio(insumoId, 99, dia('2999-01-01'));
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('devuelve el ultimo precio cuya vigencia ya comenzo en esa fecha', async () => {
    const enPrimerPeriodo = await repositorio.findPrecioVigente(
      insumoId,
      dia('2025-03-15'),
    );
    const enSegundoPeriodo = await repositorio.findPrecioVigente(
      insumoId,
      dia('2026-02-01'),
    );

    expect(enPrimerPeriodo?.precio).toBe(8.8);
    expect(enSegundoPeriodo?.precio).toBe(9.5);
  });

  it('el dia exacto del cambio ya rige el precio nuevo; el dia anterior, el viejo', async () => {
    const vispera = await repositorio.findPrecioVigente(
      insumoId,
      dia('2025-09-30'),
    );
    const diaDelCambio = await repositorio.findPrecioVigente(
      insumoId,
      dia('2025-10-01'),
    );

    expect(vispera?.precio).toBe(8.8);
    expect(diaDelCambio?.precio).toBe(9.5);
  });

  it('antes del primer precio no hay precio vigente (null)', async () => {
    const precio = await repositorio.findPrecioVigente(
      insumoId,
      dia('2024-09-30'),
    );

    expect(precio).toBeNull();
  });

  it('el precio futuro no cuenta como vigente hoy', async () => {
    const insumo = await repositorio.findById(insumoId);

    expect(insumo?.precioVigente).toBe(9.5);
  });

  it('el historial conserva todos los precios, el mas reciente primero', async () => {
    const historial = await repositorio.findPrecios(insumoId);

    expect(historial.map((p) => p.precio)).toEqual([99, 9.5, 8.8]);
  });
});
