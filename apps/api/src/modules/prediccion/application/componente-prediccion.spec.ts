/**
 * Componente de estimacion completo, sin base de datos: repositorios en memoria
 * con los datos de demostracion (enmascarados) y el Random Forest real.
 * Incluye la PARIDAD con el prototipo de Python (variante A): las conclusiones
 * por corte deben coincidir con Experimentos/pipeline_rf/prototipo_enmascarado/reporte.md.
 */
// @nestjs/* v12 es ESM-only y Jest corre en CJS: se mockean los decoradores.
jest.mock('@nestjs/common', () => ({
  Injectable: () => () => undefined,
  Inject: () => () => undefined,
  Optional: () => () => undefined,
  BadRequestException: class BadRequestException extends Error {},
  ConflictException: class ConflictException extends Error {},
  NotFoundException: class NotFoundException extends Error {},
}));

import { TipoActividad } from '../../../generated/prisma/enums';
import {
  inicioDeCampana,
  leerLotesDemo,
  leerTotalesDemo,
} from '../../../../prisma/seeds/demo/datos-demo';
import type {
  ContextoEstimacion,
  DatosCosechaInput,
  DatosSiembraInput,
  ModeloIa,
  ModeloIaConPesos,
  NuevoModeloIa,
  OrigenDatos,
  PreparacionParcelaDev,
  RegistroCosechaCampana,
  RegistroLote,
  TemporadaCultivo,
} from '../domain/modelo-rendimiento';
import type { DatosRendimientoRepository } from '../domain/repositories/datos-rendimiento.repository';
import type { ModeloIaRepository } from '../domain/repositories/modelo-ia.repository';
import { LineaBaseAdapter } from '../infrastructure/linea-base.adapter';
import { RandomForestAdapter } from '../infrastructure/random-forest.adapter';
import { RandomForestRegresor } from '../infrastructure/random-forest.regresor';
import { EntrenamientoService } from './entrenamiento.service';
import { EstimacionService } from './estimacion.service';

const CULTIVO = 'soya';

class DatosEnMemoria implements DatosRendimientoRepository {
  private registrosCosecha = new Map<string, RegistroCosechaCampana>();

