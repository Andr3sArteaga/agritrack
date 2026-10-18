/**
 * PRUEBA DE INTEGRACION: requiere PostgreSQL real (docker compose up -d) y
 * una base de datos de pruebas separada, para no tocar los datos de
 * desarrollo (la cadena es global y borrar filas deja huecos).
 *
 *   docker exec agritrack-db psql -U agritrack -d postgres -c "CREATE DATABASE agritrack_test"
 *   DATABASE_URL=postgresql://agritrack:agritrack@localhost:5433/agritrack_test?schema=public \
 *     npx prisma migrate deploy --config prisma7.config.ts
 *   npm run test:integration
 *
 * Usa el repositorio y el servicio de produccion sin modificaciones.
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
import { ActividadPrismaRepository } from '../../src/modules/actividades/infrastructure/actividad.prisma.repository';
import type { CrearActividadData } from '../../src/modules/actividades/domain/repositories/actividad.repository';
import { IntegridadService } from '../../src/modules/integridad/application/integridad.service';
import type { PrismaService } from '../../src/shared/prisma/prisma.service';

const URL_PRUEBAS =
  process.env.DATABASE_URL_TEST ??
  'postgresql://agritrack:agritrack@localhost:5433/agritrack_test?schema=public';

if (!/\/[^/?]*_test(\?|$)/.test(URL_PRUEBAS)) {
  throw new Error(
    'La prueba de integracion borra datos: la base debe terminar en "_test".',
  );
}

const CAMPANA_ID = 'camp_it';
const PARCELA_ID = 'parc_it';

function datosActividad(
  descripcion: string,
  extra: Partial<CrearActividadData> = {},
): CrearActividadData {
  return {
    campanaId: CAMPANA_ID,
    tipo: 'FUMIGACION',
    fecha: new Date('2026-08-01T00:00:00.000Z'),
    descripcion,
    insumo: null,
    cantidad: null,
    unidad: null,
    responsableId: 'user_it',
    tercerizado: false,
    maquinariaUtilizada: null,
    rendimientoTnHa: null,
    correccionDeId: null,
    motivoCorreccion: null,
    ...extra,
  };
}

describe('Cadena de integridad con PostgreSQL real', () => {
  let prisma: PrismaClient;
  let repositorio: ActividadPrismaRepository;
  let integridad: IntegridadService;

  beforeAll(() => {
    prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString: URL_PRUEBAS }),
    });
    repositorio = new ActividadPrismaRepository(
      prisma as unknown as PrismaService,
    );
    integridad = new IntegridadService(repositorio);
  });

  beforeEach(async () => {
    await prisma.$executeRawUnsafe(
      'TRUNCATE actividades, campanas, parcelas, cultivos, usuarios RESTART IDENTITY CASCADE',
    );
    await prisma.usuario.create({
      data: {
        id: 'user_it',
        nombre: 'Usuario IT',
        email: 'it@agroan.test',
        passwordHash: 'x',
        rol: 'OPERATIVO',
      },
    });
    await prisma.parcela.create({
      data: { id: PARCELA_ID, nombre: 'Parcela IT', hectareas: 10, ubicacionTexto: 'x' },
    });
    await prisma.cultivo.create({ data: { id: 'cult_it', nombre: 'Soya IT' } });
    await prisma.campana.create({
      data: {
        id: CAMPANA_ID,
        parcelaId: PARCELA_ID,
        cultivoId: 'cult_it',
        temporada: 'IT 2026',
        fechaInicio: new Date('2026-06-01T00:00:00.000Z'),
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('inserciones simultaneas mantienen la cadena consistente', async () => {
    const TOTAL = 30;

    const creadas = await Promise.all(
      Array.from({ length: TOTAL }, (_, i) =>
        repositorio.crearConIntegridad(datosActividad(`Concurrente ${i}`)),
      ),
    );

    const enBd = await repositorio.findTodasOrdenadas();
    expect(enBd).toHaveLength(TOTAL);
    expect(enBd.map((a) => a.secuencia)).toEqual(
      Array.from({ length: TOTAL }, (_, i) => i + 1),
    );
    expect(enBd[0].hashAnterior).toBeNull();
    for (let i = 1; i < TOTAL; i++) {
      expect(enBd[i].hashAnterior).toBe(enBd[i - 1].hash);
    }
    expect(new Set(enBd.map((a) => a.hash)).size).toBe(TOTAL);
    expect(new Set(creadas.map((a) => a.secuencia)).size).toBe(TOTAL);
    await expect(integridad.verificarGlobal()).resolves.toMatchObject({
      valido: true,
      totalVerificadas: TOTAL,
    });
  });

  it('un insert fallido (rollback) no deja hueco en la secuencia', async () => {
    const primera = await repositorio.crearConIntegridad(datosActividad('A'));

    await expect(
      repositorio.crearConIntegridad(
        datosActividad('FALLA', { campanaId: 'campana_inexistente' }),
      ),
    ).rejects.toBeDefined();

    const segunda = await repositorio.crearConIntegridad(datosActividad('B'));

    expect([primera.secuencia, segunda.secuencia]).toEqual([1, 2]);
    expect(segunda.hashAnterior).toBe(primera.hash);
    const enBd = await repositorio.findTodasOrdenadas();
    expect(enBd.map((a) => a.secuencia)).toEqual([1, 2]);
    await expect(integridad.verificarGlobal()).resolves.toEqual({
      valido: true,
      totalVerificadas: 2,
      actividadAlteradaId: null,
      motivo: null,
    });
  });

  it('inserciones simultaneas con fallos intercalados siguen sin dejar huecos', async () => {
    const resultados = await Promise.allSettled(
      Array.from({ length: 20 }, (_, i) =>
        repositorio.crearConIntegridad(
          datosActividad(
            `Mixta ${i}`,
            i % 4 === 0 ? { campanaId: 'campana_inexistente' } : {},
          ),
        ),
      ),
    );

    const exitosas = resultados.filter((r) => r.status === 'fulfilled').length;
    expect(exitosas).toBe(15);
    const enBd = await repositorio.findTodasOrdenadas();
    expect(enBd.map((a) => a.secuencia)).toEqual(
      Array.from({ length: 15 }, (_, i) => i + 1),
    );
    await expect(integridad.verificarGlobal()).resolves.toMatchObject({
      valido: true,
      totalVerificadas: 15,
    });
  });

  it('una correccion crea un registro nuevo y deja el original intacto', async () => {
    const original = await repositorio.crearConIntegridad(
      datosActividad('Cosecha', { tipo: 'COSECHA', rendimientoTnHa: 3.1 }),
    );
    const filaAntes = await prisma.actividad.findUniqueOrThrow({
      where: { id: original.id },
    });

    const correccion = await repositorio.crearConIntegridad(
      datosActividad('Cosecha (corregida)', {
        tipo: 'COSECHA',
        rendimientoTnHa: 3.3,
        correccionDeId: original.id,
        motivoCorreccion: 'Bascula mal calibrada',
      }),
    );

    const filaDespues = await prisma.actividad.findUniqueOrThrow({
      where: { id: original.id },
    });
    expect(filaDespues).toEqual(filaAntes);
    expect(correccion.id).not.toBe(original.id);
    expect(correccion.correccionDeId).toBe(original.id);
    expect(correccion.secuencia).toBe(original.secuencia + 1);
    expect(correccion.hashAnterior).toBe(original.hash);
    expect((await repositorio.findById(original.id))?.vigente).toBe(false);
    expect((await repositorio.findById(correccion.id))?.vigente).toBe(true);
    await expect(integridad.verificarGlobal()).resolves.toMatchObject({
      valido: true,
      totalVerificadas: 2,
    });
  });

  it('detecta un UPDATE directo en la base y senala el registro alterado', async () => {
    const creadas = [];
    for (let i = 1; i <= 4; i++) {
      creadas.push(await repositorio.crearConIntegridad(datosActividad(`Labor ${i}`)));
    }

    await prisma.$executeRawUnsafe(
      "UPDATE actividades SET descripcion = 'manipulada' WHERE secuencia = 2",
    );

    await expect(integridad.verificarGlobal()).resolves.toEqual({
      valido: false,
      totalVerificadas: 4,
      actividadAlteradaId: creadas[1].id,
      motivo: 'hash no coincide con el contenido',
    });
    await expect(
      integridad.verificarPorParcela(PARCELA_ID),
    ).resolves.toMatchObject({
      valido: false,
      actividadAlteradaId: creadas[1].id,
    });
  });

  it('detecta un DELETE directo en la base (hueco en la secuencia)', async () => {
    const creadas = [];
    for (let i = 1; i <= 4; i++) {
      creadas.push(await repositorio.crearConIntegridad(datosActividad(`Labor ${i}`)));
    }

    await prisma.$executeRawUnsafe('DELETE FROM actividades WHERE secuencia = 2');

    await expect(integridad.verificarGlobal()).resolves.toEqual({
      valido: false,
      totalVerificadas: 3,
      actividadAlteradaId: creadas[2].id,
      motivo: 'hueco en la secuencia (registro faltante)',
    });
  });
});
