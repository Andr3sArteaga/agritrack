import {
  impedirProduccion,
  leerLotesDemo,
  leerTotalesDemo,
  sembrarDemo,
} from './datos-demo';
import type { PrismaClient } from '../../../src/generated/prisma/client';

const LOCAL = 'postgresql://agritrack:agritrack@localhost:5433/agritrack?schema=public';
const REMOTA = 'postgresql://usuario:clave@db.empresa.com:5432/agritrack';

describe('Seed de demostracion: candado de produccion', () => {
  const entornoOriginal = process.env.NODE_ENV;
  afterEach(() => {
    process.env.NODE_ENV = entornoOriginal;
    delete process.env.PERMITIR_SEED_DEMO_REMOTO;
  });

  it('se niega a correr con NODE_ENV=production, aunque la base sea local', () => {
    process.env.NODE_ENV = 'production';
    expect(() => impedirProduccion(LOCAL)).toThrow('producción');
  });

  it('se niega a correr contra una base que no es local', () => {
    expect(() => impedirProduccion(REMOTA)).toThrow('base local');
    expect(() => impedirProduccion(undefined)).toThrow('base local');
  });

  it('corre contra localhost en desarrollo', () => {
    expect(() => impedirProduccion(LOCAL)).not.toThrow();
  });

  it('sembrarDemo revisa el candado antes de tocar la base', async () => {
    process.env.NODE_ENV = 'production';
    const prismaQueNoDebeUsarse = {} as PrismaClient;
    await expect(sembrarDemo(prismaQueNoDebeUsarse, LOCAL)).rejects.toThrow('producción');
  });
});

describe('Archivos de demostracion (enmascarados)', () => {
  it('trae 179 filas de 42 lotes en 5 campañas', () => {
    const lotes = leerLotesDemo();
    expect(lotes).toHaveLength(179);
    expect(new Set(lotes.map((l) => l.lote)).size).toBe(42);
    expect(new Set(lotes.map((l) => l.campana)).size).toBe(5);
    expect(lotes.every((l) => /^L\d\d$/.test(l.lote))).toBe(true);
  });

  it('6 lotes de 2021-2022 no tienen fecha de siembra', () => {
    const sinFecha = leerLotesDemo().filter((l) => l.fechaSiembra === null);
    expect(sinFecha).toHaveLength(6);
    expect(sinFecha.every((l) => l.campana === '2021-2022')).toBe(true);
  });

  it('el total de 2021-2022 no se conoce (version a)', () => {
    const totales = leerTotalesDemo();
    expect(totales).toHaveLength(5);
    expect(totales.find((t) => t.campana === '2021-2022')?.rendimientoTotal).toBeNull();
    expect(totales.filter((t) => t.rendimientoTotal !== null)).toHaveLength(4);
  });
});
