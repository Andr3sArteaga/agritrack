"use client";

import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Equal,
  FlaskConical,
  History,
  Info,
  SlidersHorizontal,
  Sparkles,
  Sprout,
  TrendingDown,
  TrendingUp,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { EvaluacionRegistroParcela } from "@/app/panel/parcelas/[id]/estado-registro-parcela";
import { api, apiErrorMessage } from "@/lib/api";
import { formatearFechaHora } from "@/lib/format";
import type {
  EfectoImpacto,
  Estimacion,
  EstimacionRespuesta,
  ResultadoImpacto,
} from "@/lib/prediccion";
import { Advertencia } from "./advertencia";
import { EtiquetaDemo } from "./datos-demo";
import { EstadoBadge } from "./estado-badge";

export interface PuntoHistoricoRendimiento {
  campanaId: string;
  temporada: string;
  fecha: string;
  rendimientoTnHa: number;
  produccionTn: number | null;
  cultivoNombre: string;
}

interface EstiloEscenario {
  icono: LucideIcon;
  caja: string;
  pildora: string;
  claseIcono: string;
  etiquetaBadge: string;
  tituloCorto: string;
  punteado: boolean;
}

const ESTILO_ESCENARIO: Record<EfectoImpacto, EstiloEscenario> = {
  POSITIVO: {
    icono: TrendingUp,
    caja: "border-[#006B4F]/40 bg-[#E8F5EF] text-[#17211D]",
    pildora: "border-[#006B4F]/40 bg-white text-[#006B4F]",
    claseIcono: "text-[#006B4F]",
    etiquetaBadge: "+ Producción estimada mayor que la referencia (Escenario positivo)",
    tituloCorto: "Aumenta respecto a la referencia",
    punteado: false,
  },
  NEUTRO: {
    icono: Equal,
    caja: "border-stone-400 bg-stone-100 text-[#17211D]",
    pildora: "border-stone-400 bg-white text-stone-700",
    claseIcono: "text-stone-600",
    etiquetaBadge: "= Producción estimada similar a la referencia (Escenario neutro)",
    tituloCorto: "Se mantiene igual que la referencia",
    punteado: true,
  },
  NEGATIVO: {
    icono: TrendingDown,
    caja: "border-amber-600/50 bg-amber-50 text-[#17211D]",
    pildora: "border-amber-600/50 bg-white text-amber-900",
    claseIcono: "text-amber-700",
    etiquetaBadge: "− Producción estimada menor que la referencia (Escenario negativo)",
    tituloCorto: "Disminuye respecto a la referencia",
    punteado: false,
  },
};

const CHIP_FACTOR: Record<
  EfectoImpacto,
  {
    icono: LucideIcon;
    clase: string;
    iconoClase: string;
    barra: string;
    texto: string;
    punteado: boolean;
  }
> = {
  POSITIVO: {
    icono: TrendingUp,
    clase: "border-[#006B4F]/40 bg-[#E8F5EF] text-[#006B4F]",
    iconoClase: "text-[#006B4F]",
    barra: "bg-[#006B4F]",
    texto: "Aumenta",
    punteado: false,
  },
  NEUTRO: {
    icono: Equal,
    clase: "border-stone-400 bg-stone-100 text-stone-700",
    iconoClase: "text-stone-600",
    barra: "bg-stone-400",
    texto: "Neutro",
    punteado: true,
  },
  NEGATIVO: {
    icono: TrendingDown,
    clase: "border-amber-600/50 bg-amber-50 text-amber-900",
    iconoClase: "text-amber-700",
    barra: "bg-amber-600",
    texto: "Disminuye",
    punteado: false,
  },
};

function formatoDelta(delta: number | null): string {
  if (delta === null) return "—";
  const signo = delta > 0 ? "+" : "";
  return `${signo}${delta.toFixed(2)} t/ha`;
}

