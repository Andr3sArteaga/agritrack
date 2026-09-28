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
  fechaCosecha: string;
}

const campanasPasadas: CampanaPasadaConfig[] = [
  {
    temporada: 'Verano 2024',
    fechaInicio: '2024-11-01',
    fechaFin: '2025-03-15',
    fechaCosecha: '2025-03-10',
  },
  {
    temporada: 'Invierno 2025',
    fechaInicio: '2025-05-01',
    fechaFin: '2025-09-15',
    fechaCosecha: '2025-09-10',
  },
  {
    temporada: 'Verano 2025',
    fechaInicio: '2025-11-01',
    fechaFin: '2026-03-15',
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

  async function crearHistorialParcela(
    parcelaId: string,
    cultivoId: string,
    rendimientos: [number, number, number],
  ): Promise<void> {
    for (let i = 0; i < campanasPasadas.length; i++) {
      const config = campanasPasadas[i];
      const campana = await campanasService.create({
        parcelaId,
        cultivoId,
        temporada: config.temporada,
        fechaInicio: config.fechaInicio,
        fechaFin: config.fechaFin,
      });

      const fechaSiembra = new Date(config.fechaInicio);
      fechaSiembra.setDate(fechaSiembra.getDate() + 4);

      await actividadesService.crear(
        {
          campanaId: campana.id,
          tipo: TipoActividad.SIEMBRA,
          fecha: fechaSiembra.toISOString().slice(0, 10),
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
    }
  }

  console.log('Creando historial de campanas (El Ceibo / Soya)...');
  await crearHistorialParcela(elCeibo.id, soya.id, [2.8, 3.1, 3.4]);

  console.log('Creando historial de campanas (Santa Rosa / Sorgo)...');
  await crearHistorialParcela(santaRosa.id, sorgo.id, [4.0, 4.3, 3.9]);

  console.log('Creando historial de campanas (Los Almendros / Trigo)...');
  await crearHistorialParcela(losAlmendros.id, trigo.id, [2.0, 2.2, 2.1]);

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

  console.log('Creando campana planificada (Los Almendros)...');
  await campanasService.create({
    parcelaId: losAlmendros.id,
    cultivoId: trigo.id,
    temporada: 'Verano 2026',
    fechaInicio: '2026-11-01',
    fechaFin: '2027-03-15',
  });

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
