/**
 * PRUEBA DE INTEGRACION (RF-42): el filtro por periodo del reporte por campana
 * se resuelve en SQL (ReportesPrismaQuery), asi que se prueba contra
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
import { ReportesPrismaQuery } from '../../src/modules/reportes/infrastructure/reportes-prisma.query';
import { resolverPeriodo } from '../../src/modules/reportes/domain/rules/periodo-reporte';
import type { PrismaService } from '../../src/shared/prisma/prisma.service';

const URL_PRUEBAS =
  process.env.DATABASE_URL_TEST ??
  'postgresql://agritrack:agritrack@localhost:5433/agritrack_test?schema=public';

if (!/\/[^/?]*_test(\?|$)/.test(URL_PRUEBAS)) {
  throw new Error(
    'La prueba de integracion borra datos: la base debe terminar en "_test".',
  );
}

const dia = (texto: string) => new Date(`${texto}T00:00:00.000Z`);
const CAMPANA_ID = 'camp_rep';

describe('Reporte por campana: filtro por periodo con PostgreSQL real', () => {
  let prisma: PrismaClient;
  let query: ReportesPrismaQuery;
  let secuencia = 0;

  const crearActividad = (
    id: string,
    fecha: string,
    extra: { tipo?: 'SIEMBRA' | 'COSECHA'; correccionDeId?: string; rendimientoTnHa?: number } = {},
  ) =>
    prisma.actividad.create({
      data: {
        id,
        secuencia: ++secuencia,
        campanaId: CAMPANA_ID,
        tipo: extra.tipo ?? 'SIEMBRA',
        fecha: dia(fecha),
        descripcion: id,
        responsableId: 'user_rep',
        correccionDeId: extra.correccionDeId ?? null,
        rendimientoTnHa: extra.rendimientoTnHa ?? null,
        // La cadena no se verifica en esta prueba (solo el filtro por fecha).
        hash: `hash_${id}`,
      },
    });

  const crearGasto = (
    descripcion: string,
    fecha: string,
    extra: { estado?: 'PAGADO' | 'COMPROMETIDO'; anulado?: boolean } = {},
  ) =>
    prisma.gasto.create({
      data: {
        campanaId: CAMPANA_ID,
        categoria: 'OTROS',
        descripcion,
        monto: 100,
        fecha: dia(fecha),
        estado: extra.estado ?? 'PAGADO',
        registradoPorId: 'user_rep',
        anulado: extra.anulado ?? false,
        motivoAnulacion: extra.anulado ? 'Registrado dos veces' : null,
      },
    });

  beforeAll(() => {
    prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString: URL_PRUEBAS }),
    });
    query = new ReportesPrismaQuery(prisma as unknown as PrismaService);
  });

  beforeEach(async () => {
    secuencia = 0;
    await prisma.$executeRawUnsafe(
      'TRUNCATE gastos, presupuestos, actividades, campanas, parcelas, cultivos, usuarios RESTART IDENTITY CASCADE',
    );
    await prisma.usuario.create({
      data: {
        id: 'user_rep',
        nombre: 'Operativo Reporte',
        email: 'rep@agroan.test',
        passwordHash: 'x',
        rol: 'OPERATIVO',
      },
    });
    await prisma.parcela.create({
      data: { id: 'parc_rep', nombre: 'Parcela Reporte', hectareas: 10, ubicacionTexto: 'x' },
    });
    await prisma.cultivo.create({ data: { id: 'cult_rep', nombre: 'Soya Reporte' } });
    await prisma.campana.create({
      data: {
        id: CAMPANA_ID,
        parcelaId: 'parc_rep',
        cultivoId: 'cult_rep',
        temporada: 'Verano 2025',
        fechaInicio: dia('2025-11-01'),
        fechaFin: dia('2026-03-15'),
        estado: 'COSECHADA',
      },
    });
    await prisma.presupuesto.create({ data: { campanaId: CAMPANA_ID, montoTotal: 5000 } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('campanaParaReporte trae parcela, cultivo y presupuesto; null si no existe', async () => {
    const campana = await query.campanaParaReporte(CAMPANA_ID);

    expect(campana).toMatchObject({
      temporada: 'Verano 2025',
      parcela: { nombre: 'Parcela Reporte', hectareas: 10 },
      cultivo: { nombre: 'Soya Reporte' },
      presupuestoTotal: 5000,
    });
    expect(await query.campanaParaReporte('no_existe')).toBeNull();
  });

  it('filtra por rango con hasta inclusivo y solo actividades vigentes', async () => {
    await crearActividad('antes_del_rango', '2025-11-30');
    await crearActividad('primer_dia', '2025-12-01');
    await crearActividad('original_corregida', '2025-12-10');
    await crearActividad('correccion', '2025-12-11', { correccionDeId: 'original_corregida' });
    await crearActividad('ultimo_dia', '2025-12-31', { tipo: 'COSECHA', rendimientoTnHa: 3 });
    await crearActividad('dia_siguiente', '2026-01-01');

    await crearGasto('gasto en rango', '2025-12-15');
    await crearGasto('comprometido en rango', '2025-12-31', { estado: 'COMPROMETIDO' });
    await crearGasto('anulado en rango', '2025-12-20', { anulado: true });
    await crearGasto('gasto fuera de rango', '2026-01-02');

    const periodo = resolverPeriodo(
      { desde: '2025-12-01', hasta: '2025-12-31' },
      { fechaInicio: dia('2025-11-01'), fechaFin: dia('2026-03-15') },
      new Date(),
    );
    const { actividades, gastos } = await query.movimientosDelPeriodo(CAMPANA_ID, {
      desde: periodo.desde,
      hastaExclusivo: periodo.hastaExclusivo,
    });

    expect(actividades.map((a) => a.id)).toEqual(['primer_dia', 'correccion', 'ultimo_dia']);
    expect(actividades[0].responsableNombre).toBe('Operativo Reporte');
    expect(gastos).toHaveLength(2);
    expect(gastos.map((g) => g.estado).sort()).toEqual(['COMPROMETIDO', 'PAGADO']);
    expect(gastos.every((g) => !g.anulado)).toBe(true);
  });

  it('periodo por defecto: abarca toda la campana, incluido su ultimo dia', async () => {
    await crearActividad('inicio', '2025-11-01');
    await crearActividad('fin', '2026-03-15');
    await crearActividad('despues', '2026-03-16');

    const periodo = resolverPeriodo(
      {},
      { fechaInicio: dia('2025-11-01'), fechaFin: dia('2026-03-15') },
      new Date(),
    );
    const { actividades } = await query.movimientosDelPeriodo(CAMPANA_ID, {
      desde: periodo.desde,
      hastaExclusivo: periodo.hastaExclusivo,
    });

    expect(actividades.map((a) => a.id)).toEqual(['inicio', 'fin']);
  });
});