  constructor(
    private readonly filas: RegistroLote[],
    private readonly campanas: TemporadaCultivo[],
    private readonly origen: OrigenDatos,
  ) {}
  origenesConDatos = async () => (this.filas.length > 0 ? [this.origen] : []);
  registros = async (_c: string, origen: OrigenDatos) =>
    origen === this.origen ? this.filas : [];
  temporadas = async (_c: string, origen: OrigenDatos) =>
    origen === this.origen ? this.campanas : [];
  parcelasDemo = async () =>
    this.origen === 'demo_enmascarado'
      ? [...new Set(this.filas.map((f) => f.parcelaId))]
      : [];
  existeCampana = async (campanaId: string) =>
    this.registrosCosecha.has(campanaId) ||
    this.filas.some((f) => f.campanaId === campanaId);
  obtenerRegistroCosecha = async (
    campanaId: string,
  ): Promise<RegistroCosechaCampana | null> => {
    const guardado = this.registrosCosecha.get(campanaId);
    if (guardado) return guardado;
    const fila = this.filas.find((f) => f.campanaId === campanaId);
    if (!fila) return null;
    return {
      id: `rc-${campanaId}`,
      campanaId,
      variedad: fila.variedad,
      fechaSiembra: fila.fechaSiembra,
      haSembradas: fila.haSembradas,
      fechaCosecha: null,
      haCosechadas: fila.haCosechadas,
      toneladas: fila.toneladas,
      origen: this.origen,
      updatedAt: new Date(),
    };
  };
  guardarSiembra = async (
    campanaId: string,
    datos: DatosSiembraInput,
  ): Promise<RegistroCosechaCampana> => {
    const previo = await this.obtenerRegistroCosecha(campanaId);
    const nuevo: RegistroCosechaCampana = {
      id: previo?.id ?? `rc-${campanaId}`,
      campanaId,
      variedad: datos.variedad,
      fechaSiembra: datos.fechaSiembra,
      haSembradas: datos.haSembradas,
      fechaCosecha: previo?.fechaCosecha ?? null,
      haCosechadas: previo?.haCosechadas ?? null,
      toneladas: previo?.toneladas ?? null,
      origen: 'real',
      updatedAt: new Date(),
    };
    this.registrosCosecha.set(campanaId, nuevo);
    return nuevo;
  };
  guardarCosecha = async (
    campanaId: string,
    datos: DatosCosechaInput,
  ): Promise<RegistroCosechaCampana> => {
    const previo = await this.obtenerRegistroCosecha(campanaId);
    if (!previo) throw new Error('Sin siembra previa');
    const nuevo: RegistroCosechaCampana = {
      ...previo,
      haCosechadas: datos.haCosechadas,
      toneladas: datos.toneladas,
      fechaCosecha: datos.fechaCosecha,
      origen: 'real',
      updatedAt: new Date(),
    };
    this.registrosCosecha.set(campanaId, nuevo);
    return nuevo;
  };
  prepararHistorialDev = async (
    parcelaId: string,
    cultivoId?: string,
  ): Promise<PreparacionParcelaDev | null> => {
    const fila = this.filas.find((f) => f.parcelaId === parcelaId);
    if (!fila) return null;
    return {
      parcelaId,
      cultivoId: cultivoId ?? CULTIVO,
      cultivoNombre: 'Soya',
      campanaActualId: fila.campanaId,
      temporadaActual: fila.temporada,
      campanasHabilitadas: 6,
      campanasSinActividadCosecha: [],
      campanaActualNecesitaSiembra: null,
    };
  };
  async contextoEstimacion(parcelaId: string, campanaId: string): Promise<ContextoEstimacion | null> {
    const fila = this.filas.find((f) => f.parcelaId === parcelaId && f.campanaId === campanaId);
    if (!fila) return null;
    return {
      parcelaId,
      campanaId,
      cultivoId: CULTIVO,
      temporada: fila.temporada,
      inicioCampana: this.campanas.find((c) => c.temporada === fila.temporada)!.inicio,
      origen: this.origen,
      siembra: {
        variedad: fila.variedad,
        fechaSiembra: fila.fechaSiembra,
        haSembradas: fila.haSembradas,
      },
    };
  }
}

class ModelosEnMemoria implements ModeloIaRepository {
  versiones: ModeloIaConPesos[] = [];
  async crearVersion(datos: NuevoModeloIa): Promise<ModeloIa> {
    if (datos.estado === 'activo') {
      for (const v of this.versiones) if (v.estado === 'activo') v.estado = 'archivado';
    }
    const version: ModeloIaConPesos = {
      ...datos,
      id: `m${this.versiones.length + 1}`,
      version: this.versiones.length + 1,
      createdAt: new Date(),
    };
    this.versiones.push(version);
    return version;
  }
  listar = async () => [...this.versiones].reverse();
  async vigente(_c: string, origen: OrigenDatos): Promise<ModeloIaConPesos | null> {
    const delOrigen = this.versiones.filter((v) => v.origenDatos === origen).reverse();
    return (
      delOrigen.find((v) => v.estado === 'activo') ??
      delOrigen.find((v) => v.estado === 'experimental') ??
      null
    );
  }
}

function datosDemo(): { filas: RegistroLote[]; campanas: TemporadaCultivo[] } {
  return {
    filas: leerLotesDemo().map((l) => ({
      parcelaId: l.lote,
      campanaId: `${l.lote}-${l.campana}`,
      temporada: l.campana,
      variedad: l.variedad,
      fechaSiembra: l.fechaSiembra,
      haSembradas: l.haSembradas,
      haCosechadas: l.haCosechadas,
      toneladas: l.toneladas,
    })),
    campanas: leerTotalesDemo().map((t) => ({
      temporada: t.campana,
      inicio: inicioDeCampana(t.campana),
      rendimientoTotal: t.rendimientoTotal,
    })),
  };
}

function armar(origen: OrigenDatos, datos = datosDemo()) {
  const repositorioDatos = new DatosEnMemoria(datos.filas, datos.campanas, origen);
  const modelos = new ModelosEnMemoria();
  const regresor = new RandomForestRegresor();
  const entrenamiento = new EntrenamientoService(repositorioDatos, modelos, regresor);
  const estimacion = new EstimacionService(
    new LineaBaseAdapter(repositorioDatos),
    new RandomForestAdapter(modelos, regresor),
    repositorioDatos,
    modelos,
    regresor,
  );
  return { entrenamiento, estimacion, modelos, regresor };
}

