/**
 * Regla de activacion automatica de un modelo recien entrenado.
 * Se activa solo si se cumplen TODAS:
 *   a) RF-32: al menos 3 campañas del cultivo.
 *   b) Supera a la linea base oficial en el resultado global del walk-forward
 *      (intervalo que excluye 0) y no es peor (intervalo que excluye 0) en la
 *      ultima campaña.
 * Un modelo entrenado con datos de demostracion nunca se activa.
 */
import type {
  EstadoModelo,
  OrigenDatos,
  ResultadoWalkForward,
} from '../modelo-rendimiento';

export const MINIMO_CAMPANAS_RF32 = 3;

export interface DecisionActivacion {
  estado: Exclude<EstadoModelo, 'archivado'>;
  motivos: string[];
}

export function decidirActivacion(entrada: {
  origenDatos: OrigenDatos;
  campanasDelCultivo: number;
  walkForward: ResultadoWalkForward;
}): DecisionActivacion {
  const { origenDatos, campanasDelCultivo, walkForward } = entrada;
  const motivos: string[] = [];

  if (origenDatos === 'demo_enmascarado') {
    motivos.push(
      'Entrenado con datos de demostración (enmascarados): nunca se activa.',
    );
  }
  if (campanasDelCultivo < MINIMO_CAMPANAS_RF32) {
    motivos.push(
      `RF-32: hay ${campanasDelCultivo} campañas del cultivo; se necesitan al menos ${MINIMO_CAMPANAS_RF32}.`,
    );
  }
  if (!walkForward.global) {
    motivos.push('No hay cortes con línea base oficial contra la cual comparar.');
  } else if (walkForward.global.conclusion !== 'supera') {
    motivos.push(
      'No supera a la línea base oficial en el resultado global con un intervalo que excluya 0.',
    );
  }
  const ultimo = walkForward.cortes.at(-1);
  if (!ultimo) {
    motivos.push('No hay cortes de validación.');
  } else if (ultimo.conclusion === 'peor') {
    motivos.push(
      `Es peor que la línea base oficial en la última campaña (${ultimo.campana}) con un intervalo que excluye 0.`,
    );
  } else if (ultimo.conclusion === 'sin_linea_base') {
    motivos.push(
      `La última campaña (${ultimo.campana}) no tiene línea base oficial para comparar.`,
    );
  }

  if (motivos.length > 0) return { estado: 'experimental', motivos };
  return {
    estado: 'activo',
    motivos: [
      'Cumple RF-32 y supera a la línea base oficial con evidencia (intervalo que excluye 0).',
    ],
  };
}
