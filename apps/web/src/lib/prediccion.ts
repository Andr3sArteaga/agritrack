/** Estimacion de rendimiento: linea base (oficial) y modelo (experimental). */
import { useEffect, useState } from "react";
import { api } from "./api";
import { useAuth } from "./auth-context";

export interface MetricasDesempenoResumen {
  maeModelo: number;
  maeLineaBase: number;
  diferenciaMae: number;
  icDiferenciaMae: [number, number];
  rmseModelo: number;
  rmseLineaBase: number;
  r2Modelo: number | null;
  superaLineaBase: boolean;
  conclusion: "supera" | "no_concluyente" | "peor";
  filasEvaluadas: number;
  cortesEvaluados: number;
}

export interface Estimacion {
  /** null = sin datos. */
  valor_t_ha: number | null;
  fuente: "linea_base" | "modelo";
  estado: "oficial" | "experimental";
  version_modelo: string | null;
  campañas_usadas: number;
  advertencias: string[];
  metricas_evaluacion?: MetricasDesempenoResumen | null;
}

export interface EstimacionRespuesta {
  oficial: Estimacion;
  experimental: Estimacion | null;
  referencia_linea_base: Estimacion | null;
  origen_datos: "demo_enmascarado" | "real";
  etiqueta_datos: string | null;
}

export const ETIQUETA_DEMO = "Datos iniciales (V1)";

export interface RegistroCosechaCampana {
  id: string;
  campanaId: string;
  variedad: string | null;
  fechaSiembra: string | null;
  haSembradas: number;
  fechaCosecha: string | null;
  haCosechadas: number | null;
  toneladas: number | null;
  origen: "demo_enmascarado" | "real";
  updatedAt: string;
}

export type EfectoImpacto = "POSITIVO" | "NEUTRO" | "NEGATIVO";

export interface FactorImpacto {
  variable: "fecha_siembra" | "variedad" | "ha_sembradas";
  etiqueta: string;
  valorIngresado: string;
  efecto: EfectoImpacto;
  delta_t_ha: number;
  detalle: string;
}

export interface EscenarioSiembraImpacto {
  haSembradas: number;
  fechaSiembra: string;
  variedad: string;
  estimado_t_ha: number;
  diferencia_t_ha: number;
}

export interface EscenariosImpacto {
  positivo: EscenarioSiembraImpacto | null;
  neutro: EscenarioSiembraImpacto | null;
  negativo: EscenarioSiembraImpacto | null;
}

export interface ResultadoImpacto {
  efectoGlobal: EfectoImpacto;
  resumen: string;
  estimado_t_ha: number | null;
  referencia_t_ha: number | null;
  diferencia_t_ha: number | null;
  produccion_estimada_tn: number | null;
  fuenteReferencia: "linea_base" | "mediana_modelo" | "sin_referencia";
  version_modelo: string | null;
  origen_datos: "demo_enmascarado" | "real";
  etiqueta_datos: string | null;
  variedadesConocidas: string[];
  advertencias: string[];
  factores: FactorImpacto[];
  escenarios?: EscenariosImpacto;
}

/** Ids de las parcelas de demostracion. Si no se puede saber, se asume que no hay. */
export async function cargarIdsDemo(): Promise<Set<string>> {
  try {
    const { data } = await api.get<{ parcelaIds: string[] }>("/prediccion/datos-demo");
    return new Set(data.parcelaIds);
  } catch {
    return new Set();
  }
}

/** null = todavia cargando. */
export function useIdsDemo(): Set<string> | null {
  const sesion = useAuth().usuario;
  const [ids, setIds] = useState<Set<string> | null>(null);
  useEffect(() => {
    if (!sesion) return;
    let cancelado = false;
    cargarIdsDemo().then((resultado) => !cancelado && setIds(resultado));
    return () => {
      cancelado = true;
    };
  }, [sesion]);
  return ids;
}
