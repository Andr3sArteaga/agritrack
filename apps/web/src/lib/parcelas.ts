import type { Campana, Cultivo, EstadoCampana } from "./types";

/** Campana "vigente" de una parcela: la que esta en curso o, si no hay, la proxima planificada. */
export interface CampanaVigente {
  cultivo: string | null;
  estado: EstadoCampana;
}

/** La campana "actual" de una parcela: la que esta en curso o, si no hay, la proxima planificada. */
export function elegirCampanaActual(campanas: Campana[]): Campana | undefined {
  return (
    campanas.find((c) => c.estado === "EN_CURSO") ??
    campanas
      .filter((c) => c.estado === "PLANIFICADA")
      .sort((a, b) => a.fechaInicio.localeCompare(b.fechaInicio))[0]
  );
}

export function calcularCampanaVigentePorParcela(
  campanas: Campana[],
  cultivos: Cultivo[],
): Record<string, CampanaVigente> {
  const nombreCultivo = new Map(cultivos.map((c) => [c.id, c.nombre]));
  const porParcela = new Map<string, Campana[]>();
  for (const campana of campanas) {
    const lista = porParcela.get(campana.parcelaId) ?? [];
    lista.push(campana);
    porParcela.set(campana.parcelaId, lista);
  }

  const resultado: Record<string, CampanaVigente> = {};
  for (const [parcelaId, lista] of porParcela) {
    const vigente = elegirCampanaActual(lista);
    if (vigente) {
      resultado[parcelaId] = {
        cultivo: nombreCultivo.get(vigente.cultivoId) ?? null,
        estado: vigente.estado,
      };
    }
  }
  return resultado;
}