describe('Componente de estimacion con datos de demostracion (enmascarados)', () => {
  const sistema = armar('demo_enmascarado');
  let version: ModeloIa;

  beforeAll(async () => {
    version = await sistema.entrenamiento.entrenar(CULTIVO);
  }, 120_000);

  it('antes de entrenar no hay estimacion experimental; la linea base es la oficial', async () => {
    const limpio = armar('demo_enmascarado');
    const respuesta = await limpio.estimacion.estimar('L02', 'L02-2025-2026');
    expect(respuesta.experimental).toBeNull();
    expect(respuesta.oficial).toMatchObject({ fuente: 'linea_base', estado: 'oficial' });
  });

  it('el entrenamiento crea la version 1 con sus metadatos', () => {
    expect(version.version).toBe(1);
    expect(version.origenDatos).toBe('demo_enmascarado');
    expect(version.campanasUsadas).toEqual([
      '2021-2022', '2022-2023', '2023-2024', '2024-2025', '2025-2026',
    ]);
    expect(version.hashDatos).toMatch(/^[0-9a-f]{64}$/);
    expect(version.codificador.columnas).toEqual([
      'ha_sembradas', 'dias_siembra',
      'variedad=6410', 'variedad=MUNASQA', 'variedad=MUNASQA Y 6410',
    ]);
    expect(version.metricas.parametros).toEqual({
      arboles: 300, semillaModelo: 42, repeticionesBootstrap: 1000, semillaBootstrap: 12345,
    });
  });

  it('BLOQUEO: el modelo de demostracion queda "experimental" aunque gane en el global', () => {
    expect(version.metricas.varianteA.global?.conclusion).toBe('supera');
    expect(version.estado).toBe('experimental');
    expect(version.metricas.activacion.motivos.join(' ')).toContain('demostración');
  });

  it('PARIDAD con Python (variante A): mismas conclusiones por corte', () => {
    const porCorte = Object.fromEntries(
      version.metricas.varianteA.cortes.map((c) => [c.campana, c]),
    );
    // Reporte de Python: 2022-2023 sin base (a); 2023-2024 y 2024-2025 gana (*); 2025-2026 pierde.
    expect(porCorte['2022-2023'].conclusion).toBe('sin_linea_base');
    expect(porCorte['2023-2024'].conclusion).toBe('supera');
    expect(porCorte['2024-2025'].conclusion).toBe('supera');
    expect(porCorte['2025-2026'].conclusion).toBe('peor');
    // La linea base es deterministica: debe dar lo mismo que Python (3 decimales).
    expect(porCorte['2023-2024'].maeLineaBase).toBeCloseTo(1.116, 3);
    expect(porCorte['2024-2025'].maeLineaBase).toBeCloseTo(0.7, 3);
    expect(porCorte['2025-2026'].maeLineaBase).toBeCloseTo(0.161, 3);
    // El Random Forest es otra libreria: se acepta una diferencia pequeña en el MAE.
    expect(Math.abs(porCorte['2022-2023'].maeModelo - 0.216)).toBeLessThan(0.05);
    expect(Math.abs(porCorte['2023-2024'].maeModelo - 0.773)).toBeLessThan(0.05);
    expect(Math.abs(porCorte['2024-2025'].maeModelo - 0.403)).toBeLessThan(0.05);
    expect(Math.abs(porCorte['2025-2026'].maeModelo - 0.33)).toBeLessThan(0.05);
    expect(version.metricas.varianteA.global).toMatchObject({ filas: 123, lotes: 42 });
    expect(version.metricas.varianteA.global?.maeLineaBase).toBeCloseTo(0.671, 3);
  });

  it('con datos REALES iguales tampoco se activaria: es peor en la ultima campaña', async () => {
    const real = armar('real');
    const versionReal = await real.entrenamiento.entrenar(CULTIVO);
    expect(versionReal.estado).toBe('experimental');
    expect(versionReal.metricas.activacion.motivos.join(' ')).toContain('última campaña');
  }, 120_000);

  it('la estimacion devuelve la linea base como oficial y el modelo aparte como "experimental"', async () => {
    const respuesta = await sistema.estimacion.estimar('L02', 'L02-2025-2026');
    expect(respuesta.oficial).toMatchObject({
      fuente: 'linea_base',
      estado: 'oficial',
      version_modelo: null,
      campañas_usadas: 3,
    });
    // Promedio de los totales de 2022-2023, 2023-2024 y 2024-2025.
    expect(respuesta.oficial.valor_t_ha).toBe(1.68);
    expect(respuesta.experimental).toMatchObject({
      fuente: 'modelo',
      estado: 'experimental',
      version_modelo: 'v1',
      campañas_usadas: 5,
    });
    expect(typeof respuesta.experimental?.valor_t_ha).toBe('number');
    expect(respuesta.referencia_linea_base).toBeNull();
    expect(respuesta.origen_datos).toBe('demo_enmascarado');
    expect(respuesta.etiqueta_datos).toBe('Datos iniciales (V1)');
    expect(respuesta.experimental?.advertencias.join(' ')).toContain('datos iniciales');
  });

  it('sin campañas anteriores con total, la linea base responde "sin datos"', async () => {
    const respuesta = await sistema.estimacion.estimar('L02', 'L02-2021-2022');
    expect(respuesta.oficial.valor_t_ha).toBeNull();
    expect(respuesta.oficial.advertencias.join(' ')).toContain('Sin datos');
  });

  it('RF-32: con menos de 3 campañas anteriores la linea base lleva la advertencia', async () => {
    const respuesta = await sistema.estimacion.estimar('L02', 'L02-2024-2025');
    expect(respuesta.oficial.campañas_usadas).toBe(2);
    expect(respuesta.oficial.advertencias.join(' ')).toContain('RF-32');
  });

  it('una fecha de siembra faltante se imputa y se avisa', async () => {
    const respuesta = await sistema.estimacion.estimar('L03', 'L03-2021-2022');
    expect(respuesta.experimental?.advertencias.join(' ')).toContain('imputado');
  });

  it('el modelo guardado (toJSON) y vuelto a cargar (load) predice lo mismo', () => {
    const guardado = sistema.modelos.versiones[0].modelo;
    const X = [[50, 80, 1, 0, 0], [30, 95, 0, 1, 0]];
    const cargadoA = sistema.regresor.cargar(JSON.parse(JSON.stringify(guardado)));
    const cargadoB = sistema.regresor.cargar(guardado);
    expect(cargadoA.predecir(X)).toEqual(cargadoB.predecir(X));
  });

  it('entrenar dos veces con los mismos datos da el mismo hash y las mismas metricas', async () => {
    const segunda = await sistema.entrenamiento.entrenar(CULTIVO);
    expect(segunda.version).toBe(2);
    expect(segunda.hashDatos).toBe(version.hashDatos);
    expect(segunda.metricas.varianteA).toEqual(version.metricas.varianteA);
  }, 120_000);

  it('solo si un modelo esta "activo" su estimacion pasa a ser la oficial', async () => {
    const activo = armar('real');
    await activo.entrenamiento.entrenar(CULTIVO);
    activo.modelos.versiones[0].estado = 'activo'; // activacion forzada solo para esta prueba
    const respuesta = await activo.estimacion.estimar('L02', 'L02-2025-2026');
    expect(respuesta.oficial).toMatchObject({ fuente: 'modelo', estado: 'oficial', version_modelo: 'v1' });
    expect(respuesta.experimental).toBeNull();
    expect(respuesta.referencia_linea_base).toMatchObject({ fuente: 'linea_base' });
  }, 120_000);

  it('al activarse una version nueva, la activa anterior pasa a "archivado"', async () => {
    const modelos = new ModelosEnMemoria();
    const base = { ...sistema.modelos.versiones[0], origenDatos: 'real' as const };
    await modelos.crearVersion({ ...base, estado: 'activo' });
    await modelos.crearVersion({ ...base, estado: 'activo' });
    expect(modelos.versiones.map((v) => v.estado)).toEqual(['archivado', 'activo']);
  });

  it('sin datos del cultivo, entrenar falla con un mensaje claro y el disparador de cierre no rompe', async () => {
    const vacio = armar('real', { filas: [], campanas: [] });
    await expect(vacio.entrenamiento.entrenar(CULTIVO)).rejects.toThrow('No hay datos');
    await expect(vacio.entrenamiento.entrenarAlCerrarCampana(CULTIVO)).resolves.toBeNull();
  });

  it('analizarImpacto evalua variables de siembra con el modelo entrenado y marca labores post-siembra como neutras', async () => {
    const impactoSiembra = await sistema.estimacion.analizarImpacto({
      lote: 'L02',
      campana: 'L02-2025-2026',
      tipoActividad: TipoActividad.SIEMBRA,
      haSembradas: 40,
      fechaSiembra: '2025-11-15',
      variedad: '6410',
    });

    expect(['POSITIVO', 'NEUTRO', 'NEGATIVO']).toContain(impactoSiembra.efectoGlobal);
    expect(typeof impactoSiembra.estimado_t_ha).toBe('number');
    expect(impactoSiembra.referencia_t_ha).toBe(1.68);
    expect(impactoSiembra.produccion_estimada_tn).toBeCloseTo(
      (impactoSiembra.estimado_t_ha as number) * 40,
      1,
    );
    expect(impactoSiembra.variedadesConocidas).toEqual(['6410', 'MUNASQA', 'MUNASQA Y 6410']);
    expect(impactoSiembra.factores).toHaveLength(3);

    const impactoPost = await sistema.estimacion.analizarImpacto({
      lote: 'L02',
      campana: 'L02-2025-2026',
      tipoActividad: TipoActividad.FUMIGACION,
    });
    expect(impactoPost.efectoGlobal).toBe('NEUTRO');
    expect(impactoPost.diferencia_t_ha).toBe(0);
    expect(impactoPost.factores).toEqual([]);
    expect(impactoPost.resumen).toContain('se mantiene igual');
  });

  it('guardarRegistroCosecha valida y guarda siembra y cosecha en el repositorio', async () => {
    const limpio = armar('real', {
      filas: [
        {
          parcelaId: 'P-REAL',
          campanaId: 'C-REAL-2026',
          temporada: '2025-2026',
          variedad: null,
          fechaSiembra: null,
          haSembradas: 45,
          haCosechadas: null,
          toneladas: null,
        },
      ],
      campanas: [
        {
          temporada: '2025-2026',
          inicio: new Date('2025-10-01T00:00:00.000Z'),
          rendimientoTotal: null,
        },
      ],
    });

    const guardado = await limpio.estimacion.guardarRegistroCosecha('C-REAL-2026', {
      haSembradas: 45,
      variedad: 'MUNASQA',
      fechaSiembra: '2025-11-20',
    });
    expect(guardado.haSembradas).toBe(45);
    expect(guardado.variedad).toBe('MUNASQA');
    expect(guardado.origen).toBe('real');

    await expect(
      limpio.estimacion.guardarRegistroCosecha('C-REAL-2026', {
        haCosechadas: 50,
        toneladas: 100,
        fechaCosecha: '2026-03-10',
      }),
    ).rejects.toThrow('superar a las hectáreas sembradas');

    const cosechado = await limpio.estimacion.guardarRegistroCosecha('C-REAL-2026', {
      haCosechadas: 45,
      toneladas: 90,
      fechaCosecha: '2026-03-10',
    });
    expect(cosechado.haCosechadas).toBe(45);
    expect(cosechado.toneladas).toBe(90);
  });

  it('prepararParcelaDev delega al repositorio en desarrollo y se bloquea en produccion', async () => {
    const prep = await sistema.estimacion.prepararParcelaDev('L02');
    expect(prep.parcelaId).toBe('L02');
    expect(prep.campanasHabilitadas).toBe(6);

    await expect(sistema.estimacion.prepararParcelaDev('NO-EXISTE')).rejects.toThrow(
      'Parcela no encontrada',
    );

    const envOriginal = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      await expect(sistema.estimacion.prepararParcelaDev('L02')).rejects.toThrow(
        'producción',
      );
    } finally {
      process.env.NODE_ENV = envOriginal;
    }
  });
});