function formatoPorcentaje(valor: number | null, base: number | null): string {
  if (valor === null || base === null || base <= 0) return "—";
  const pct = Math.round(((valor - base) / base) * 1000) / 10;
  const signo = pct > 0 ? "+" : "";
  return `${signo}${pct}%`;
}

interface BarraGraficoHistorico {
  etiqueta: string;
  valor: number;
  tipo: "real" | "estimacion";
  detalle: string;
}

/**
 * Tab 2 (`Rendimiento estimado`): resultado del modelo Random Forest, factores influyentes
 * con barras visuales, evolución histórica diferenciando cosecha real vs. estimación,
 * comparación de campañas y explicación estructurada.
 */
export function EstimacionComponente({
  parcelaId,
  campanaId,
  temporada,
  cultivoNombre,
  hectareasParcela,
  campanasHistoricas = [],
  evaluacionRegistro,
  versionRecarga = 0,
  onEditarVariablesSiembra,
  onIrATabRegistro,
}: {
  parcelaId: string;
  campanaId: string;
  temporada: string;
  cultivoNombre?: string | null;
  hectareasParcela?: number | null;
  campanasHistoricas?: PuntoHistoricoRendimiento[];
  evaluacionRegistro?: EvaluacionRegistroParcela | null;
  versionRecarga?: number;
  onEditarVariablesSiembra?: () => void;
  onIrATabRegistro?: () => void;
}) {
  const [datos, setDatos] = useState<EstimacionRespuesta | null>(null);
  const [impacto, setImpacto] = useState<ResultadoImpacto | null>(null);
  const [fechaConsultaIso, setFechaConsultaIso] = useState<string>("");
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
        setFechaConsultaIso(new Date().toISOString());
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

  const historicoOrdenado = useMemo(() => {
    const porCampana = new Map<string, PuntoHistoricoRendimiento>();
    for (const item of campanasHistoricas) {
      porCampana.set(item.campanaId, item);
    }
    return Array.from(porCampana.values()).sort((a, b) => a.fecha.localeCompare(b.fecha));
  }, [campanasHistoricas]);

  if (error) {
    return (
      <Advertencia tipo="ATENCION" titulo="No pudimos cargar la estimación" rol="alert">
        {error}
      </Advertencia>
    );
  }
  if (!datos) {
    return (
      <div className="rounded-xl border border-[#E4EAE6] bg-white p-6 text-sm text-[#68736D]">
        Calculando estimación de rendimiento...
      </div>
    );
  }

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

  const esModeloOficial = bloqueModelo?.estado === "oficial";
  const esModeloExperimental = bloqueModelo?.estado === "experimental";

  const advertenciasUnicas = Array.from(
    new Set([
      ...(oficial.advertencias ?? []),
      ...(experimental?.advertencias ?? []),
      ...(impacto?.advertencias ?? []),
    ]),
  );

  // Datos para el gráfico de evolución histórica (cosechas reales vs estimación actual)
  const historicoPrevio = historicoOrdenado.filter((h) => h.campanaId !== campanaId);
  const ultimaCampanaReal =
    historicoPrevio.length > 0 ? historicoPrevio[historicoPrevio.length - 1] : null;

  const puntosGrafico: BarraGraficoHistorico[] = [
    ...historicoPrevio.map((h) => ({
      etiqueta: h.temporada,
      valor: h.rendimientoTnHa,
      tipo: "real" as const,
      detalle: "Cosecha real registrada",
    })),
    ...(estimadoPrincipal !== null
      ? [
          {
            etiqueta: `${temporada} (Est.)`,
            valor: estimadoPrincipal,
            tipo: "estimacion" as const,
            detalle: bloqueModelo
              ? `Estimación predictiva (${bloqueModelo.version_modelo ?? "RF"})`
              : "Estimación línea base",
          },
        ]
      : []),
  ];

  // Magnitud máxima de delta entre factores para escalar las barras horizontales reales
  const factores = impacto?.factores ?? [];
  const maxAbsDelta = Math.max(
    0.1,
    ...factores.map((f) => Math.abs(f.delta_t_ha)),
  );

  const factoresPositivos = factores.filter((f) => f.efecto === "POSITIVO");
  const factoresNegativos = factores.filter((f) => f.efecto === "NEGATIVO");
  const porcentajeVsRef = formatoPorcentaje(estimadoPrincipal, referenciaPrincipal);

  // Recomendaciones accionables basadas en estado real del registro y modelo
  const mejorasFuturas: string[] = [];
  if (evaluacionRegistro) {
    const manejoDim = evaluacionRegistro.dimensiones.find((d) => d.id === "manejo");
    if (manejoDim && manejoDim.faltantes.length > 0) {
      mejorasFuturas.push(
        `Completar variables de manejo pre-siembra faltantes: ${manejoDim.faltantes.join(", ")}.`,
      );
    }
    if (evaluacionRegistro.sueloConDato < 6) {
      mejorasFuturas.push(
        `Completar el perfil de suelo (${evaluacionRegistro.sueloConDato}/6 indicadores) para documentar fertilidad y acidez junto a la campaña.`,
      );
    }
    if (evaluacionRegistro.clima30d.length === 0) {
      mejorasFuturas.push(
        "Registrar mediciones climáticas recientes para documentar precipitaciones y eventos extremos.",
      );
    }
  }
  if (!esModeloOficial) {
    mejorasFuturas.push(
      "Cerrar y registrar el rendimiento real de al menos 3 campañas del cultivo para validar el modelo Random Forest como oficial (RF-32).",
    );
  }
  if (mejorasFuturas.length === 0) {
    mejorasFuturas.push(
      "Al finalizar la campaña, registra la cosecha real para alimentar la variable histórica (lag1) de futuras temporadas.",
    );
  }

  return (
    <div className="space-y-6">
      {/* Aviso sutil si faltan datos en el Tab Registro */}
      {evaluacionRegistro && evaluacionRegistro.totalFaltantes > 0 && onIrATabRegistro && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-400/70 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 shrink-0 text-amber-700" aria-hidden />
            <span>
              Faltan datos por completar en la pestaña <strong>Registro</strong> (
              {evaluacionRegistro.completadas}/5 categorías completas).
            </span>
          </div>
          <button
            type="button"
            onClick={onIrATabRegistro}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-amber-700/40 bg-white px-3 text-xs font-bold text-amber-950 hover:bg-amber-100"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Completar en Registro
          </button>
        </div>
      )}

      {/* A. RESULTADO PRINCIPAL */}
      <section
        aria-labelledby="res-principal-heading"
        className="rounded-xl border border-[#E4EAE6] bg-white p-5 sm:p-6"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[#006B4F]">
              Resultado del modelo predictivo
            </p>
            <h2 id="res-principal-heading" className="mt-0.5 text-xl font-bold text-[#17211D]">
              Estimación de rendimiento · Campaña {temporada}
              {cultivoNombre ? ` (${cultivoNombre})` : ""}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {datos.etiqueta_datos && <EtiquetaDemo texto={datos.etiqueta_datos} />}
            {esModeloOficial ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-[#006B4F]/40 bg-[#E8F5EF] px-3 py-1 text-xs font-bold text-[#006B4F]">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                Modelo Oficial {bloqueModelo?.version_modelo ?? ""}
              </span>
            ) : esModeloExperimental ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-indigo-300 bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-900">
                <FlaskConical className="h-3.5 w-3.5" aria-hidden />
                Modelo Experimental {bloqueModelo?.version_modelo ?? ""}
              </span>
            ) : (
              <span className="rounded-full border border-[#E4EAE6] bg-[#F8FAF9] px-3 py-1 text-xs font-bold text-[#68736D]">
                Línea base histórica
              </span>
            )}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Métrica hero t/ha y t totales */}
          <div className="rounded-xl border border-[#E4EAE6] bg-[#F8FAF9] p-5">
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[#68736D]">
              <Sprout className="h-4 w-4 text-[#006B4F]" aria-hidden />
              Rendimiento estimado
            </p>
            <div className="mt-2">
              {estimadoPrincipal !== null ? (
                <p className="text-4xl font-extrabold tracking-tight text-[#17211D]">
                  {estimadoPrincipal.toFixed(2)}{" "}
                  <span className="text-lg font-bold text-[#68736D]">t/ha</span>
                </p>
              ) : (
                <div className="py-1">
                  <EstadoBadge estado="SIN_DATOS" tamano="lg" />
                </div>
              )}
            </div>
            <div className="mt-4 border-t border-[#E4EAE6] pt-3">
              <p className="text-xs font-semibold text-[#68736D]">Producción total estimada</p>
              <p className="mt-0.5 text-lg font-bold text-[#006B4F]">
                {produccionTotalTn !== null
                  ? `${produccionTotalTn.toFixed(2)} toneladas`
                  : "Pendiente superficie sembrada"}
              </p>
            </div>
          </div>

          {/* Escenario de impacto */}
          <div
            className={`flex flex-col justify-between rounded-xl border p-5 ${estilo.caja} ${
              estilo.punteado ? "border-dashed" : ""
            }`}
          >
            <div>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${estilo.pildora}`}
              >
                <Zap className={`h-3.5 w-3.5 shrink-0 ${estilo.claseIcono}`} aria-hidden />
                {estilo.etiquetaBadge}
              </span>
              <div className="mt-3 flex items-center gap-2.5">
                <IconoEscenario className={`h-7 w-7 shrink-0 ${estilo.claseIcono}`} aria-hidden />
                <div>
                  <p className="text-2xl font-extrabold text-[#17211D]">
                    {diferenciaPrincipal !== null
                      ? `${formatoDelta(diferenciaPrincipal)} (${porcentajeVsRef})`
                      : estilo.tituloCorto}
                  </p>
                </div>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-[#17211D]/85">
                {impacto?.resumen ??
                  "Comparación frente a la referencia histórica registrada para el cultivo en el sistema."}
              </p>
            </div>

            {onEditarVariablesSiembra && (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={onEditarVariablesSiembra}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-[#006B4F] px-3.5 text-xs font-semibold text-white hover:bg-[#00553E]"
                >
                  <SlidersHorizontal className="h-4 w-4" aria-hidden />
                  Simular o ajustar variables de siembra
                </button>
              </div>
            )}
          </div>

          {/* Metadatos del cálculo */}
          <div className="flex flex-col justify-between rounded-xl border border-[#E4EAE6] bg-white p-5 text-sm">
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2 border-b border-[#E4EAE6] pb-2">
                <span className="text-[#68736D]">Campaña evaluada</span>
                <span className="text-right font-semibold text-[#17211D]">
                  {temporada}
                  {cultivoNombre ? ` · ${cultivoNombre}` : ""}
                </span>
              </div>
              <div className="flex items-start justify-between gap-2 border-b border-[#E4EAE6] pb-2">
                <span className="text-[#68736D]">Fecha de estimación</span>
                <span className="inline-flex items-center gap-1 text-right font-semibold text-[#17211D]">
                  <CalendarClock className="h-3.5 w-3.5 text-[#006B4F]" aria-hidden />
                  {fechaConsultaIso ? formatearFechaHora(fechaConsultaIso) : "Actual"}
                </span>
              </div>
              <div className="flex items-start justify-between gap-2 border-b border-[#E4EAE6] pb-2">
                <span className="text-[#68736D]">Base de entrenamiento</span>
                <span className="text-right font-semibold text-[#17211D]">
                  {bloqueModelo
                    ? `${bloqueModelo.campañas_usadas} campañas históricas`
                    : `${oficial.campañas_usadas} campañas`}
                </span>
              </div>
              <div className="flex items-start justify-between gap-2">
                <span className="text-[#68736D]">Referencia comparativa</span>
                <span className="text-right font-semibold text-[#17211D]">
                  {referenciaPrincipal !== null ? `${referenciaPrincipal.toFixed(2)} t/ha` : "Sin datos"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* B. FACTORES DE INFLUENCIA CON BARRAS VISUALES */}
      <section
        aria-labelledby="factores-heading"
        className="rounded-xl border border-[#E4EAE6] bg-white p-5 sm:p-6"
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 id="factores-heading" className="text-lg font-bold text-[#17211D]">
              ¿Qué factores influyeron en esta estimación?
            </h3>
            <p className="mt-0.5 text-sm text-[#68736D]">
              Efecto individual calculado por el modelo Random Forest al variar cada predictor de
              manejo respecto a su valor de referencia.
            </p>
          </div>
        </div>

        {factores.length > 0 ? (
          <div className="mt-4 space-y-3">
            {factores.map((factor) => {
              const chip = CHIP_FACTOR[factor.efecto];
              const IconoChip = chip.icono;
              const anchoBarra =
                factor.delta_t_ha === 0
                  ? 8
                  : Math.min(100, Math.max(14, (Math.abs(factor.delta_t_ha) / maxAbsDelta) * 100));
              return (
                <div
                  key={factor.variable}
                  className="rounded-xl border border-[#E4EAE6] bg-[#F8FAF9] p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-[#17211D]">{factor.etiqueta}</span>
                      <span className="rounded-md border border-[#E4EAE6] bg-white px-2 py-0.5 text-xs font-semibold text-[#006B4F]">
                        {factor.valorIngresado}
                      </span>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold ${
                        chip.clase
                      } ${chip.punteado ? "border-dashed" : ""}`}
                    >
                      <IconoChip className={`h-3.5 w-3.5 ${chip.iconoClase}`} aria-hidden />
                      {chip.texto} ({formatoDelta(factor.delta_t_ha)})
                    </span>
                  </div>

                  {/* Barra proporcional del delta real */}
                  <div className="mt-2.5 h-2.5 w-full overflow-hidden rounded-full bg-white ring-1 ring-[#E4EAE6]">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${chip.barra}`}
                      style={{ width: `${anchoBarra}%` }}
                    />
                  </div>

                  <p className="mt-2 text-xs leading-relaxed text-[#68736D]">{factor.detalle}</p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-dashed border-stone-300 bg-[#F8FAF9] p-4 text-sm text-[#68736D]">
            Registra superficie sembrada, fecha de siembra y variedad en la pestaña{" "}
            <strong>Registro</strong> para cuantificar el aporte de cada variable en la estimación.
          </div>
        )}

        {/* Contexto agronómico real complementario (sin alterar el modelo pre-siembra) */}
        {evaluacionRegistro && (
          <div className="mt-4 grid grid-cols-1 gap-3 border-t border-[#E4EAE6] pt-4 sm:grid-cols-2">
            <div className="rounded-xl border border-[#E4EAE6] bg-white p-3.5 text-xs">
              <p className="font-bold text-[#17211D]">
                Contexto de suelo ({evaluacionRegistro.sueloConDato}/6 indicadores cargados)
              </p>
              <p className="mt-1 text-[#68736D]">
                Registro agronómico complementario de campo; el modelo Random Forest pre-siembra
                no incorpora aún variables químicas de suelo en el cálculo numérico.
              </p>
            </div>
            <div className="rounded-xl border border-[#E4EAE6] bg-white p-3.5 text-xs">
              <p className="font-bold text-[#17211D]">
                Contexto climático ({evaluacionRegistro.clima30d.length} registros en 30d ·{" "}
                {evaluacionRegistro.lluvia30dMm} mm lluvia)
              </p>
              <p className="mt-1 text-[#68736D]">
                Monitoreo ambiental de seguimiento en campo; sirve para contrastar riesgos climáticos
                (helada/granizo/déficit hídrico) frente a la estimación estadística.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* C y D: EVOLUCIÓN HISTÓRICA + COMPARACIÓN DE CAMPAÑAS */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* C. EVOLUCIÓN HISTÓRICA */}
        <section
          aria-labelledby="evolucion-heading"
          className="rounded-xl border border-[#E4EAE6] bg-white p-5 sm:p-6 lg:col-span-7"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3
                id="evolucion-heading"
                className="flex items-center gap-2 text-lg font-bold text-[#17211D]"
              >
                <History className="h-5 w-5 text-[#006B4F]" aria-hidden />
                Evolución histórica del rendimiento
              </h3>
              <p className="mt-0.5 text-xs text-[#68736D]">
                Se distinguen las cosechas reales registradas (verde sólido) frente a la estimación
                actual de la campaña (ámbar).
              </p>
            </div>
          </div>

          {puntosGrafico.length > 0 ? (
            <>
              <div className="mt-4 flex flex-wrap items-center gap-4 text-xs font-medium text-[#68736D]">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-sm bg-[#006B4F]" aria-hidden />
                  Cosecha real registrada
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-sm border border-dashed border-amber-700 bg-amber-500" aria-hidden />
                  Estimación predictiva actual
                </span>
                {referenciaPrincipal !== null && (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-0.5 w-4 border-t-2 border-dashed border-stone-500" aria-hidden />
                    Ref. histórica ({referenciaPrincipal.toFixed(2)} t/ha)
                  </span>
                )}
              </div>

              <div className="mt-3 h-64 w-full">
                <ResponsiveContainer width="100%" height="100%" minHeight={240}>
                  <BarChart
                    data={puntosGrafico}
                    margin={{ top: 12, right: 16, left: 0, bottom: 16 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E4EAE6" vertical={false} />
                    <XAxis
                      dataKey="etiqueta"
                      tick={{ fontSize: 12, fill: "#17211D" }}
                      interval={0}
                      angle={puntosGrafico.length > 4 ? -15 : 0}
                      textAnchor={puntosGrafico.length > 4 ? "end" : "middle"}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: "#68736D" }}
                      unit=" t/ha"
                      width={68}
                    />
                    <Tooltip
                      formatter={(value) => [`${Number(value).toFixed(2)} t/ha`, "Rendimiento"]}
                      contentStyle={{
                        borderRadius: "10px",
                        border: "1px solid #E4EAE6",
                        fontSize: "12px",
                      }}
                    />
                    <Legend wrapperStyle={{ display: "none" }} />
                    {referenciaPrincipal !== null && (
                      <ReferenceLine
                        y={referenciaPrincipal}
                        stroke="#68736D"
                        strokeDasharray="4 4"
                      />
                    )}
                    <Bar dataKey="valor" radius={[6, 6, 0, 0]} maxBarSize={52}>
                      {puntosGrafico.map((entry) => (
                        <Cell
                          key={entry.etiqueta}
                          fill={entry.tipo === "estimacion" ? "#D97706" : "#006B4F"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-stone-300 bg-[#F8FAF9] p-6 text-center text-sm text-[#68736D]">
              Todavía no hay cosechas reales previas ni estimación disponible para graficar la serie
              histórica.
            </div>
          )}
        </section>

        {/* D. COMPARACIÓN DE CAMPAÑAS */}
        <section
          aria-labelledby="comparacion-heading"
          className="flex flex-col justify-between rounded-xl border border-[#E4EAE6] bg-white p-5 sm:p-6 lg:col-span-5"
        >
          <div>
            <h3 id="comparacion-heading" className="text-lg font-bold text-[#17211D]">
              Comparación de campañas
            </h3>
            <p className="mt-0.5 text-xs text-[#68736D]">
              Contraste en t/ha y variación porcentual respecto a la estimación actual.
            </p>

            <div className="mt-4 space-y-2.5">
              {/* Fila 1: Campaña actual estimada */}
              <div className="rounded-xl border border-[#006B4F]/40 bg-[#E8F5EF] p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-wide text-[#006B4F]">
                    Campaña actual ({temporada})
                  </span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-[#006B4F]">
                    Estimación
                  </span>
                </div>
                <p className="mt-1 text-xl font-extrabold text-[#17211D]">
                  {estimadoPrincipal !== null ? `${estimadoPrincipal.toFixed(2)} t/ha` : "Sin datos"}
                  {produccionTotalTn !== null ? (
                    <span className="ml-2 text-xs font-semibold text-[#68736D]">
                      ({produccionTotalTn.toFixed(1)} t)
                    </span>
                  ) : null}
                </p>
              </div>

              {/* Fila 2: Última campaña cosechada */}
              <div className="rounded-xl border border-[#E4EAE6] bg-[#F8FAF9] p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-[#68736D]">
                    {ultimaCampanaReal
                      ? `Última cosecha (${ultimaCampanaReal.temporada})`
                      : "Última campaña cosechada"}
                  </span>
                  {ultimaCampanaReal && estimadoPrincipal !== null && (
                    <span className="text-xs font-bold text-[#17211D]">
                      {formatoDelta(
                        Math.round((estimadoPrincipal - ultimaCampanaReal.rendimientoTnHa) * 100) /
                          100,
                      )}{" "}
                      ({formatoPorcentaje(estimadoPrincipal, ultimaCampanaReal.rendimientoTnHa)})
                    </span>
                  )}
                </div>
                <p className="mt-1 text-base font-bold text-[#17211D]">
                  {ultimaCampanaReal
                    ? `${ultimaCampanaReal.rendimientoTnHa.toFixed(2)} t/ha`
                    : "Sin cosecha previa en esta parcela"}
                </p>
              </div>

              {/* Fila 3: Promedio / referencia histórica */}
              <div className="rounded-xl border border-[#E4EAE6] bg-[#F8FAF9] p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-[#68736D]">
                    {impacto?.fuenteReferencia === "mediana_modelo"
                      ? "Mediana histórica del modelo"
                      : "Promedio / línea base histórica"}
                  </span>
                  {referenciaPrincipal !== null && estimadoPrincipal !== null && (
                    <span className="text-xs font-bold text-[#17211D]">
                      {formatoDelta(diferenciaPrincipal)} ({porcentajeVsRef})
                    </span>
                  )}
                </div>
                <p className="mt-1 text-base font-bold text-[#17211D]">
                  {referenciaPrincipal !== null
                    ? `${referenciaPrincipal.toFixed(2)} t/ha`
                    : "Sin referencia disponible"}
                </p>
              </div>
            </div>
          </div>

          {historicoPrevio.length > 0 && (
            <div className="mt-4 border-t border-[#E4EAE6] pt-3">
              <p className="text-xs font-bold uppercase tracking-wide text-[#68736D]">
                Historial reciente de la parcela
              </p>
              <ul className="mt-2 space-y-1.5 text-xs">
                {historicoPrevio
                  .slice(-3)
                  .reverse()
                  .map((h) => (
                    <li
                      key={h.campanaId}
                      className="flex items-center justify-between gap-2 text-[#17211D]"
                    >
                      <span className="text-[#68736D]">
                        {h.temporada} · {h.cultivoNombre}
                      </span>
                      <span className="font-bold">
                        {h.rendimientoTnHa.toFixed(2)} t/ha
                        {estimadoPrincipal !== null && (
                          <span className="ml-1.5 font-normal text-[#68736D]">
                            (vs actual: {formatoPorcentaje(estimadoPrincipal, h.rendimientoTnHa)})
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </section>
      </div>

      {/* E. EXPLICACIÓN ESTRUCTURADA DEL RESULTADO */}
      <section
        aria-labelledby="explicacion-heading"
        className="rounded-xl border border-[#E4EAE6] bg-white p-5 sm:p-6"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-[#006B4F]" aria-hidden />
          <h3 id="explicacion-heading" className="text-lg font-bold text-[#17211D]">
            Explicación del resultado
          </h3>
        </div>
        <p className="mt-1 text-sm text-[#68736D]">
          Lectura interpretativa basada únicamente en las asociaciones estadísticas del modelo y en
          los registros reales cargados en la parcela.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-[#E4EAE6] bg-[#F8FAF9] p-4">
            <h4 className="flex items-center gap-1.5 text-sm font-bold text-[#17211D]">
              <ClipboardCheck className="h-4 w-4 text-[#006B4F]" aria-hidden />
              Variables asociadas al cálculo
            </h4>
            <ul className="mt-2 space-y-1.5 text-xs text-[#68736D]">
              {factores.length > 0 ? (
                factores.map((f) => (
                  <li key={f.variable}>
                    <strong className="text-[#17211D]">{f.etiqueta}:</strong> {f.valorIngresado}
                  </li>
                ))
              ) : (
                <li>
                  No se evaluaron predictores específicos porque faltan variables de siembra en la
                  campaña o historial suficiente del cultivo.
                </li>
              )}
              <li>
                <strong className="text-[#17211D]">Referencia histórica del lote/cultivo:</strong>{" "}
                {bloqueModelo
                  ? `${bloqueModelo.campañas_usadas} campañas usadas en el entrenamiento`
                  : `${oficial.campañas_usadas} campañas históricas cerradas`}
              </li>
            </ul>
          </div>

          <div className="rounded-xl border border-[#E4EAE6] bg-[#F8FAF9] p-4">
            <h4 className="flex items-center gap-1.5 text-sm font-bold text-[#006B4F]">
              <TrendingUp className="h-4 w-4" aria-hidden />
              Condiciones asociadas a mayor rendimiento
            </h4>
            {factoresPositivos.length > 0 ? (
              <ul className="mt-2 space-y-1.5 text-xs text-[#17211D]">
                {factoresPositivos.map((f) => (
                  <li key={f.variable}>
                    <strong>{f.etiqueta}</strong> ({formatoDelta(f.delta_t_ha)}): {f.detalle}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-[#68736D]">
                Con los datos ingresados actualmente no se identificaron variables con aporte
                positivo adicional sobre la referencia.
              </p>
            )}
          </div>

          <div className="rounded-xl border border-[#E4EAE6] bg-[#F8FAF9] p-4">
            <h4 className="flex items-center gap-1.5 text-sm font-bold text-amber-900">
              <TrendingDown className="h-4 w-4 text-amber-700" aria-hidden />
              Condiciones asociadas a menor rendimiento
            </h4>
            {factoresNegativos.length > 0 ? (
              <ul className="mt-2 space-y-1.5 text-xs text-[#17211D]">
                {factoresNegativos.map((f) => (
                  <li key={f.variable}>
                    <strong>{f.etiqueta}</strong> ({formatoDelta(f.delta_t_ha)}): {f.detalle}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-[#68736D]">
                No se detectaron factores de siembra que reduzcan la estimación respecto al escenario
                base.
              </p>
            )}
          </div>

          <div className="rounded-xl border border-[#E4EAE6] bg-[#F8FAF9] p-4">
            <h4 className="text-sm font-bold text-[#17211D]">
              Cómo mejorar futuras estimaciones
            </h4>
            <ul className="mt-2 list-disc space-y-1.5 pl-4 text-xs text-[#68736D]">
              {mejorasFuturas.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
        </div>

        {advertenciasUnicas.length > 0 && (
          <div className="mt-4 rounded-xl border border-[#E4EAE6] bg-white p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-[#68736D]">
              Notas técnicas del modelo
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-[#68736D]">
              {advertenciasUnicas.map((texto) => (
                <li key={texto}>{texto}</li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
