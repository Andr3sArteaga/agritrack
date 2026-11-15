import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import type { PrismaService } from '../src/shared/prisma/prisma.service';
import {
  EstadoCampana,
  Rol,
  TipoActividad,
  TipoContacto,
} from '../src/generated/prisma/enums';
import { UsuarioPrismaRepository } from '../src/modules/auth/infrastructure/usuario.prisma.repository';
import { CultivoPrismaRepository } from '../src/modules/cultivos/infrastructure/cultivo.prisma.repository';
import { CultivosService } from '../src/modules/cultivos/application/cultivos.service';
import { ParcelaPrismaRepository } from '../src/modules/parcelas/infrastructure/parcela.prisma.repository';
import { ParcelasService } from '../src/modules/parcelas/application/parcelas.service';
import { CampanaPrismaRepository } from '../src/modules/campanas/infrastructure/campana.prisma.repository';
import { CampanasService } from '../src/modules/campanas/application/campanas.service';
import { ActividadPrismaRepository } from '../src/modules/actividades/infrastructure/actividad.prisma.repository';
import { ActividadesService } from '../src/modules/actividades/application/actividades.service';
import { ContactoPrismaRepository } from '../src/modules/contactos/infrastructure/contacto.prisma.repository';
import { ContactosService } from '../src/modules/contactos/application/contactos.service';
import { DatosRendimientoPrismaRepository } from '../src/modules/prediccion/infrastructure/datos-rendimiento.prisma.repository';
import { ModeloIaPrismaRepository } from '../src/modules/prediccion/infrastructure/modelo-ia.prisma.repository';
import { RandomForestRegresor } from '../src/modules/prediccion/infrastructure/random-forest.regresor';
import { EntrenamientoService } from '../src/modules/prediccion/application/entrenamiento.service';
import { sembrarCostos } from './seed-costos';
import type { PoligonoGeoJson } from '../src/modules/parcelas/domain/entities/parcela.entity';

const PASSWORD_DEMO = 'Agroan2025!';
const SALT_ROUNDS = 10;

/** Rectangulo GeoJSON (anillo cerrado, [lng, lat]) desde su esquina inferior izquierda. */
function rectanguloGeoJson(
  minLng: number,
  minLat: number,
  dLng: number,
  dLat: number,
): PoligonoGeoJson {
  const maxLng = minLng + dLng;
  const maxLat = minLat + dLat;
  return {
    type: 'Polygon',
    coordinates: [
      [
        [minLng, minLat],
        [maxLng, minLat],
        [maxLng, maxLat],
        [minLng, maxLat],
        [minLng, minLat],
      ],
    ],
  };
}

interface CampanaPasadaConfig {
  temporada: string;
  fechaInicio: string;
  fechaFin: string;
  fechaSiembra: string;
  fechaCosecha: string;
}

const campanasPasadas: CampanaPasadaConfig[] = [
  {
    temporada: 'Invierno 2023',
    fechaInicio: '2023-05-01',
    fechaFin: '2023-09-15',
    fechaSiembra: '2023-05-05',
    fechaCosecha: '2023-09-10',
  },
  {
    temporada: 'Verano 2023',
    fechaInicio: '2023-11-01',
    fechaFin: '2024-03-15',
    fechaSiembra: '2023-11-10',
    fechaCosecha: '2024-03-10',
  },
  {
    temporada: 'Invierno 2024',
    fechaInicio: '2024-05-01',
    fechaFin: '2024-09-15',
    fechaSiembra: '2024-06-02',
    fechaCosecha: '2024-09-10',
  },
  {
    temporada: 'Verano 2024',
    fechaInicio: '2024-11-01',
    fechaFin: '2025-03-15',
    fechaSiembra: '2024-11-25',
    fechaCosecha: '2025-03-10',
  },
  {
    temporada: 'Invierno 2025',
    fechaInicio: '2025-05-01',
    fechaFin: '2025-09-15',
    fechaSiembra: '2025-05-05',
    fechaCosecha: '2025-09-10',
  },
  {
    temporada: 'Verano 2025',
    fechaInicio: '2025-11-01',
    fechaFin: '2026-03-15',
    fechaSiembra: '2025-10-18',
    fechaCosecha: '2026-03-10',
  },
];

