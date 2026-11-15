"use client";

import {
  ArrowLeft,
  Equal,
  FlaskConical,
  History,
  SlidersHorizontal,
  Sprout,
  TrendingDown,
  TrendingUp,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { api, apiErrorMessage } from "@/lib/api";
import type {
  EfectoImpacto,
  Estimacion,
  EstimacionRespuesta,
  ResultadoImpacto,
} from "@/lib/prediccion";
import { Advertencia } from "./advertencia";
import { EtiquetaDemo } from "./datos-demo";
import { EstadoBadge } from "./estado-badge";

interface EstiloEscenario {
  icono: LucideIcon;
  caja: string;
  pildora: string;
  claseIcono: string;
  etiquetaBadge: string;
  tituloCorto: string;
  barra: string;
  punteado: boolean;
}

const ESTILO_ESCENARIO: Record<EfectoImpacto, EstiloEscenario> = {
  POSITIVO: {
    icono: TrendingUp,
    caja: "border-bien-borde bg-bien-fondo text-bien-texto",
    pildora: "border-bien-borde bg-white text-bien-texto",
    claseIcono: "text-bien-icono",
    etiquetaBadge: "+ Producción estimada que la referencia histórica (Escenario positivo)",
    tituloCorto: "Aumenta respecto a la referencia",
    barra: "bg-bien-borde",
    punteado: false,
  },
  NEUTRO: {
    icono: Equal,
    caja: "border-sindatos-borde bg-sindatos-fondo text-sindatos-texto",
    pildora: "border-sindatos-borde bg-white text-sindatos-texto",
    claseIcono: "text-sindatos-icono",
    etiquetaBadge: "= Producción estimada igual que la referencia histórica (Escenario neutro)",
    tituloCorto: "Se mantiene igual que la referencia",
    barra: "bg-sindatos-borde",
    punteado: true,
  },
  NEGATIVO: {
    icono: TrendingDown,
    caja: "border-atencion-borde bg-atencion-fondo text-atencion-texto",
    pildora: "border-atencion-borde bg-white text-atencion-texto",
    claseIcono: "text-atencion-icono",
    etiquetaBadge: "− Producción estimada menor que la referencia histórica (Escenario negativo)",
    tituloCorto: "Disminuye respecto a la referencia",
    barra: "bg-atencion-borde",
    punteado: false,
  },
};

const CHIP_FACTOR: Record<
  EfectoImpacto,
  { icono: LucideIcon; clase: string; iconoClase: string; texto: string; punteado: boolean }
> = {
  POSITIVO: {
    icono: TrendingUp,
    clase: "border-bien-borde bg-bien-fondo text-bien-texto",
    iconoClase: "text-bien-icono",
    texto: "Aumenta",
    punteado: false,
  },
  NEUTRO: {
    icono: Equal,
    clase: "border-sindatos-borde bg-sindatos-fondo text-sindatos-texto",
    iconoClase: "text-sindatos-icono",
    texto: "Se mantiene",
    punteado: true,
  },
  NEGATIVO: {
    icono: TrendingDown,
    clase: "border-atencion-borde bg-atencion-fondo text-atencion-texto",
    iconoClase: "text-atencion-icono",
    texto: "Disminuye",
    punteado: false,
  },
};

function formatoDelta(delta: number | null): string {
  if (delta === null) return "—";
  const signo = delta > 0 ? "+" : "";
  return `${signo}${delta.toFixed(2)} t/ha`;
}

function BarraComparativa({
  etiqueta,
  valor,
  maximo,
  claseBarra,
  destacado = false,
}: {
  etiqueta: string;
  valor: number | null;
  maximo: number;
  claseBarra: string;
  destacado?: boolean;
}) {
  const porcentaje =
    valor !== null && maximo > 0 ? Math.min(100, Math.max(6, (valor / maximo) * 100)) : 0;

  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className={destacado ? "font-bold text-stone-900" : "font-medium text-stone-700"}>
          {etiqueta}
        </span>
        <span className="font-bold text-stone-900">
          {valor !== null ? `${valor.toFixed(2)} t/ha` : "Sin datos"}
        </span>
      </div>
      <div className="h-3.5 w-full overflow-hidden rounded-full border border-stone-300 bg-stone-100">
        {valor !== null && (
          <div
            className={`h-full rounded-full transition-all duration-300 ${claseBarra}`}
            style={{ width: `${porcentaje}%` }}
          />
        )}
      </div>
    </div>
  );
}

