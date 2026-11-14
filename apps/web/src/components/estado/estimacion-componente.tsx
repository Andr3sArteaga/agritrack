"use client";

import { FlaskConical, Sprout } from "lucide-react";
import { useEffect, useState } from "react";
import { api, apiErrorMessage } from "@/lib/api";
import type { Estimacion, EstimacionRespuesta } from "@/lib/prediccion";
import { Advertencia } from "./advertencia";
import { EtiquetaDemo } from "./datos-demo";
import { EstadoBadge } from "./estado-badge";

function Valor({ estimacion }: { estimacion: Estimacion }) {
  return estimacion.valor_t_ha === null ? (
    <EstadoBadge estado="SIN_DATOS" />
  ) : (
    <span className="text-2xl font-bold text-stone-900">{estimacion.valor_t_ha} t/ha</span>
  );
}

const NOMBRE_FUENTE: Record<Estimacion["fuente"], string> = {
  linea_base: "Línea base: promedio de las campañas anteriores del cultivo",
  modelo: "Modelo",
};

function Advertencias({ lista }: { lista: string[] }) {
  if (lista.length === 0) return null;
  return (
    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-stone-700">
      {lista.map((texto) => (
        <li key={texto}>{texto}</li>
      ))}
    </ul>
  );
}

/**
 * Estimacion de rendimiento de un lote en una campaña (solo panel interno).
 * Arriba la estimacion oficial; debajo, la del modelo con la etiqueta "Experimental".
 */
export function EstimacionComponente({
  parcelaId,
  campanaId,
  temporada,
}: {
  parcelaId: string;
  campanaId: string;
  temporada: string;
}) {
  const [datos, setDatos] = useState<EstimacionRespuesta | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    api
      .get<EstimacionRespuesta>("/prediccion/estimacion", {
        params: { lote: parcelaId, campana: campanaId },
      })
      .then((res) => !cancelado && setDatos(res.data))
      .catch((err) => !cancelado && setError(apiErrorMessage(err, "No se pudo cargar la estimación")));
    return () => {
      cancelado = true;
    };
  }, [parcelaId, campanaId]);

  if (error) {
    return (
      <Advertencia tipo="ATENCION" titulo="No pudimos cargar la estimación" rol="alert">
        {error}
      </Advertencia>
    );
  }
  if (!datos) return <p className="text-base text-stone-600">Cargando estimación...</p>;

  const { oficial, experimental, referencia_linea_base: referencia } = datos;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-base text-stone-700">
        <span>Campaña {temporada}</span>
        {datos.etiqueta_datos && <EtiquetaDemo texto={datos.etiqueta_datos} />}
      </div>

      <div className="rounded-lg border-2 border-stone-300 bg-white p-4">
        <p className="flex items-center gap-2 text-base font-bold text-stone-900">
          <Sprout className="h-5 w-5 shrink-0 text-emerald-700" aria-hidden />
          Estimación oficial
        </p>
        <div className="mt-2">
          <Valor estimacion={oficial} />
        </div>
        <p className="mt-1 text-sm text-stone-700">
          {NOMBRE_FUENTE[oficial.fuente]}
          {oficial.version_modelo ? ` ${oficial.version_modelo}` : ""} · {oficial.campañas_usadas}{" "}
          campañas usadas
        </p>
        <Advertencias lista={oficial.advertencias} />
      </div>

      {experimental && (
        <div className="rounded-lg border-2 border-dotted border-pend-borde bg-pend-fondo p-4">
          <p className="flex flex-wrap items-center gap-2 text-base font-bold text-pend-texto">
            <FlaskConical className="h-5 w-5 shrink-0 text-pend-icono" aria-hidden />
            Estimación del modelo
            <span className="rounded-full border-2 border-pend-borde bg-white px-2 py-0.5 text-sm">
              Experimental
            </span>
            <span className="text-sm font-normal">Versión {experimental.version_modelo}</span>
          </p>
          <div className="mt-2">
            <Valor estimacion={experimental} />
          </div>
          <p className="mt-1 text-sm text-stone-800">
            No es la estimación oficial. Entrenado con {experimental.campañas_usadas} campañas.
          </p>
          <Advertencias lista={experimental.advertencias} />
        </div>
      )}

      {referencia && (
        <p className="text-sm text-stone-700">
          Referencia (línea base):{" "}
          {referencia.valor_t_ha === null ? "sin datos" : `${referencia.valor_t_ha} t/ha`}
        </p>
      )}
    </div>
  );
}