async function main(): Promise<void> {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  }) as unknown as PrismaService;

  const usuarioRepo = new UsuarioPrismaRepository(prisma);
  const cultivoRepo = new CultivoPrismaRepository(prisma);
  const cultivosService = new CultivosService(cultivoRepo);
  const parcelaRepo = new ParcelaPrismaRepository(prisma);
  const parcelasService = new ParcelasService(parcelaRepo);
  const campanaRepo = new CampanaPrismaRepository(prisma);
  const campanasService = new CampanasService(
    campanaRepo,
    parcelaRepo,
    cultivoRepo,
  );
  const actividadRepo = new ActividadPrismaRepository(prisma);
  const actividadesService = new ActividadesService(actividadRepo, campanaRepo);
  const contactoRepo = new ContactoPrismaRepository(prisma);
  const contactosService = new ContactosService(contactoRepo);

  console.log('Creando usuarios...');
  const jefe = await usuarioRepo.create({
    nombre: 'Andrea Rojas',
    email: 'jefe@agroan.com',
    passwordHash: await bcrypt.hash(PASSWORD_DEMO, SALT_ROUNDS),
    rol: Rol.JEFE,
  });
  const contabilidad = await usuarioRepo.create({
    nombre: 'Marco Vidal',
    email: 'contabilidad@agroan.com',
    passwordHash: await bcrypt.hash(PASSWORD_DEMO, SALT_ROUNDS),
    rol: Rol.CONTABILIDAD,
  });
  const operativo = await usuarioRepo.create({
    nombre: 'Luis Fernandez',
    email: 'operativo@agroan.com',
    passwordHash: await bcrypt.hash(PASSWORD_DEMO, SALT_ROUNDS),
    rol: Rol.OPERATIVO,
  });

  console.log('Creando cultivos...');
  const soya = await cultivosService.create({ nombre: 'Soya' });
  const sorgo = await cultivosService.create({ nombre: 'Sorgo' });
  const trigo = await cultivosService.create({ nombre: 'Trigo' });
  await cultivosService.create({ nombre: 'Sésamo' });

  console.log('Creando parcelas...');
  // Rectangulos cercanos a la finca (-17.73902, -62.57987), sin superponerse.
  // Las hectareas reales se recalculan en ParcelasService a partir del
  // poligono (turf.area); los valores de aqui son solo una referencia.
  const elCeibo = await parcelasService.create({
    nombre: 'Parcela El Ceibo',
    hectareas: 25.5,
    ubicacionTexto: 'Km 12 carretera a Montero, Santa Cruz',
    disponibleParaPreventa: true,
    poligono: rectanguloGeoJson(-62.592, -17.734, 0.00401, 0.00539),
  });
  const santaRosa = await parcelasService.create({
    nombre: 'Parcela Santa Rosa',
    hectareas: 40,
    ubicacionTexto: 'Km 30 carretera a Warnes, Santa Cruz',
    disponibleParaPreventa: true,
    poligono: rectanguloGeoJson(-62.576, -17.734, 0.004718, 0.007186),
  });
  const losAlmendros = await parcelasService.create({
    nombre: 'Parcela Los Almendros',
    hectareas: 18,
    ubicacionTexto: 'Zona San Pedro, Santa Cruz',
    disponibleParaPreventa: false,
    poligono: rectanguloGeoJson(-62.592, -17.746, 0.003775, 0.004042),
  });
  const sanLorenzo = await parcelasService.create({
    nombre: 'Parcela San Lorenzo',
    hectareas: 25,
    ubicacionTexto: 'Zona Pailon Sur, Santa Cruz',
    disponibleParaPreventa: false,
    poligono: rectanguloGeoJson(-62.576, -17.746, 0.004, 0.0052),
  });
  const monteVerde = await parcelasService.create({
    nombre: 'Parcela Monte Verde',
    hectareas: 20,
    ubicacionTexto: 'Zona Pailon Norte, Santa Cruz',
    disponibleParaPreventa: false,
    poligono: rectanguloGeoJson(-62.5845, -17.746, 0.0036, 0.0048),
  });

  async function crearHistorialParcela(
    parcelaId: string,
    hectareas: number,
    cultivoId: string,
    rendimientos: number[],
    variedades: string[],
    fechasSiembra?: string[],
    hectareasPorTemporada?: number[],
  ): Promise<void> {
    for (let i = 0; i < campanasPasadas.length; i++) {
      const config = campanasPasadas[i];
      const ha = Math.round((hectareasPorTemporada?.[i] ?? hectareas) * 100) / 100;
      const fechaSiembraIso = fechasSiembra?.[i] ?? config.fechaSiembra;
      const campana = await campanasService.create({
        parcelaId,
        cultivoId,
        temporada: config.temporada,
        fechaInicio: config.fechaInicio,
        fechaFin: config.fechaFin,
      });

      await actividadesService.crear(
        {
          campanaId: campana.id,
          tipo: TipoActividad.SIEMBRA,
          fecha: fechaSiembraIso,
          descripcion: 'Siembra de la temporada',
          insumo: 'Semilla certificada',
          cantidad: 60,
          unidad: 'kg/ha',
        },
        operativo.id,
      );

      await actividadesService.crear(
        {
          campanaId: campana.id,
          tipo: TipoActividad.FERTILIZACION,
          fecha: config.fechaInicio,
          descripcion: 'Fertilizacion base',
          insumo: 'Fertilizante NPK',
          cantidad: 120,
          unidad: 'kg/ha',
        },
        operativo.id,
      );

      await actividadesService.crear(
        {
          campanaId: campana.id,
          tipo: TipoActividad.COSECHA,
          fecha: config.fechaCosecha,
          descripcion: 'Cosecha de la temporada',
          rendimientoTnHa: rendimientos[i],
        },
        operativo.id,
      );

      await prisma.registroCosecha.create({
        data: {
          campanaId: campana.id,
          variedad: variedades[i],
          fechaSiembra: new Date(`${fechaSiembraIso}T00:00:00.000Z`),
          haSembradas: ha,
          fechaCosecha: new Date(`${config.fechaCosecha}T00:00:00.000Z`),
          haCosechadas: ha,
          toneladas: Math.round(ha * rendimientos[i] * 100) / 100,
          origen: 'real',
        },
      });
    }
  }

  console.log('Creando historial de campanas (Soya)...');
  await crearHistorialParcela(
    elCeibo.id,
    elCeibo.hectareas,
    soya.id,
    [3.5, 3.2, 2.5, 2.8, 3.1, 3.4],
    ['6410', 'DON MARIO', 'MUNASQA', 'MUNASQA', 'DON MARIO', '6410'],
    ['2023-05-05', '2023-11-10', '2024-06-02', '2024-11-25', '2025-05-05', '2025-10-18'],
  );
  await crearHistorialParcela(
    sanLorenzo.id,
    sanLorenzo.hectareas,
    soya.id,
    [2.4, 3.6, 3.1, 3.6, 2.4, 2.4],
    ['MUNASQA', '6410', 'DON MARIO', '6410', 'MUNASQA', 'MUNASQA'],
    ['2023-06-05', '2023-10-15', '2024-05-12', '2024-10-15', '2025-06-04', '2025-11-28'],
    [18, 25, 22, 25, 18, 18],
  );

  console.log('Creando historial de campanas (Sorgo)...');
  await crearHistorialParcela(
    santaRosa.id,
    santaRosa.hectareas,
    sorgo.id,
    [4.7, 3.9, 3.1, 4.0, 4.3, 3.9],
    ['ADV 1350', 'TOBAZ', 'GRANADOR', 'TOBAZ', 'ADV 1350', 'TOBAZ'],
    ['2023-05-05', '2023-11-05', '2024-06-02', '2024-11-05', '2025-05-05', '2025-11-05'],
    [40, 36, 30, 40, 40, 40],
  );
  await crearHistorialParcela(
    monteVerde.id,
    monteVerde.hectareas,
    sorgo.id,
    [3.1, 4.7, 3.9, 4.7, 3.1, 4.6],
    ['GRANADOR', 'ADV 1350', 'TOBAZ', 'ADV 1350', 'GRANADOR', 'ADV 1350'],
    ['2023-06-05', '2023-10-15', '2024-05-14', '2024-10-15', '2025-06-04', '2025-10-15'],
    [14, 20, 17, 20, 14, 20],
  );

  console.log('Creando historial de campanas (Trigo)...');
  await crearHistorialParcela(
    losAlmendros.id,
    losAlmendros.hectareas,
    trigo.id,
    [2.3, 2.1, 1.9, 2.0, 2.2, 2.1],
    ['BR 18', 'MOTACU', 'ACHIRA', 'ACHIRA', 'BR 18', 'MOTACU'],
    ['2023-05-05', '2023-11-12', '2024-06-02', '2024-11-25', '2025-05-05', '2025-11-05'],
  );
  await crearHistorialParcela(
    sanLorenzo.id,
    sanLorenzo.hectareas,
    trigo.id,
    [1.8, 2.6, 2.2, 2.6, 1.85, 2.6],
    ['ACHIRA', 'BR 18', 'MOTACU', 'BR 18', 'ACHIRA', 'BR 18'],
    ['2023-06-04', '2023-10-16', '2024-05-14', '2024-10-18', '2025-06-04', '2025-10-16'],
    [16, 25, 21, 25, 16, 25],
  );

  console.log('Creando correccion de ejemplo sobre una cosecha...');
  const campanasElCeibo = await campanasService.findAll(elCeibo.id);
  const campanaInvierno2025 = campanasElCeibo.find(
    (campana) => campana.temporada === 'Invierno 2025',
  );
  if (campanaInvierno2025) {
    const actividadesInvierno = await actividadesService.findAllPorCampana(
      campanaInvierno2025.id,
    );
    const cosechaOriginal = actividadesInvierno.find(
      (actividad) => actividad.tipo === TipoActividad.COSECHA,
    );
    if (cosechaOriginal) {
      await actividadesService.crear(
        {
          campanaId: campanaInvierno2025.id,
          tipo: TipoActividad.COSECHA,
          fecha: '2025-09-10',
          descripcion: 'Cosecha de la temporada (corregida)',
          rendimientoTnHa: 3.3,
          correccionDeId: cosechaOriginal.id,
          motivoCorreccion:
            'Bascula mal calibrada: se repesaron los sacos y se corrigio el rendimiento',
        },
        jefe.id,
      );
      await prisma.registroCosecha.update({
        where: { campanaId: campanaInvierno2025.id },
        data: {
          toneladas: Math.round(elCeibo.hectareas * 3.3 * 100) / 100,
        },
      });
    }
  }

  console.log('Creando campanas actuales (EN_CURSO)...');
  const campanaActualElCeibo = await campanasService.create({
    parcelaId: elCeibo.id,
    cultivoId: soya.id,
    temporada: 'Verano 2026',
    fechaInicio: '2026-06-01',
    fechaFin: '2026-12-01',
    estado: EstadoCampana.EN_CURSO,
  });
  await actividadesService.crear(
    {
      campanaId: campanaActualElCeibo.id,
      tipo: TipoActividad.SIEMBRA,
      fecha: '2026-06-05',
      descripcion: 'Siembra de la temporada actual',
      insumo: 'Semilla certificada',
      cantidad: 60,
      unidad: 'kg/ha',
    },
    operativo.id,
  );
  await actividadesService.crear(
    {
      campanaId: campanaActualElCeibo.id,
      tipo: TipoActividad.FUMIGACION,
      fecha: '2026-08-01',
      descripcion: 'Control de plagas',
      insumo: 'Insecticida',
      cantidad: 2,
      unidad: 'L/ha',
      tercerizado: true,
      maquinariaUtilizada: 'Fumigadora contratada',
    },
    operativo.id,
  );
  await prisma.registroCosecha.create({
    data: {
      campanaId: campanaActualElCeibo.id,
      variedad: '6410',
      fechaSiembra: new Date('2026-06-05T00:00:00.000Z'),
      haSembradas: Math.round(elCeibo.hectareas * 100) / 100,
      origen: 'real',
    },
  });

  const campanaActualSantaRosa = await campanasService.create({
    parcelaId: santaRosa.id,
    cultivoId: sorgo.id,
    temporada: 'Verano 2026',
    fechaInicio: '2026-06-01',
    fechaFin: '2026-12-01',
    estado: EstadoCampana.EN_CURSO,
  });
  await actividadesService.crear(
    {
      campanaId: campanaActualSantaRosa.id,
      tipo: TipoActividad.SIEMBRA,
      fecha: '2026-06-05',
      descripcion: 'Siembra de la temporada actual',
      insumo: 'Semilla certificada',
      cantidad: 55,
      unidad: 'kg/ha',
    },
    operativo.id,
  );
  await actividadesService.crear(
    {
      campanaId: campanaActualSantaRosa.id,
      tipo: TipoActividad.MEDICION_HUMEDAD_SUELO,
      fecha: '2026-09-01',
      descripcion: 'Medicion de humedad del suelo',
    },
    operativo.id,
  );
  await prisma.registroCosecha.create({
    data: {
      campanaId: campanaActualSantaRosa.id,
      variedad: 'ADV 1350',
      fechaSiembra: new Date('2026-06-05T00:00:00.000Z'),
      haSembradas: Math.round(santaRosa.hectareas * 100) / 100,
      origen: 'real',
    },
  });

  console.log('Creando campana planificada (Los Almendros)...');
  const campanaPlanificadaLosAlmendros = await campanasService.create({
    parcelaId: losAlmendros.id,
    cultivoId: trigo.id,
    temporada: 'Verano 2026',
    fechaInicio: '2026-11-01',
    fechaFin: '2027-03-15',
  });
  await prisma.registroCosecha.create({
    data: {
      campanaId: campanaPlanificadaLosAlmendros.id,
      variedad: 'BR 18',
      fechaSiembra: new Date('2026-11-05T00:00:00.000Z'),
      haSembradas: Math.round(losAlmendros.hectareas * 100) / 100,
      origen: 'real',
    },
  });

  console.log('Creando insumos, gastos y presupuestos...');
  await sembrarCostos(prisma, {
    campanas: await campanasService.findAll(),
    hectareasPorParcela: {
      [elCeibo.id]: elCeibo.hectareas,
      [santaRosa.id]: santaRosa.hectareas,
      [losAlmendros.id]: losAlmendros.hectareas,
      [sanLorenzo.id]: sanLorenzo.hectareas,
      [monteVerde.id]: monteVerde.hectareas,
    },
    nombreCultivoPorId: {
      [soya.id]: soya.nombre,
      [sorgo.id]: sorgo.nombre,
      [trigo.id]: trigo.nombre,
    },
    registradoPorId: contabilidad.id,
    parcelaConGastoAnuladoId: elCeibo.id,
  });

  console.log('Entrenando modelos Random Forest (Soya, Sorgo y Trigo)...');
  const entrenamientoService = new EntrenamientoService(
    new DatosRendimientoPrismaRepository(prisma),
    new ModeloIaPrismaRepository(prisma),
    new RandomForestRegresor(),
  );
  for (const cultivo of [soya, sorgo, trigo]) {
    await entrenamientoService.entrenar(cultivo.id);
  }

  console.log('Creando contactos...');
  await contactosService.create({
    tipo: TipoContacto.COMPRADOR,
    nombre: 'Ricardo Suarez',
    empresa: 'Exportadora del Oriente',
    telefono: '+591 70011122',
    email: 'ricardo@exportadoraoriente.com',
    notas: 'Interesado en soya y sorgo, paga al contado',
  });
  await contactosService.create({
    tipo: TipoContacto.TRANSPORTISTA,
    nombre: 'Fernando Choque',
    empresa: 'Transportes Choque',
    telefono: '+591 70022233',
    notas: 'Camiones de 30 toneladas',
  });
  await contactosService.create({
    tipo: TipoContacto.MAQUINARIA,
    nombre: 'Jorge Paz',
    empresa: 'Maquinaria Agricola Paz',
    telefono: '+591 70033344',
    email: 'jorge@maquinariapaz.com',
  });
  await contactosService.create({
    tipo: TipoContacto.INSUMOS,
    nombre: 'AgroInsumos Santa Cruz',
    telefono: '+591 33445566',
    email: 'ventas@agroinsumosscz.com',
  });

  console.log('');
  console.log('Seed completado. Usuarios de prueba:');
  console.log(`  JEFE:         ${jefe.email} / ${PASSWORD_DEMO}`);
  console.log(`  CONTABILIDAD: ${contabilidad.email} / ${PASSWORD_DEMO}`);
  console.log(`  OPERATIVO:    ${operativo.email} / ${PASSWORD_DEMO}`);

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  process.exit(1);
});
