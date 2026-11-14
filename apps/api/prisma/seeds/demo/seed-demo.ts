/**
 * Seed SOLO de desarrollo: carga los datos de demostracion (enmascarados).
 * Uso:  npm run seed:demo
 * No forma parte de `prisma db seed` y se niega a correr en produccion.
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../../src/generated/prisma/client';
import { impedirProduccion, sembrarDemo } from './datos-demo';

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  impedirProduccion(url);
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: url }),
  });
  try {
    const resultado = await sembrarDemo(prisma, url);
    console.log(
      resultado.omitido
        ? 'Los datos de demostración ya estaban cargados: no se hizo nada.'
        : `Datos de demostración (enmascarados) cargados: ${resultado.parcelas} parcelas, ${resultado.campanas} campañas, ${resultado.registros} registros de cosecha.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
