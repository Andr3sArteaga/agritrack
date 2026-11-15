import type { Codificador } from '../modelo-rendimiento';
import {
  calcularImpactoPrediccion,
  clasificarEfecto,
  resolverVariedadCanonica,
} from './impacto-prediccion';

const dia = (texto: string): Date => new Date(`${texto}T00:00:00.000Z`);

const CODIFICADOR: Codificador = {
  columnas: ['ha_sembradas', 'dias_siembra', 'variedad=6410', 'variedad=MUNASQA'],
  categoriasVariedad: ['6410', 'MUNASQA'],
  medianaDiasSiembra: 60, // 30 de noviembre desde el 1 de octubre
  usaLag: false,
};

// Modelo determinista de prueba:
// Base 1.50; premiar fechas cercanas o tempranas (<= 60 dias: +0.30, > 80 dias: -0.40);
// variedad 6410 (+0.20), MUNASQA (-0.20); superficie > 30 ha (+0.10).
const predecirMock = (X: number[][]): number[] =>
  X.map(([ha, dias, es6410, esMunasqa]) => {
    let valor = 1.5;
    if (dias < 55) valor += 0.35;
    else if (dias > 80) valor -= 0.4;
    if (es6410 === 1) valor += 0.2;
    if (esMunasqa === 1) valor -= 0.2;
    if (ha > 30) valor += 0.1;
    return valor;
  });