/**
 * Panel visual del Tab 2 (Estimacion de Rendimiento): combina el resultado oficial
 * o experimental del modelo con el analisis de impacto de las variables cargadas en el Tab 1.
 */
export function EstimacionComponente({
  parcelaId,
  campanaId,
  temporada,
  cultivoNombre,
  hectareasParcela,
  versionRecarga = 0,
  onEditarVariablesSiembra,
  onIrATabRegistro,
}: {
  parcelaId: string;
  campanaId: string;
  temporada: string;
  cultivoNombre?: string | null;
  hectareasParcela?: number | null;
  versionRecarga?: number;
  onEditarVariablesSiembra?: () => void;
  onIrATabRegistro?: () => void;
}) {
  const [datos, setDatos] = useState<EstimacionRespuesta | null>(null);
  const [impacto, setImpacto] = useState<ResultadoImpacto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    Promise.all([
      api.get<EstimacionRespuesta>("/prediccion/estimacion", {
        params: { lote: parcelaId, campana: campanaId },
      }),
      api
        .get<ResultadoImpacto>("/prediccion/impacto", {
          params: { lote: parcelaId, campana: campanaId },
        })
        .then((res) => res.data)
        .catch(() => null),
    ])
      .then(([resEstimacion, resImpacto]) => {
        if (cancelado) return;
        setDatos(resEstimacion.data);
        setImpacto(resImpacto);
        setError(null);
      })
      .catch((err) => {
        if (cancelado) return;
        setError(apiErrorMessage(err, "No se pudo cargar la estimación"));
      });
    return () => {
      cancelado = true;
    };
  }, [parcelaId, campanaId, versionRecarga]);

  if (error) {
    return (
      <Advertencia tipo="ATENCION" titulo="No pudimos cargar la estimación" rol="alert">
        {error}
      </Advertencia>
    );
  }
  if (!datos) return <p className="text-base text-stone-600">Cargando estimación de rendimiento...</p>;

  const { oficial, experimental, referencia_linea_base: referencia } = datos;
  const bloqueModelo: Estimacion | null =
    experimental ?? (oficial.fuente === "modelo" ? oficial : null);
  const bloqueLineaBase: Estimacion | null =
    oficial.fuente === "linea_base" ? oficial : referencia;

  const estimadoPrincipal =
    impacto?.estimado_t_ha ?? bloqueModelo?.valor_t_ha ?? oficial.valor_t_ha;
  const referenciaPrincipal =
    impacto?.referencia_t_ha ?? bloqueLineaBase?.valor_t_ha ?? null;
  const diferenciaPrincipal =
    impacto?.diferencia_t_ha ??
    (estimadoPrincipal !== null && referenciaPrincipal !== null
      ? Math.round((estimadoPrincipal - referenciaPrincipal) * 100) / 100
      : null);

  const efectoMostrado: EfectoImpacto =
    impacto?.efectoGlobal ??
    (diferenciaPrincipal === null
      ? "NEUTRO"
      : diferenciaPrincipal >= 0.01
        ? "POSITIVO"
        : diferenciaPrincipal <= -0.01
          ? "NEGATIVO"
          : "NEUTRO");

  const estilo = ESTILO_ESCENARIO[efectoMostrado];
  const IconoEscenario = estilo.icono;

  const produccionTotalTn =
    impacto?.produccion_estimada_tn ??
    (estimadoPrincipal !== null && hectareasParcela
      ? Math.round(estimadoPrincipal * hectareasParcela * 100) / 100
      : null);

  const porcentajeDiferencia =
    diferenciaPrincipal !== null && referenciaPrincipal !== null && referenciaPrincipal > 0
      ? Math.round((diferenciaPrincipal / referenciaPrincipal) * 1000) / 10
      : null;

  const maximoBarra = Math.max(estimadoPrincipal ?? 0, referenciaPrincipal ?? 0, 1) * 1.15;

  const advertenciasUnicas = Array.from(
    new Set([
      ...(oficial.advertencias ?? []),
      ...(experimental?.advertencias ?? []),
      ...(impacto?.advertencias ?? []),
    ]),
  );

  const esModeloOficial = bloqueModelo?.estado === "oficial";
  const esModeloExperimental = bloqueModelo?.estado === "experimental";

  return (
    <div className="space-y-5">
      {/* Cabecera contextual y acciones rápidas */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-base text-stone-700">
          <span className="font-bold text-stone-900">
            Campaña {temporada}
            {cultivoNombre ? ` · ${cultivoNombre}` : ""}
          </span>
          {datos.etiqueta_datos && <EtiquetaDemo texto={datos.etiqueta_datos} />}
        </div>

        <div className="flex flex-wrap gap-2">
          {onIrATabRegistro && (
            <button
              type="button"
              onClick={onIrATabRegistro}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-md border-2 border-stone-300 bg-white px-3.5 text-sm font-bold text-stone-800 hover:bg-stone-50"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
              Volver a Registro (Tab 1)
            </button>
          )}
          {onEditarVariablesSiembra && (
            <button
              type="button"
              onClick={onEditarVariablesSiembra}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-md border-2 border-emerald-800 bg-emerald-700 px-4 text-sm font-bold text-white hover:bg-emerald-800"
            >
              <SlidersHorizontal className="h-4 w-4 shrink-0" aria-hidden />
              Ajustar variables de siembra
            </button>
          )}
        </div>
      </div>

      {/* Hero Banner de Impacto en la Campaña */}
      <section
        aria-label="Indicador de impacto en la campaña"
        className={`rounded-xl border-2 border-l-[12px] p-5 ${estilo.caja} ${
          estilo.punteado ? "border-dashed [border-left-style:solid]" : ""
        }`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1 text-sm font-bold ${
              estilo.pildora
            } ${estilo.punteado ? "border-dashed" : ""}`}
          >
            <Zap className={`h-4 w-4 shrink-0 ${estilo.claseIcono}`} aria-hidden />
            {estilo.etiquetaBadge}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <IconoEscenario className={`h-8 w-8 shrink-0 ${estilo.claseIcono}`} aria-hidden />
          <div>
            <p className="text-2xl font-extrabold tracking-tight">
              {diferenciaPrincipal !== null
                ? `${formatoDelta(diferenciaPrincipal)}${
                    porcentajeDiferencia !== null
                      ? ` (${porcentajeDiferencia > 0 ? "+" : ""}${porcentajeDiferencia}%)`
                      : ""
                  }`
                : estilo.tituloCorto}
            </p>
            <p className="mt-1 text-sm font-medium leading-relaxed">
              {impacto?.resumen ??
                "El resultado compara la estimación generada con los datos ingresados en el Tab 1 frente a la referencia histórica."}
            </p>
          </div>
        </div>
      </section>

      {/* Tarjetas principales de lectura rápida */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <article className="rounded-xl border-2 border-stone-300 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-base font-bold text-stone-900">
              <Sprout className="h-5 w-5 shrink-0 text-emerald-700" aria-hidden />
              Rendimiento estimado actual
            </p>
            {esModeloOficial ? (
              <span className="rounded-full border border-emerald-700 bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-900">
                Modelo IA Activo {bloqueModelo?.version_modelo ?? ""}
              </span>
            ) : esModeloExperimental ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-pend-borde bg-pend-fondo px-2.5 py-0.5 text-xs font-bold text-pend-texto">
                <FlaskConical className="h-3.5 w-3.5" aria-hidden />
                Experimental {bloqueModelo?.version_modelo ?? ""}
              </span>
            ) : (
              <span className="rounded-full border border-stone-300 bg-stone-100 px-2.5 py-0.5 text-xs font-bold text-stone-700">
                Solo línea base
              </span>
            )}
          </div>

          <div className="mt-4">
            {estimadoPrincipal !== null ? (
              <p className="text-4xl font-extrabold tracking-tight text-stone-900">
                {estimadoPrincipal.toFixed(2)}{" "}
                <span className="text-xl font-bold text-stone-600">t/ha</span>
              </p>
            ) : (
              <div className="py-1">
                <EstadoBadge estado="SIN_DATOS" tamano="lg" />
              </div>
            )}
          </div>

          <div className="mt-4 rounded-lg border border-stone-200 bg-stone-50 px-3.5 py-2.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-600">
              Producción total proyectada en el lote
            </p>
            <p className="mt-0.5 text-lg font-bold text-stone-900">
              {produccionTotalTn !== null
                ? `${produccionTotalTn.toFixed(2)} toneladas totales`
                : "Completa la superficie sembrada en Tab 1"}
            </p>
          </div>

          <p className="mt-3 text-xs text-stone-600">
            {bloqueModelo
              ? `Calculado con modelo Random Forest (${bloqueModelo.campañas_usadas} campañas históricas de entrenamiento).`
              : `Basado en ${oficial.campañas_usadas} campañas históricas cerradas.`}
          </p>
        </article>

        <article className="flex flex-col justify-between rounded-xl border-2 border-stone-300 bg-white p-5">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-2 text-base font-bold text-stone-900">
                <History className="h-5 w-5 shrink-0 text-stone-600" aria-hidden />
                Comparación vs. Referencia Histórica
              </p>
              <span className="text-xs font-semibold text-stone-600">
                {impacto?.fuenteReferencia === "mediana_modelo"
                  ? "Mediana histórica"
                  : "Línea base oficial"}
              </span>
            </div>

            <div className="mt-4 space-y-4">
              <BarraComparativa
                etiqueta="Estimación de esta campaña (Tab 1)"
                valor={estimadoPrincipal}
                maximo={maximoBarra}
                claseBarra={estilo.barra}
                destacado
              />
              <BarraComparativa
                etiqueta="Referencia histórica (temporadas previas)"
                valor={referenciaPrincipal}
                maximo={maximoBarra}
                claseBarra="bg-stone-500"
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-stone-200 pt-3 text-sm">
            <span className="text-stone-600">
              Campañas de referencia:{" "}
              <strong className="text-stone-900">
                {bloqueLineaBase?.campañas_usadas ?? oficial.campañas_usadas}
              </strong>
            </span>
            <span className="font-bold text-stone-900">
              Diferencia: {formatoDelta(diferenciaPrincipal)}
            </span>
          </div>
        </article>
      </div>

      {/* Desglose por variable ingresada en Tab 1 */}
      <section
        aria-label="Impacto de las variables ingresadas en el Tab 1"
        className="rounded-xl border border-stone-200 bg-white p-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-stone-900">
              ¿Cómo influyen las variables del Tab 1 en este resultado?
            </h3>
            <p className="text-sm text-stone-600">
              Efecto individual de cada variable de siembra ingresada frente al comportamiento
              histórico del cultivo.
            </p>
          </div>
        </div>

        {impacto && impacto.factores.length > 0 ? (
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            {impacto.factores.map((factor) => {
              const chip = CHIP_FACTOR[factor.efecto];
              const IconoChip = chip.icono;
              return (
                <div
                  key={factor.variable}
                  className="flex flex-col justify-between rounded-lg border border-stone-200 bg-stone-50/70 p-3.5"
                >
                  <div>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="text-sm font-bold text-stone-900">{factor.etiqueta}</p>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border-2 px-2 py-0.5 text-xs font-bold ${
                          chip.clase
                        } ${chip.punteado ? "border-dashed" : ""}`}
                      >
                        <IconoChip className={`h-3.5 w-3.5 shrink-0 ${chip.iconoClase}`} aria-hidden />
                        {chip.texto}
                        {factor.delta_t_ha !== 0 && ` (${formatoDelta(factor.delta_t_ha)})`}
                      </span>
                    </div>
                    <p className="mt-1.5 text-base font-bold text-emerald-950">
                      {factor.valorIngresado}
                    </p>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-stone-700">{factor.detalle}</p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-4 rounded-lg border-2 border-dashed border-sindatos-borde bg-sindatos-fondo p-4 text-sm text-sindatos-texto">
            <p className="font-bold">Faltan variables de siembra o modelo entrenado para desglosar el impacto.</p>
            <p className="mt-1">
              Ingresa superficie sembrada, fecha de siembra y variedad en el Tab 1 (o usa el botón
              superior &quot;Ajustar variables de siembra&quot;) para ver cómo cambia el resultado.
            </p>
          </div>
        )}
      </section>

      {/* Notas y advertencias del modelo */}
      {advertenciasUnicas.length > 0 && (
        <section
          aria-label="Notas técnicas de la estimación"
          className="rounded-lg border border-stone-200 bg-stone-50 p-4"
        >
          <p className="text-xs font-bold uppercase tracking-wide text-stone-700">
            Notas y consideraciones del cálculo
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-stone-700">
            {advertenciasUnicas.map((texto) => (
              <li key={texto}>{texto}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
