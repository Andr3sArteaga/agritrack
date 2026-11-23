"use client";

import { Minus, TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";
import type { EfectoImpacto, ResultadoImpacto } from "@/lib/prediccion";
import { Advertencia } from "./advertencia";
import { EtiquetaDemo } from "./datos-demo";

const ESTILO_IMPACTO: Record<
  EfectoImpacto,
  {
    icono: LucideIcon;
    caja: string;
    chip: string;
    claseIcono: string;
    titulo: string;
    chipTexto: string;
    punteado: boolean;
  }
> = {
  POSITIVO: {
    icono: TrendingUp,
    caja: "border-bien-borde bg-bien-fondo text-bien-texto",
    chip: "border-bien-borde bg-white text-bien-texto",
    claseIcono: "text-bien-icono",
    titulo: "Impacto positivo: la producción estimada aumenta",
    chipTexto: "Aumenta",
    punteado: false,
  },
  NEUTRO: {
    icono: Minus,
    caja: "border-sindatos-borde bg-sindatos-fondo text-sindatos-texto",
    chip: "border-sindatos-borde bg-white text-sindatos-texto",
    claseIcono: "text-sindatos-icono",
    titulo: "Impacto neutro: la producción estimada se mantiene igual",
    chipTexto: "Se mantiene igual",
    punteado: true,
  },
  NEGATIVO: {
    icono: TrendingDown,
    caja: "border-atencion-borde bg-atencion-fondo text-atencion-texto",
    chip: "border-atencion-borde bg-white text-atencion-texto",
    claseIcono: "text-atencion-icono",
    titulo: "Impacto negativo: la producción estimada disminuye",
    chipTexto: "Disminuye",
    punteado: false,
  },
};

function formatoDelta(delta: number | null): string {
  if (delta === null) return "—";
  const signo = delta > 0 ? "+" : "";
  return `${signo}${delta.toFixed(2)} t/ha`;
}

export function PanelImpactoPrediccion({
  impacto,
  cargando = false,
  error = null,
}: {
  impacto: ResultadoImpacto | null;
  cargando?: boolean;
  error?: string | null;
}) {
  if (error) {
    return (
      <Advertencia tipo="ATENCION" titulo="No se pudo calcular el impacto en tiempo real">
        {error}
      </Advertencia>
    );
  }

  if (!impacto) {
    return (
      <div
        aria-live="polite"
        className="rounded-control border-2 border-dashed border-sindatos-borde bg-sindatos-fondo p-3 text-sm text-sindatos-texto"
      >
        {cargando ? "Calculando impacto en el modelo..." : "Completa los datos para ver el impacto."}
      </div>
    );
  }

  const estilo = ESTILO_IMPACTO[impacto.efectoGlobal];
  const IconoGlobal = estilo.icono;
  const etiquetaRef =
    impacto.fuenteReferencia === "linea_base"
      ? "Línea base histórica"
      : impacto.fuenteReferencia === "mediana_modelo"
        ? "Mediana del modelo"
        : "Sin referencia";

  return (
    <section
      aria-live="polite"
      aria-label="Análisis de impacto en tiempo real"
      className={`space-y-3 rounded-control border-2 border-l-[10px] p-3 sm:p-4 ${estilo.caja} ${
        estilo.punteado ? "border-dashed [border-left-style:solid]" : ""
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <IconoGlobal className={`mt-0.5 h-5 w-5 shrink-0 ${estilo.claseIcono}`} aria-hidden />
          <div>
            <p className="text-sm font-bold sm:text-base">{estilo.titulo}</p>
            <p className="mt-0.5 text-sm leading-snug">{impacto.resumen}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {cargando && (
            <span className="rounded-full border border-borde bg-white px-2 py-0.5 text-xs font-medium text-tinta-suave">
              Actualizando...
            </span>
          )}
          {impacto.version_modelo && (
            <span className="rounded-full border border-borde bg-white px-2 py-0.5 text-xs font-semibold text-tinta">
              Modelo {impacto.version_modelo}
            </span>
          )}
          {impacto.etiqueta_datos && <EtiquetaDemo texto={impacto.etiqueta_datos} />}
        </div>
      </div>

      {(impacto.estimado_t_ha !== null || impacto.referencia_t_ha !== null) && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div className="rounded-control border border-borde/80 bg-white/90 px-3 py-2 text-tinta">
            <p className="text-xs font-medium text-tinta-suave">Rendimiento estimado</p>
            <p className="text-base font-bold">
              {impacto.estimado_t_ha !== null ? `${impacto.estimado_t_ha.toFixed(2)} t/ha` : "Sin datos"}
            </p>
          </div>
          <div className="rounded-control border border-borde/80 bg-white/90 px-3 py-2 text-tinta">
            <p className="text-xs font-medium text-tinta-suave">Diferencia ({etiquetaRef})</p>
            <p className="text-base font-bold">{formatoDelta(impacto.diferencia_t_ha)}</p>
            {impacto.referencia_t_ha !== null && (
              <p className="text-xs text-tinta-suave">Ref: {impacto.referencia_t_ha.toFixed(2)} t/ha</p>
            )}
          </div>
          <div className="rounded-control border border-borde/80 bg-white/90 px-3 py-2 text-tinta">
            <p className="text-xs font-medium text-tinta-suave">Producción total estimada</p>
            <p className="text-base font-bold">
              {impacto.produccion_estimada_tn !== null
                ? `${impacto.produccion_estimada_tn.toFixed(2)} t`
                : "—"}
            </p>
          </div>
        </div>
      )}

      {impacto.factores.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide">
            Desglose por variable del modelo
          </p>
          <ul className="space-y-1.5">
            {impacto.factores.map((factor) => {
              const estFactor = ESTILO_IMPACTO[factor.efecto];
              const IconoFactor = estFactor.icono;
              return (
                <li
                  key={factor.variable}
                  className="rounded-control border border-borde/80 bg-white/90 px-3 py-2 text-sm text-tinta"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold">
                      {factor.etiqueta}:{" "}
                      <span className="font-normal text-tinta-suave">{factor.valorIngresado}</span>
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border-2 px-2 py-0.5 text-xs font-bold ${estFactor.chip} ${
                        estFactor.punteado ? "border-dashed" : ""
                      }`}
                    >
                      <IconoFactor className={`h-3.5 w-3.5 shrink-0 ${estFactor.claseIcono}`} aria-hidden />
                      {estFactor.chipTexto}
                      {factor.delta_t_ha !== 0 && ` (${formatoDelta(factor.delta_t_ha)})`}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-tinta-suave">{factor.detalle}</p>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {impacto.advertencias.length > 0 && (
        <ul className="list-disc space-y-0.5 pl-5 text-xs">
          {impacto.advertencias.map((adv) => (
            <li key={adv}>{adv}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
