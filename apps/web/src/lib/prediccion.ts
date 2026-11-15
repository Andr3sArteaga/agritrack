/** Estimacion de rendimiento: linea base (oficial) y modelo (experimental). */
import { useEffect, useState } from "react";
import { api } from "./api";
import { useAuth } from "./auth-context";

export interface Estimacion {
  /** null = sin datos. */
  valor_t_ha: number | null;
  fuente: "linea_base" | "modelo";
  estado: "oficial" | "experimental";
  version_modelo: string | null;
  campañas_usadas: number;
  advertencias: string[];
}

export interface EstimacionRespuesta {
  oficial: Estimacion;
  experimental: Estimacion | null;
  referencia_linea_base: Estimacion | null;
  origen_datos: "demo_enmascarado" | "real";
  etiqueta_datos: string | null;
}

export const ETIQUETA_DEMO = "Datos iniciales (V1)";

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
