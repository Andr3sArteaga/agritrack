/**
 * PRUEBA DE INTEGRACION del componente de estimacion contra PostgreSQL real
 * (base agritrack_test): seed de demostracion, entrenamiento por el endpoint
 * (metodo del controller) y consulta de la estimacion con etiqueta experimental.
 */
import 'reflect-metadata';
// @nestjs/* v12 es ESM-only y Jest corre en CJS: se mockean decoradores y guards.
const decorador = () => () => undefined;
jest.mock('@nestjs/common', () => ({
  Injectable: decorador,
  Inject: decorador,
  Optional: decorador,
  Controller: decorador,
  Get: decorador,
  Post: decorador,
  Put: decorador,
  Body: decorador,
  Param: decorador,
  Query: decorador,
  UseGuards: decorador,
  BadRequestException: class BadRequestException extends Error { },
  ConflictException: class ConflictException extends Error { },
  NotFoundException: class NotFoundException extends Error { },
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
  JwtAuthGuard: class { },
}));
jest.mock('../../src/modules/auth/presentation/guards/roles.guard', () => ({
  RolesGuard: class { },
}));
jest.mock('../../src/shared/prisma/prisma.service', () => ({
  PrismaService: class { },
}));

import { PrismaPg } from '@prisma/adapter-pg';
import { CULTIVO_DEMO, sembrarDemo } from '../../prisma/seeds/demo/datos-demo';
import { PrismaClient } from '../../src/generated/prisma/client';
import { TipoActividad } from '../../src/generated/prisma/enums';
import { EntrenamientoService } from '../../src/modules/prediccion/application/entrenamiento.service';
import { EstimacionService } from '../../src/modules/prediccion/application/estimacion.service';
import type { PrediccionService } from '../../src/modules/prediccion/application/prediccion.service';
import { DatosRendimientoPrismaRepository } from '../../src/modules/prediccion/infrastructure/datos-rendimiento.prisma.repository';
import { LineaBaseAdapter } from '../../src/modules/prediccion/infrastructure/linea-base.adapter';
import { ModeloIaPrismaRepository } from '../../src/modules/prediccion/infrastructure/modelo-ia.prisma.repository';
import { RandomForestAdapter } from '../../src/modules/prediccion/infrastructure/random-forest.adapter';
import { RandomForestRegresor } from '../../src/modules/prediccion/infrastructure/random-forest.regresor';
import { PrediccionController } from '../../src/modules/prediccion/presentation/prediccion.controller';
import { RegistroCosechaController } from '../../src/modules/prediccion/presentation/registro-cosecha.controller';
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
  let registroCosechaController: RegistroCosechaController;
  let cultivoId: string;

  async function limpiar(): Promise<void> {
    await prisma.$executeRawUnsafe(
      'TRUNCATE modelos_ia, totales_campana, registros_cosecha RESTART IDENTITY',
    );
    await prisma.campana.deleteMany({
      where: {
        parcela: {
          OR: [
            { nombre: { startsWith: 'Lote demo ' } },
            { nombre: { startsWith: 'Lote real test ' } },
          ],
        },
      },
    });
    await prisma.parcela.deleteMany({
      where: {
        OR: [
          { nombre: { startsWith: 'Lote demo ' } },
          { nombre: { startsWith: 'Lote real test ' } },
        ],
      },
    });
    await prisma.cultivo.deleteMany({
      where: { nombre: { in: ['Soya test real', 'Sorgo test dev', 'Sorgo test rf'] } },
    });
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
    const entrenamientoService = new EntrenamientoService(datos, modelos, regresor);
    const estimacionService = new EstimacionService(
      new LineaBaseAdapter(datos),
      new RandomForestAdapter(modelos, regresor),
      datos,
      modelos,
      regresor,
      entrenamientoService,
    );
    controller = new PrediccionController(
      {} as PrediccionService,
      estimacionService,
      entrenamientoService,
    );
    registroCosechaController = new RegistroCosechaController(estimacionService);
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
    expect(respuesta.etiqueta).toBe('Datos iniciales (V1)');
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
    expect(respuesta.etiqueta_datos).toBe('Datos iniciales (V1)');
  });

  it('un segundo entrenamiento crea v2 y tambien queda experimental', async () => {
    const version = await controller.entrenar({ cultivo: cultivoId });
    expect(version).toMatchObject({ version: 'v2', estado: 'experimental' });
    expect(await prisma.modeloIa.count({ where: { estado: 'activo' } })).toBe(0);
  });

  it('T1.1 e impacto: una campaña real con siembra obtiene estimacion e impacto en tiempo real', async () => {
    const parcelaReal = await prisma.parcela.create({
      data: {
        nombre: 'Lote real test A',
        hectareas: 30,
        ubicacionTexto: 'Pailon Sur',
      },
    });
    const campanaReal = await prisma.campana.create({
      data: {
        parcelaId: parcelaReal.id,
        cultivoId,
        temporada: '2025-2026',
        fechaInicio: new Date('2025-10-01T00:00:00.000Z'),
      },
    });

    const guardado = await registroCosechaController.guardar(campanaReal.id, {
      haSembradas: 30,
      variedad: '6410',
      fechaSiembra: '2025-11-15',
    });
    expect(guardado.origen).toBe('real');

    const leido = await registroCosechaController.obtener(campanaReal.id);
    expect(leido?.haSembradas).toBe(30);

    const estimacion = await controller.estimar({
      lote: parcelaReal.id,
      campana: campanaReal.id,
    });
    expect(typeof estimacion.experimental?.valor_t_ha).toBe('number');
    expect(estimacion.etiqueta_datos).toBe('Datos iniciales (V1)');

    const impactoSiembra = await controller.analizarImpacto({
      lote: parcelaReal.id,
      campana: campanaReal.id,
      tipoActividad: TipoActividad.SIEMBRA,
      haSembradas: 30,
      variedad: '6410',
      fechaSiembra: '2025-11-15',
    });
    expect(['POSITIVO', 'NEUTRO', 'NEGATIVO']).toContain(impactoSiembra.efectoGlobal);
    expect(impactoSiembra.variedadesConocidas).toContain('6410');
    expect(impactoSiembra.factores).toHaveLength(3);

    const impactoFumigacion = await controller.analizarImpacto({
      lote: parcelaReal.id,
      campana: campanaReal.id,
      tipoActividad: TipoActividad.FUMIGACION,
    });
    expect(impactoFumigacion.efectoGlobal).toBe('NEUTRO');
    expect(impactoFumigacion.diferencia_t_ha).toBe(0);
  });

  it('T1.1 entrenamiento real: con 2 campañas reales cosechadas entrena con origen "real"', async () => {
    const cultivoReal = await prisma.cultivo.create({
      data: { nombre: 'Soya test real' },
    });
    const p1 = await prisma.parcela.create({
      data: { nombre: 'Lote real test 1', hectareas: 20, ubicacionTexto: 'Pailon' },
    });
    const p2 = await prisma.parcela.create({
      data: { nombre: 'Lote real test 2', hectareas: 25, ubicacionTexto: 'Pailon' },
    });
    const c1 = await prisma.campana.create({
      data: {
        parcelaId: p1.id,
        cultivoId: cultivoReal.id,
        temporada: '2023-2024',
        fechaInicio: new Date('2023-10-01T00:00:00.000Z'),
      },
    });
    const c2 = await prisma.campana.create({
      data: {
        parcelaId: p2.id,
        cultivoId: cultivoReal.id,
        temporada: '2024-2025',
        fechaInicio: new Date('2024-10-01T00:00:00.000Z'),
      },
    });

    await registroCosechaController.guardar(c1.id, {
      haSembradas: 20,
      variedad: '6410',
      fechaSiembra: '2023-11-10',
      haCosechadas: 20,
      toneladas: 44,
      fechaCosecha: '2024-03-10',
    });
    await registroCosechaController.guardar(c2.id, {
      haSembradas: 25,
      variedad: 'MUNASQA',
      fechaSiembra: '2024-11-12',
      haCosechadas: 25,
      toneladas: 50,
      fechaCosecha: '2025-03-12',
    });

    const modeloReal = await controller.entrenar({ cultivo: cultivoReal.id });
    expect(modeloReal.origenDatos).toBe('real');
    expect(modeloReal.campanasUsadas).toEqual(['2023-2024', '2024-2025']);
  });

  it('Random Forest con 6 campañas reales: entrena, estima y entrega escenarios de impacto', async () => {
    const cultivo = await prisma.cultivo.create({
      data: { nombre: 'Sorgo test rf' },
    });
    const parcela = await prisma.parcela.create({
      data: { nombre: 'Lote real test rf', hectareas: 32, ubicacionTexto: 'Pailon' },
    });
    const historial = [
      { temporada: '2020-2021', inicio: '2020-10-01', siembra: '2020-10-14', cosecha: '2021-03-10', ha: 32, variedad: 'ADV 1350', t: 150 },
      { temporada: '2021-2022', inicio: '2021-10-01', siembra: '2021-10-28', cosecha: '2022-03-10', ha: 29, variedad: 'TOBAZ', t: 113 },
      { temporada: '2022-2023', inicio: '2022-10-01', siembra: '2022-11-14', cosecha: '2023-03-20', ha: 24, variedad: 'GRANADOR', t: 74 },
      { temporada: '2023-2024', inicio: '2023-10-01', siembra: '2023-10-15', cosecha: '2024-03-10', ha: 32, variedad: 'ADV 1350', t: 151 },
      { temporada: '2024-2025', inicio: '2024-10-01', siembra: '2024-10-29', cosecha: '2025-03-10', ha: 29, variedad: 'TOBAZ', t: 112 },
      { temporada: '2025-2026', inicio: '2025-10-01', siembra: '2025-11-13', cosecha: '2026-03-15', ha: 24, variedad: 'GRANADOR', t: 75 },
    ];
    for (const h of historial) {
      const campana = await prisma.campana.create({
        data: {
          parcelaId: parcela.id,
          cultivoId: cultivo.id,
          temporada: h.temporada,
          fechaInicio: new Date(`${h.inicio}T00:00:00.000Z`),
        },
      });
      await registroCosechaController.guardar(campana.id, {
        haSembradas: h.ha,
        variedad: h.variedad,
        fechaSiembra: h.siembra,
        haCosechadas: h.ha,
        toneladas: h.t,
        fechaCosecha: h.cosecha,
      });
    }
    const actual = await prisma.campana.create({
      data: {
        parcelaId: parcela.id,
        cultivoId: cultivo.id,
        temporada: '2026-2027',
        fechaInicio: new Date('2026-10-01T00:00:00.000Z'),
      },
    });
    await registroCosechaController.guardar(actual.id, {
      haSembradas: 32,
      variedad: 'ADV 1350',
      fechaSiembra: '2026-10-15',
    });

    const modelo = await controller.entrenar({ cultivo: cultivo.id });
    expect(modelo.origenDatos).toBe('real');
    expect(modelo.campanasUsadas).toHaveLength(6);
    expect(modelo.metricas.varianteA.global).not.toBeNull();
    expect(typeof modelo.metricas.varianteA.global?.maeModelo).toBe('number');
    expect(typeof modelo.metricas.varianteA.global?.rmseModelo).toBe('number');
    expect(typeof modelo.metricas.varianteA.global?.r2Modelo).toBe('number');
    expect(modelo.metricas.varianteA.global!.maeModelo).toBeLessThan(
      modelo.metricas.varianteA.global!.maeLineaBase,
    );

    const estimacion = await controller.estimar({
      lote: parcela.id,
      campana: actual.id,
    });
    expect(estimacion.origen_datos).toBe('real');
    expect(estimacion.oficial.campañas_usadas).toBe(6);
    const bloqueModelo =
      estimacion.oficial.fuente === 'modelo'
        ? estimacion.oficial
        : estimacion.experimental;
    expect(typeof bloqueModelo?.valor_t_ha).toBe('number');
    expect(bloqueModelo?.metricas_evaluacion).not.toBeNull();
    expect(typeof bloqueModelo?.metricas_evaluacion?.rmseModelo).toBe('number');
    expect(typeof bloqueModelo?.metricas_evaluacion?.r2Modelo).toBe('number');

    const impacto = await controller.analizarImpacto({
      lote: parcela.id,
      campana: actual.id,
      tipoActividad: TipoActividad.SIEMBRA,
      haSembradas: 32,
    });
    expect(impacto.escenarios?.positivo).not.toBeNull();
    expect(impacto.escenarios?.neutro).not.toBeNull();
    expect(impacto.escenarios?.negativo).not.toBeNull();
  });
});
