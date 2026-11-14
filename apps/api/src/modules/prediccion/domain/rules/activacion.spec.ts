import type {
  ConclusionCorte,
  MetricaCorte,
  ResultadoWalkForward,
} from '../modelo-rendimiento';
import { decidirActivacion } from './activacion';

function corte(campana: string, conclusion: ConclusionCorte): MetricaCorte {
  return {
    campana,
    entrenamiento: [],
    filasEntrenamiento: 10,
    filasPrueba: 10,
    filasImputadas: 0,
    maeModelo: 0.3,
    icMaeModelo: [0.2, 0.4],
    lineaBase: 1.5,
    maeLineaBase: 0.5,
    diferencia: -0.2,
    icDiferencia: [-0.3, -0.1],
    conclusion,
  };
}

function walkForward(
  global: 'supera' | 'no_concluyente' | 'peor' | null,
  ultimo: ConclusionCorte,
): ResultadoWalkForward {
  return {
    variante: 'A',
    cortes: [corte('2023-2024', 'supera'), corte('2024-2025', ultimo)],
    global: global && {
      cortes: ['2023-2024', '2024-2025'],
      filas: 20,
      lotes: 10,
      maeModelo: 0.3,
      maeLineaBase: 0.5,
      diferencia: -0.2,
      icDiferencia: [-0.3, -0.1],
      conclusion: global,
    },
  };
}

describe('Regla de activacion del modelo', () => {
  it('se activa con datos reales, 3 campañas, mejor en global y no peor en la ultima', () => {
    const decision = decidirActivacion({
      origenDatos: 'real',
      campanasDelCultivo: 3,
      walkForward: walkForward('supera', 'no_concluyente'),
    });
    expect(decision.estado).toBe('activo');
  });

  it('RF-32: con menos de 3 campañas queda experimental', () => {
    const decision = decidirActivacion({
      origenDatos: 'real',
      campanasDelCultivo: 2,
      walkForward: walkForward('supera', 'supera'),
    });
    expect(decision.estado).toBe('experimental');
    expect(decision.motivos.join(' ')).toContain('RF-32');
  });

  it.each(['no_concluyente', 'peor', null] as const)(
    'si el global es "%s" queda experimental',
    (global) => {
      const decision = decidirActivacion({
        origenDatos: 'real',
        campanasDelCultivo: 5,
        walkForward: walkForward(global, 'supera'),
      });
      expect(decision.estado).toBe('experimental');
    },
  );

  it('si es peor en la ultima campaña (intervalo excluye 0) queda experimental aunque gane en global', () => {
    const decision = decidirActivacion({
      origenDatos: 'real',
      campanasDelCultivo: 5,
      walkForward: walkForward('supera', 'peor'),
    });
    expect(decision.estado).toBe('experimental');
    expect(decision.motivos.join(' ')).toContain('última campaña');
  });

  it('BLOQUEO: un modelo entrenado con datos de demostracion nunca se activa', () => {
    const decision = decidirActivacion({
      origenDatos: 'demo_enmascarado',
      campanasDelCultivo: 5,
      walkForward: walkForward('supera', 'supera'),
    });
    expect(decision.estado).toBe('experimental');
    expect(decision.motivos.join(' ')).toContain('demostración');
  });

  it('sin cortes de validacion queda experimental', () => {
    const decision = decidirActivacion({
      origenDatos: 'real',
      campanasDelCultivo: 3,
      walkForward: { variante: 'A', cortes: [], global: null },
    });
    expect(decision.estado).toBe('experimental');
  });
});
