/**
 * PRUEBA DE INTEGRACION del componente de estimacion contra PostgreSQL real
 * (base agritrack_test): seed de demostracion, entrenamiento por el endpoint
 * (metodo del controller) y consulta de la estimacion con etiqueta experimental.
 */
// @nestjs/* v12 es ESM-only y Jest corre en CJS: se mockean decoradores y guards.
const decorador = () => () => undefined;
jest.mock('@nestjs/common', () => ({
  Injectable: decorador,
  Inject: decorador,
  Controller: decorador,
  Get: decorador,
  Post: decorador,
  Query: decorador,
  UseGuards: decorador,
  ConflictException: class ConflictException extends Error {},
  NotFoundException: class NotFoundException extends Error {},
}));
jest.mock('@nestjs/swagger', () => ({
  ApiBearerAuth: decorador,
  ApiCreatedResponse: decorador,
  ApiOkResponse: decorador,
  ApiOperation: decorador,
  ApiProperty: decorador,
  ApiPropertyOptional: decorador,
  ApiTags: decorador,
}));
jest.mock('../../src/modules/auth/presentation/decorators/roles.decorator', () => ({
  Roles: decorador,
}));
jest.mock('../../src/modules/auth/presentation/guards/jwt-auth.guard', () => ({
  JwtAuthGuard: class {},
}));
jest.mock('../../src/modules/auth/presentation/guards/roles.guard', () => ({
  RolesGuard: class {},
}));
jest.mock('../../src/shared/prisma/prisma.service', () => ({
  PrismaService: class {},
}));

import { PrismaPg } from '@prisma/adapter-pg';
import { CULTIVO_DEMO, sembrarDemo } from '../../prisma/seeds/demo/datos-demo';
import { PrismaClient } from '../../src/generated/prisma/client';
import { EntrenamientoService } from '../../src/modules/prediccion/application/entrenamiento.service';
import { EstimacionService } from '../../src/modules/prediccion/application/estimacion.service';
import type { PrediccionService } from '../../src/modules/prediccion/application/prediccion.service';
import { DatosRendimientoPrismaRepository } from '../../src/modules/prediccion/infrastructure/datos-rendimiento.prisma.repository';
import { LineaBaseAdapter } from '../../src/modules/prediccion/infrastructure/linea-base.adapter';
import { ModeloIaPrismaRepository } from '../../src/modules/prediccion/infrastructure/modelo-ia.prisma.repository';
import { RandomForestAdapter } from '../../src/modules/prediccion/infrastructure/random-forest.adapter';
import { RandomForestRegresor } from '../../src/modules/prediccion/infrastructure/random-forest.regresor';
import { PrediccionController } from '../../src/modules/prediccion/presentation/prediccion.controller';
import type { PrismaService } from '../../src/shared/prisma/prisma.service';

const URL_PRUEBAS =
  process.env.DATABASE_URL_TEST ??
  'postgresql://agritrack:agritrack@localhost:5433/agritrack_test?schema=public';

if (!/\/[^/?]*_test(\?|$)/.test(URL_PRUEBAS)) {
  throw new Error(
    'La prueba de integracion borra datos: la base debe terminar en "_test".',
  );
}

