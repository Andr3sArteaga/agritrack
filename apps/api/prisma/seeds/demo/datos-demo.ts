/**
 * Datos de DEMOSTRACION (enmascarados) para el modelo de rendimiento.
 * Los CSV de esta carpeta NO son datos reales de la empresa: lotes, fechas,
 * superficies y toneladas estan enmascarados. Solo para desarrollo y demo.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { PrismaClient } from '../../../src/generated/prisma/client';
import { EstadoCampana } from '../../../src/generated/prisma/enums';

export const ORIGEN_DEMO = 'demo_enmascarado';
export const CULTIVO_DEMO = 'Soya';
const UBICACION_DEMO = 'Datos de demostración (enmascarados)';

export interface FilaLoteDemo {
  campana: string;
  lote: string;
  variedad: string;
  fechaSiembra: Date | null;
  fechaCosecha: Date | null;
  haSembradas: number;
  haCosechadas: number | null;
  toneladas: number | null;
}

export interface TotalDemo {
  campana: string;
  /** Version (a): null si la superficie total de la campaña no se conoce. */
  rendimientoTotal: number | null;
}

function leerCsv(archivo: string): Record<string, string>[] {
  const [cabecera, ...lineas] = readFileSync(join(__dirname, archivo), 'utf-8')
    .replace(/^﻿/, '')
    .split(/\r?\n/)
    .filter((linea) => linea.trim() !== '');
  const columnas = cabecera.split(',');
  return lineas.map((linea) => {
    const valores = linea.split(',');
    return Object.fromEntries(columnas.map((c, i) => [c, valores[i] ?? '']));
  });
}

const fecha = (texto: string): Date | null =>
  texto ? new Date(`${texto}T00:00:00.000Z`) : null;
const numero = (texto: string): number | null =>
  texto === '' ? null : Number(texto);

export function leerLotesDemo(): FilaLoteDemo[] {
  return leerCsv('lotes_5_campanas_enmascarado.csv').map((f) => ({
    campana: f.campana,
    lote: f.lote,
    variedad: f.variedad,
    fechaSiembra: fecha(f.fecha_siembra),
    fechaCosecha: fecha(f.fecha_cosecha),
    haSembradas: Number(f.ha_sembradas),
    haCosechadas: numero(f.ha_cosechadas),
    toneladas: numero(f.toneladas_descargadas),
  }));
}

export function leerTotalesDemo(): TotalDemo[] {
  return leerCsv('totales_enmascarado.csv').map((f) => ({
    campana: f.campana,
    rendimientoTotal: numero(f.rend_a),
  }));
}

/** La campaña "2021-2022" empieza el 1 de octubre de 2021. */
export const inicioDeCampana = (campana: string): Date =>
  new Date(`${campana.slice(0, 4)}-10-01T00:00:00.000Z`);

/**
 * Candado: los datos de demostracion nunca se cargan en produccion.
 * Solo se acepta una base local, salvo que se declare lo contrario a proposito.
 */
export function impedirProduccion(urlBase: string | undefined): void {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('El seed de demostración no corre en producción (NODE_ENV=production).');
  }
  const esLocal = /@(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(urlBase ?? '');
  if (!esLocal && process.env.PERMITIR_SEED_DEMO_REMOTO !== 'si') {
    throw new Error(
      'El seed de demostración solo corre contra una base local (localhost).',
    );
  }
}

/** Carga parcelas, campañas, registros de cosecha y totales de demo. Es idempotente. */
export async function sembrarDemo(
  prisma: PrismaClient,
  urlBase: string | undefined,
): Promise<{ parcelas: number; campanas: number; registros: number; omitido: boolean }> {
  impedirProduccion(urlBase);

  const yaCargado = await prisma.registroCosecha.count({ where: { origen: ORIGEN_DEMO } });
  if (yaCargado > 0) {
    return { parcelas: 0, campanas: 0, registros: 0, omitido: true };
  }

  const lotes = leerLotesDemo();
  const totales = leerTotalesDemo();
  const cultivo = await prisma.cultivo.upsert({
    where: { nombre: CULTIVO_DEMO },
    update: {},
    create: { nombre: CULTIVO_DEMO },
  });

  // Una parcela por lote. Sin poligono y nunca en preventa.
  const parcelaPorLote = new Map<string, string>();
  for (const lote of [...new Set(lotes.map((f) => f.lote))].sort()) {
    const ultima = lotes.filter((f) => f.lote === lote).at(-1)!;
    const parcela = await prisma.parcela.create({
      data: {
        nombre: `Lote demo ${lote}`,
        hectareas: ultima.haSembradas,
        ubicacionTexto: UBICACION_DEMO,
        disponibleParaPreventa: false,
        activa: true,
      },
    });
    parcelaPorLote.set(lote, parcela.id);
  }

  // Una campaña y un registro de cosecha por lote y campaña.
  // No se crean actividades: la cadena de hashes no se toca.
  for (const fila of lotes) {
    await prisma.campana.create({
      data: {
        parcelaId: parcelaPorLote.get(fila.lote)!,
        cultivoId: cultivo.id,
        temporada: fila.campana,
        fechaInicio: inicioDeCampana(fila.campana),
        fechaFin: fila.fechaCosecha,
        estado: EstadoCampana.COSECHADA,
        registroCosecha: {
          create: {
            variedad: fila.variedad,
            fechaSiembra: fila.fechaSiembra,
            fechaCosecha: fila.fechaCosecha,
            haSembradas: fila.haSembradas,
            haCosechadas: fila.haCosechadas,
            toneladas: fila.toneladas,
            origen: ORIGEN_DEMO,
          },
        },
      },
    });
  }

  await prisma.totalCampana.createMany({
    data: totales.map((total) => ({
      cultivoId: cultivo.id,
      temporada: total.campana,
      rendimientoTotalTnHa: total.rendimientoTotal,
      origen: ORIGEN_DEMO,
    })),
  });

  return {
    parcelas: parcelaPorLote.size,
    campanas: lotes.length,
    registros: lotes.length,
    omitido: false,
  };
}