describe('Analisis de impacto en el modelo predictivo', () => {
  it('clasifica deltas segun el umbral de 0.01 t/ha', () => {
    expect(clasificarEfecto(0.01)).toBe('POSITIVO');
    expect(clasificarEfecto(0.25)).toBe('POSITIVO');
    expect(clasificarEfecto(-0.01)).toBe('NEGATIVO');
    expect(clasificarEfecto(-0.3)).toBe('NEGATIVO');
    expect(clasificarEfecto(0.005)).toBe('NEUTRO');
    expect(clasificarEfecto(0)).toBe('NEUTRO');
  });

  it('resuelve variedades sin distinguir mayusculas ni espacios', () => {
    expect(resolverVariedadCanonica(' munasqa ', ['6410', 'MUNASQA'])).toBe('MUNASQA');
    expect(resolverVariedadCanonica('OTRA', ['6410', 'MUNASQA'])).toBe('OTRA');
    expect(resolverVariedadCanonica('   ', ['6410'])).toBeNull();
  });

  it('reporta impacto positivo cuando las variables aumentan el rendimiento respecto a la linea base', () => {
    const resultado = calcularImpactoPrediccion({
      tipoActividad: 'SIEMBRA',
      haSembradas: 25,
      fechaSiembra: dia('2026-11-10'), // 40 dias -> +0.35
      variedad: '6410', // +0.20
      inicioCampana: dia('2026-10-01'),
      lineaBase_t_ha: 1.68,
      origenDatos: 'demo_enmascarado',
      etiquetaDatos: 'Datos iniciales (V1)',
      versionModelo: 'v1',
      codificador: CODIFICADOR,
      predecir: predecirMock,
      haReferencia: 25,
    });

    expect(resultado.efectoGlobal).toBe('POSITIVO');
    expect(resultado.estimado_t_ha).toBe(2.05);
    expect(resultado.referencia_t_ha).toBe(1.68);
    expect(resultado.diferencia_t_ha).toBe(0.37);
    expect(resultado.produccion_estimada_tn).toBe(51.25);
    expect(resultado.resumen).toContain('aumenta');
    expect(resultado.factores.find((f) => f.variable === 'fecha_siembra')?.efecto).toBe(
      'POSITIVO',
    );
    expect(resultado.factores.find((f) => f.variable === 'variedad')?.efecto).toBe(
      'POSITIVO',
    );
  });

  it('reporta impacto negativo cuando las variables disminuyen la estimacion', () => {
    const resultado = calcularImpactoPrediccion({
      tipoActividad: 'SIEMBRA',
      haSembradas: 25,
      fechaSiembra: dia('2027-01-10'), // 101 dias -> -0.40
      variedad: 'MUNASQA', // -0.20
      inicioCampana: dia('2026-10-01'),
      lineaBase_t_ha: 1.68,
      origenDatos: 'real',
      etiquetaDatos: null,
      versionModelo: 'v2',
      codificador: CODIFICADOR,
      predecir: predecirMock,
      haReferencia: 25,
    });

    expect(resultado.efectoGlobal).toBe('NEGATIVO');
    expect(resultado.estimado_t_ha).toBe(0.9);
    expect(resultado.diferencia_t_ha).toBe(-0.78);
    expect(resultado.resumen).toContain('disminuye');
    expect(resultado.factores.find((f) => f.variable === 'fecha_siembra')?.efecto).toBe(
      'NEGATIVO',
    );
    expect(resultado.factores.find((f) => f.variable === 'variedad')?.efecto).toBe(
      'NEGATIVO',
    );
  });

  it('reporta impacto neutro cuando el resultado se mantiene igual o en labores post-siembra', () => {
    const neutroSiembra = calcularImpactoPrediccion({
      haSembradas: 25,
      fechaSiembra: dia('2026-11-30'), // 60 dias (mediana)
      variedad: null,
      inicioCampana: dia('2026-10-01'),
      lineaBase_t_ha: 1.5,
      origenDatos: 'real',
      etiquetaDatos: null,
      versionModelo: 'v1',
      codificador: CODIFICADOR,
      predecir: predecirMock,
    });
    expect(neutroSiembra.efectoGlobal).toBe('NEUTRO');
    expect(neutroSiembra.resumen).toContain('se mantiene igual');

    const postSiembra = calcularImpactoPrediccion({
      tipoActividad: 'FUMIGACION',
      haSembradas: 25,
      fechaSiembra: dia('2026-11-10'),
      variedad: '6410',
      inicioCampana: dia('2026-10-01'),
      lineaBase_t_ha: 1.68,
      origenDatos: 'real',
      etiquetaDatos: null,
      versionModelo: 'v1',
      codificador: CODIFICADOR,
      predecir: predecirMock,
    });
    expect(postSiembra.efectoGlobal).toBe('NEUTRO');
    expect(postSiembra.diferencia_t_ha).toBe(0);
    expect(postSiembra.factores).toEqual([]);
    expect(postSiembra.resumen).toContain('se mantiene igual');
  });

  it('usa la mediana del modelo como referencia cuando no hay linea base previa', () => {
    const resultado = calcularImpactoPrediccion({
      haSembradas: 40,
      fechaSiembra: dia('2026-11-10'),
      variedad: '6410',
      inicioCampana: dia('2026-10-01'),
      lineaBase_t_ha: null,
      origenDatos: 'real',
      etiquetaDatos: null,
      versionModelo: 'v1',
      codificador: CODIFICADOR,
      predecir: predecirMock,
      haReferencia: 25,
    });

    expect(resultado.fuenteReferencia).toBe('mediana_modelo');
    expect(resultado.referencia_t_ha).toBe(1.5);
    expect(resultado.advertencias.join(' ')).toContain('mediana histórica del modelo');
    expect(resultado.factores.find((f) => f.variable === 'ha_sembradas')?.efecto).toBe(
      'POSITIVO',
    );
  });

  it('reporta neutro sin fecha ni variedad aunque exista una linea base distinta y sugiere escenarios dev', () => {
    const neutroSinDetalle = calcularImpactoPrediccion({
      tipoActividad: 'SIEMBRA',
      haSembradas: 25,
      fechaSiembra: null,
      variedad: null,
      inicioCampana: dia('2025-10-01'),
      lineaBase_t_ha: 1.68,
      origenDatos: 'real',
      etiquetaDatos: null,
      versionModelo: 'v1',
      codificador: CODIFICADOR,
      predecir: predecirMock,
      haReferencia: 25,
    });

    expect(neutroSinDetalle.efectoGlobal).toBe('NEUTRO');
    expect(neutroSinDetalle.diferencia_t_ha).toBe(0);
    expect(neutroSinDetalle.referencia_t_ha).toBe(neutroSinDetalle.estimado_t_ha);
    expect(neutroSinDetalle.resumen).toContain('se mantiene igual');

    const escenarios = neutroSinDetalle.escenarios;
    expect(escenarios?.positivo).not.toBeNull();
    expect(escenarios?.neutro).not.toBeNull();
    expect(escenarios?.negativo).not.toBeNull();
    expect(escenarios?.positivo?.variedad).toBe('6410');
    expect(escenarios?.negativo?.variedad).toBe('MUNASQA');
  });
});
