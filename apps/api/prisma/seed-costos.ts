import type { Prisma, PrismaClient } from '../src/generated/prisma/client';
import {
  CategoriaGasto,
  EstadoCampana,
  EstadoGasto,
  TipoInsumo,
} from '../src/generated/prisma/enums';

// Datos de DEMOSTRACION (ficticios). Montos en Bs.

interface InsumoSeed {
  nombre: string;
  tipo: TipoInsumo;
  unidad: string;
  /** [vigenteDesde, precio], de mas antiguo a mas nuevo. */
  precios: [string, number][];
}

const INSUMOS: InsumoSeed[] = [
  { nombre: 'Semilla de soya', tipo: TipoInsumo.SEMILLA, unidad: 'kg', precios: [['2024-10-01', 8.8], ['2025-10-01', 9.5]] },
  { nombre: 'Semilla de sorgo', tipo: TipoInsumo.SEMILLA, unidad: 'kg', precios: [['2024-10-01', 11.5], ['2025-10-01', 12]] },
  { nombre: 'Semilla de trigo', tipo: TipoInsumo.SEMILLA, unidad: 'kg', precios: [['2024-10-01', 7.2], ['2025-10-01', 7.8]] },
  { nombre: 'Fertilizante NPK 15-15-15', tipo: TipoInsumo.FERTILIZANTE, unidad: 'kg', precios: [['2024-10-01', 5.2], ['2025-10-01', 5.8]] },
  { nombre: 'Urea', tipo: TipoInsumo.FERTILIZANTE, unidad: 'kg', precios: [['2024-10-01', 4.1]] },
  { nombre: 'Herbicida glifosato', tipo: TipoInsumo.AGROQUIMICO, unidad: 'L', precios: [['2024-10-01', 38], ['2025-10-01', 41.5]] },
  { nombre: 'Insecticida', tipo: TipoInsumo.AGROQUIMICO, unidad: 'L', precios: [['2024-10-01', 95]] },
  { nombre: 'Diesel', tipo: TipoInsumo.COMBUSTIBLE, unidad: 'L', precios: [['2024-10-01', 3.72]] },
];

interface PlanCultivo {
  insumos: { insumo: string; cantidadPorHa: number; diasDesdeInicio: number }[];
  maquinariaPorHa: number;
  manoObraPorHa: number;
  servicioPorHa: number;
}

const PLAN: Record<string, PlanCultivo> = {
  Soya: {
    insumos: [
      { insumo: 'Semilla de soya', cantidadPorHa: 60, diasDesdeInicio: 4 },
      { insumo: 'Fertilizante NPK 15-15-15', cantidadPorHa: 120, diasDesdeInicio: 0 },
      { insumo: 'Herbicida glifosato', cantidadPorHa: 3, diasDesdeInicio: 30 },
      { insumo: 'Diesel', cantidadPorHa: 25, diasDesdeInicio: 4 },
    ],
    maquinariaPorHa: 450,
    manoObraPorHa: 260,
    servicioPorHa: 180,
  },
  Sorgo: {
    insumos: [
      { insumo: 'Semilla de sorgo', cantidadPorHa: 12, diasDesdeInicio: 4 },
      { insumo: 'Fertilizante NPK 15-15-15', cantidadPorHa: 100, diasDesdeInicio: 0 },
      { insumo: 'Herbicida glifosato', cantidadPorHa: 2, diasDesdeInicio: 30 },
      { insumo: 'Diesel', cantidadPorHa: 22, diasDesdeInicio: 4 },
    ],
    maquinariaPorHa: 420,
    manoObraPorHa: 240,
    servicioPorHa: 170,
  },
  Trigo: {
    insumos: [
      { insumo: 'Semilla de trigo', cantidadPorHa: 110, diasDesdeInicio: 4 },
      { insumo: 'Fertilizante NPK 15-15-15', cantidadPorHa: 130, diasDesdeInicio: 0 },
      { insumo: 'Herbicida glifosato', cantidadPorHa: 1.5, diasDesdeInicio: 30 },
      { insumo: 'Diesel', cantidadPorHa: 20, diasDesdeInicio: 4 },
    ],
    maquinariaPorHa: 400,
    manoObraPorHa: 220,
    servicioPorHa: 150,
  },
};

/** Presupuesto = costo planificado x factor (1.05 sobrado, 0.97 se excede). */
const FACTOR_PRESUPUESTO: Record<string, number> = {
  'Verano 2024': 1.05,
  'Invierno 2025': 1.02,
  'Verano 2025': 0.97,
};

export interface CampanaSeed {
  id: string;
  parcelaId: string;
  cultivoId: string;
  temporada: string;
  fechaInicio: Date;
  estado: EstadoCampana;
}

export interface OpcionesCostos {
  campanas: CampanaSeed[];
  hectareasPorParcela: Record<string, number>;
  nombreCultivoPorId: Record<string, string>;
  registradoPorId: string;
  /** Parcela cuya campana "Verano 2025" incluye un gasto anulado de ejemplo. */
  parcelaConGastoAnuladoId: string;
}

const redondear = (valor: number): number => Math.round(valor * 100) / 100;

function sumarDias(fecha: Date, dias: number): Date {
  const resultado = new Date(fecha);
  resultado.setUTCDate(resultado.getUTCDate() + dias);
  return resultado;
}