describe('Componente de estimacion (PostgreSQL real, datos de demostracion)', () => {
  let prisma: PrismaClient;
  let controller: PrediccionController;
  let cultivoId: string;

  async function limpiar(): Promise<void> {
    await prisma.$executeRawUnsafe(
      'TRUNCATE modelos_ia, totales_campana, registros_cosecha RESTART IDENTITY',
    );
    await prisma.campana.deleteMany({ where: { parcela: { nombre: { startsWith: 'Lote demo ' } } } });
    await prisma.parcela.deleteMany({ where: { nombre: { startsWith: 'Lote demo ' } } });
  }

  beforeAll(async () => {
    prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString: URL_PRUEBAS }),
    });
    await limpiar();

    const servicioPrisma = prisma as unknown as PrismaService;
    const datos = new DatosRendimientoPrismaRepository(servicioPrisma);
    const modelos = new ModeloIaPrismaRepository(servicioPrisma);
    const regresor = new RandomForestRegresor();
    controller = new PrediccionController(
      {} as PrediccionService,
      new EstimacionService(
        new LineaBaseAdapter(datos),
        new RandomForestAdapter(modelos, regresor),
        datos,
        modelos,
      ),
      new EntrenamientoService(datos, modelos, regresor),
    );
  });

  afterAll(async () => {
    await limpiar();
    await prisma.$disconnect();
  });

  it('el seed de demostracion carga 42 parcelas, 179 campañas y registros, y 5 totales', async () => {
    const resultado = await sembrarDemo(prisma, URL_PRUEBAS);
    expect(resultado).toEqual({ parcelas: 42, campanas: 179, registros: 179, omitido: false });

    cultivoId = (await prisma.cultivo.findUniqueOrThrow({ where: { nombre: CULTIVO_DEMO } })).id;
    expect(await prisma.registroCosecha.count({ where: { origen: 'demo_enmascarado' } })).toBe(179);
    expect(await prisma.totalCampana.count({ where: { origen: 'demo_enmascarado' } })).toBe(5);
    // Nunca en preventa y sin actividades (la cadena de hashes no se toca).
    expect(
      await prisma.parcela.count({
        where: { nombre: { startsWith: 'Lote demo ' }, disponibleParaPreventa: true },
      }),
    ).toBe(0);
    expect(
      await prisma.actividad.count({
        where: { campana: { parcela: { nombre: { startsWith: 'Lote demo ' } } } },
      }),
    ).toBe(0);
  });

  it('el seed es idempotente: la segunda vez no duplica nada', async () => {
    expect((await sembrarDemo(prisma, URL_PRUEBAS)).omitido).toBe(true);
    expect(await prisma.registroCosecha.count()).toBe(179);
  });

  it('GET /prediccion/datos-demo lista las 42 parcelas de demostracion', async () => {
    const respuesta = await controller.datosDemo();
    expect(respuesta.parcelaIds).toHaveLength(42);
    expect(respuesta.etiqueta).toBe('Datos de demostración (enmascarados)');
  });

  it('POST /prediccion/entrenar crea la version v1 y queda "experimental"', async () => {
    const version = await controller.entrenar({ cultivo: cultivoId });
    expect(version).toMatchObject({
      version: 'v1',
      origenDatos: 'demo_enmascarado',
      estado: 'experimental',
    });
    expect(version.campanasUsadas).toHaveLength(5);
    expect(version.metricas.varianteA.cortes.map((c) => c.conclusion)).toEqual([
      'sin_linea_base', 'supera', 'supera', 'peor',
    ]);

    const guardado = await prisma.modeloIa.findFirstOrThrow({ where: { cultivoId } });
    expect(guardado.estado).toBe('experimental');
    expect(guardado.modelo).toBeTruthy();
  });

  it('GET /prediccion/modelos lista la version con estado y metricas, sin el modelo serializado', async () => {
    const versiones = await controller.listarModelos({ cultivo: cultivoId });
    expect(versiones).toHaveLength(1);
    expect(versiones[0].estado).toBe('experimental');
    expect(versiones[0].metricas.varianteA.global?.conclusion).toBe('supera');
    expect(versiones[0]).not.toHaveProperty('modelo');
  });

  it('GET /prediccion/estimacion: linea base oficial y modelo con etiqueta experimental', async () => {
    const campana = await prisma.campana.findFirstOrThrow({
      where: { temporada: '2025-2026', parcela: { nombre: 'Lote demo L02' } },
    });
    const respuesta = await controller.estimar({ lote: campana.parcelaId, campana: campana.id });

    expect(respuesta.oficial).toMatchObject({
      fuente: 'linea_base',
      estado: 'oficial',
      valor_t_ha: 1.68,
      campañas_usadas: 3,
    });
    expect(respuesta.experimental).toMatchObject({
      fuente: 'modelo',
      estado: 'experimental',
      version_modelo: 'v1',
    });
    expect(respuesta.etiqueta_datos).toBe('Datos de demostración (enmascarados)');
  });

  it('un segundo entrenamiento crea v2 y tambien queda experimental', async () => {
    const version = await controller.entrenar({ cultivo: cultivoId });
    expect(version).toMatchObject({ version: 'v2', estado: 'experimental' });
    expect(await prisma.modeloIa.count({ where: { estado: 'activo' } })).toBe(0);
  });
});