export async function sembrarCostos(
  prisma: PrismaClient,
  opciones: OpcionesCostos,
): Promise<void> {
  const insumos = new Map<
    string,
    { id: string; unidad: string; precios: [Date, number][] }
  >();
  for (const insumo of INSUMOS) {
    const creado = await prisma.insumo.create({
      data: {
        nombre: insumo.nombre,
        tipo: insumo.tipo,
        unidad: insumo.unidad,
        precios: {
          create: insumo.precios.map(([desde, precio]) => ({
            precio,
            vigenteDesde: new Date(desde),
          })),
        },
      },
    });
    insumos.set(insumo.nombre, {
      id: creado.id,
      unidad: insumo.unidad,
      precios: insumo.precios.map(([d, p]) => [new Date(d), p]),
    });
  }

  const precioVigente = (nombre: string, fecha: Date): number => {
    const vigentes = (insumos.get(nombre)?.precios ?? []).filter(
      ([desde]) => desde <= fecha,
    );
    return vigentes[vigentes.length - 1]?.[1] ?? insumos.get(nombre)!.precios[0][1];
  };

  for (const campana of opciones.campanas) {
    const hectareas = opciones.hectareasPorParcela[campana.parcelaId];
    const plan = PLAN[opciones.nombreCultivoPorId[campana.cultivoId]];
    const enCurso = campana.estado === EstadoCampana.EN_CURSO;
    const planificada = campana.estado === EstadoCampana.PLANIFICADA;

    const gastos: Prisma.GastoUncheckedCreateInput[] = [];
    let costoPlanificado = 0;

    for (const linea of plan.insumos) {
      const fecha = sumarDias(campana.fechaInicio, linea.diasDesdeInicio);
      const precio = precioVigente(linea.insumo, campana.fechaInicio);
      const cantidad = redondear(linea.cantidadPorHa * hectareas);
      const monto = redondear(cantidad * precio);
      costoPlanificado += monto;
      // En una campana planificada solo hay compras anticipadas comprometidas.
      if (planificada && !/^Semilla|^Fertilizante/.test(linea.insumo)) continue;
      gastos.push({
        campanaId: campana.id,
        categoria: CategoriaGasto.INSUMOS,
        descripcion: `${linea.insumo} (${cantidad} ${insumos.get(linea.insumo)!.unidad})`,
        monto,
        fecha,
        estado: planificada ? EstadoGasto.COMPROMETIDO : EstadoGasto.PAGADO,
        insumoId: insumos.get(linea.insumo)!.id,
        cantidad,
        precioUnitario: precio,
        registradoPorId: opciones.registradoPorId,
      });
    }

    const maquinaria = redondear(plan.maquinariaPorHa * hectareas);
    const manoObra = redondear(plan.manoObraPorHa * hectareas);
    const servicio = redondear(plan.servicioPorHa * hectareas);
    costoPlanificado += maquinaria + manoObra + servicio;

    if (!planificada) {
      gastos.push(
        {
          campanaId: campana.id,
          categoria: CategoriaGasto.MAQUINARIA,
          descripcion: 'Alquiler de maquinaria (siembra y labores)',
          monto: maquinaria,
          fecha: sumarDias(campana.fechaInicio, 10),
          estado: EstadoGasto.PAGADO,
          registradoPorId: opciones.registradoPorId,
        },
        {
          campanaId: campana.id,
          categoria: CategoriaGasto.MANO_DE_OBRA,
          descripcion: 'Jornales de campo',
          monto: manoObra,
          fecha: sumarDias(campana.fechaInicio, 60),
          estado: EstadoGasto.PAGADO,
          registradoPorId: opciones.registradoPorId,
        },
        {
          campanaId: campana.id,
          categoria: CategoriaGasto.SERVICIO_TERCERIZADO,
          descripcion: enCurso
            ? 'Servicio de cosecha tercerizada (contratado)'
            : 'Servicio de fumigacion tercerizada',
          monto: servicio,
          fecha: enCurso ? new Date('2026-11-20') : sumarDias(campana.fechaInicio, 45),
          estado: enCurso ? EstadoGasto.COMPROMETIDO : EstadoGasto.PAGADO,
          registradoPorId: opciones.registradoPorId,
        },
      );
    }

    // Un gasto duplicado y anulado, para demostrar la anulacion con motivo.
    if (
      campana.temporada === 'Verano 2025' &&
      campana.parcelaId === opciones.parcelaConGastoAnuladoId
    ) {
      gastos.push({
        campanaId: campana.id,
        categoria: CategoriaGasto.SERVICIO_TERCERIZADO,
        descripcion: 'Servicio de fumigacion tercerizada (duplicado)',
        monto: servicio,
        fecha: sumarDias(campana.fechaInicio, 45),
        estado: EstadoGasto.PAGADO,
        registradoPorId: opciones.registradoPorId,
        anulado: true,
        motivoAnulacion: 'Registrado dos veces; ya existe el comprobante original.',
        anuladoEn: sumarDias(campana.fechaInicio, 46),
      });
    }

    for (const data of gastos) {
      await prisma.gasto.create({ data });
    }

    const factor =
      campana.estado === EstadoCampana.COSECHADA
        ? (FACTOR_PRESUPUESTO[campana.temporada] ?? 1)
        : enCurso
          ? 1.05
          : 1;
    await prisma.presupuesto.create({
      data: {
        campanaId: campana.id,
        montoTotal: redondear(costoPlanificado * factor),
        notas: 'Presupuesto de demostracion',
      },
    });
  }
}
