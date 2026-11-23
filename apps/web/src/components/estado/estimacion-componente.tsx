"use client";

import {
  ArrowLeft,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Equal,
  FlaskConical,
  History,
  Info,
  RefreshCw,
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
    caja: "border-marca/40 bg-marca-suave text-tinta",
    pildora: "border-marca/40 bg-white text-marca",
    claseIcono: "text-marca",
    etiquetaBadge: "+ Producción estimada mayor que la referencia (Escenario positivo)",
    tituloCorto: "Aumenta respecto a la referencia",
    punteado: false,
  },
  NEUTRO: {
    icono: Equal,
    caja: "border-tinta-suave bg-fondo text-tinta",
    pildora: "border-tinta-suave bg-white text-tinta-suave",
    claseIcono: "text-tinta-suave",
    etiquetaBadge: "= Producción estimada similar a la referencia (Escenario neutro)",
    tituloCorto: "Se mantiene igual que la referencia",
    punteado: true,
  },
  NEGATIVO: {
    icono: TrendingDown,
    caja: "border-atencion-borde/50 bg-atencion-fondo text-tinta",
    pildora: "border-atencion-borde/50 bg-white text-atencion-texto",
    claseIcono: "text-atencion-icono",
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
    clase: "border-marca/40 bg-marca-suave text-marca",
    iconoClase: "text-marca",
    barra: "bg-marca",
    texto: "Aumenta",
    punteado: false,
  },
  NEUTRO: {
    icono: Equal,
    clase: "border-tinta-suave bg-fondo text-tinta-suave",
    iconoClase: "text-tinta-suave",
    barra: "bg-tinta-suave",
    texto: "Neutro",
    punteado: true,
  },
  NEGATIVO: {
    icono: TrendingDown,
    clase: "border-atencion-borde/50 bg-atencion-fondo text-atencion-texto",
    iconoClase: "text-atencion-icono",
    barra: "bg-atencion-borde",
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
  cultivoId,
  cultivoNombre,
  hectareasParcela,
  campanasHistoricas = [],
  evaluacionRegistro,
  versionRecarga = 0,
  puedeEntrenar = false,
  onEditarVariablesSiembra,
  onIrATabRegistro,
}: {
  parcelaId: string;
  campanaId: string;
  temporada: string;
  cultivoId?: string | null;
  cultivoNombre?: string | null;
  hectareasParcela?: number | null;
  campanasHistoricas?: PuntoHistoricoRendimiento[];
  evaluacionRegistro?: EvaluacionRegistroParcela | null;
  versionRecarga?: number;
  puedeEntrenar?: boolean;
  onEditarVariablesSiembra?: () => void;
  onIrATabRegistro?: () => void;
}) {
  const [datos, setDatos] = useState<EstimacionRespuesta | null>(null);
  const [impacto, setImpacto] = useState<ResultadoImpacto | null>(null);
  const [fechaConsultaIso, setFechaConsultaIso] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [recargaLocal, setRecargaLocal] = useState(0);
  const [entrenandoModelo, setEntrenandoModelo] = useState(false);
  const [avisoEntrenamiento, setAvisoEntrenamiento] = useState<{
    tipo: "ok" | "error";
    texto: string;
  } | null>(null);

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
  }, [parcelaId, campanaId, versionRecarga, recargaLocal]);

  async function actualizarModeloIa() {
    if (!cultivoId || entrenandoModelo) return;
    setEntrenandoModelo(true);
    setAvisoEntrenamiento(null);
    try {
      const { data } = await api.post<{ version: string; estado: string }>(
        "/prediccion/entrenar",
        null,
        { params: { cultivo: cultivoId } },
      );
      setAvisoEntrenamiento({
        tipo: "ok",
        texto: `Modelo Random Forest actualizado (${data.version} · estado ${data.estado}).`,
      });
      setRecargaLocal((v) => v + 1);
    } catch (err) {
      setAvisoEntrenamiento({
        tipo: "error",
        texto: apiErrorMessage(err, "No se pudo entrenar el modelo con los datos actuales."),
      });
    } finally {
      setEntrenandoModelo(false);
    }
  }

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
      <div className="rounded-tarjeta border border-borde bg-white p-6 text-sm text-tinta-suave">
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
  const metricasEval = bloqueModelo?.metricas_evaluacion ?? null;
  const reduccionMaePct =
    metricasEval && metricasEval.maeLineaBase > 0
      ? Math.round(
          ((metricasEval.maeLineaBase - metricasEval.maeModelo) / metricasEval.maeLineaBase) *
            1000,
        ) / 10
      : null;

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
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-tarjeta border border-atencion-borde/70 bg-atencion-fondo px-4 py-3 text-sm text-atencion-texto">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 shrink-0 text-atencion-icono" aria-hidden />
            <span>
              Faltan datos por completar en la pestaña <strong>Registro</strong> (
              {evaluacionRegistro.completadas}/5 categorías completas).
            </span>
          </div>
          <button
            type="button"
            onClick={onIrATabRegistro}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-control border border-atencion-icono/40 bg-white px-3 text-sm font-bold text-atencion-texto hover:bg-atencion-fondo"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Completar en Registro
          </button>
        </div>
      )}

      {/* A. RESULTADO PRINCIPAL */}
      <section
        aria-labelledby="res-principal-heading"
        className="rounded-tarjeta border border-borde bg-white p-5 sm:p-6"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-marca">
              Resultado del modelo predictivo
            </p>
            <h2 id="res-principal-heading" className="mt-0.5 text-xl font-bold text-tinta">
              Estimación de rendimiento · Campaña {temporada}
              {cultivoNombre ? ` (${cultivoNombre})` : ""}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {datos.etiqueta_datos && <EtiquetaDemo texto={datos.etiqueta_datos} />}
            {esModeloOficial ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-marca/40 bg-marca-suave px-3 py-1 text-xs font-bold text-marca">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                Modelo Oficial {bloqueModelo?.version_modelo ?? ""}
              </span>
            ) : esModeloExperimental ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-indigo-300 bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-900">
                <FlaskConical className="h-3.5 w-3.5" aria-hidden />
                Modelo Experimental {bloqueModelo?.version_modelo ?? ""}
              </span>
            ) : (
              <span className="rounded-full border border-borde bg-fondo-suave px-3 py-1 text-xs font-bold text-tinta-suave">
                Línea base histórica
              </span>
            )}
            {puedeEntrenar && cultivoId && (
              <button
                type="button"
                disabled={entrenandoModelo}
                onClick={actualizarModeloIa}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-control border border-borde bg-fondo-suave px-3 text-sm font-semibold text-tinta hover:bg-marca-suave disabled:opacity-60"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 text-marca ${entrenandoModelo ? "animate-spin" : ""}`}
                  aria-hidden
                />
                {entrenandoModelo ? "Actualizando..." : "Actualizar modelo IA"}
              </button>
            )}
          </div>
        </div>

        {avisoEntrenamiento && (
          <div className="mt-4">
            {avisoEntrenamiento.tipo === "error" ? (
              <Advertencia tipo="ATENCION" titulo="No se pudo actualizar el modelo">
                {avisoEntrenamiento.texto}
              </Advertencia>
            ) : (
              <div className="flex items-start gap-2.5 rounded-control border border-marca/40 bg-marca-suave px-3.5 py-2.5 text-sm text-tinta">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-marca" aria-hidden />
                <span>{avisoEntrenamiento.texto}</span>
              </div>
            )}
          </div>
        )}

        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Métrica hero t/ha y t totales */}
          <div className="rounded-tarjeta border border-borde bg-fondo-suave p-5">
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-tinta-suave">
              <Sprout className="h-4 w-4 text-marca" aria-hidden />
              Rendimiento estimado
            </p>
            <div className="mt-2">
              {estimadoPrincipal !== null ? (
                <p className="text-4xl font-extrabold tracking-tight text-tinta">
                  {estimadoPrincipal.toFixed(2)}{" "}
                  <span className="text-lg font-bold text-tinta-suave">t/ha</span>
                </p>
              ) : (
                <div className="py-1">
                  <EstadoBadge estado="SIN_DATOS" tamano="lg" />
                </div>
              )}
            </div>
            <div className="mt-4 border-t border-borde pt-3">
              <p className="text-xs font-semibold text-tinta-suave">Producción total estimada</p>
              <p className="mt-0.5 text-lg font-bold text-marca">
                {produccionTotalTn !== null
                  ? `${produccionTotalTn.toFixed(2)} toneladas`
                  : "Pendiente superficie sembrada"}
              </p>
            </div>
          </div>

          {/* Escenario de impacto */}
          <div
            className={`flex flex-col justify-between rounded-tarjeta border p-5 ${estilo.caja} ${
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
                  <p className="text-2xl font-extrabold text-tinta">
                    {diferenciaPrincipal !== null
                      ? `${formatoDelta(diferenciaPrincipal)} (${porcentajeVsRef})`
                      : estilo.tituloCorto}
                  </p>
                </div>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-tinta/85">
                {impacto?.resumen ??
                  "Comparación frente a la referencia histórica registrada para el cultivo en el sistema."}
              </p>
            </div>

            {onEditarVariablesSiembra && (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={onEditarVariablesSiembra}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-control bg-marca px-3.5 text-sm font-semibold text-white hover:bg-marca-hover"
                >
                  <SlidersHorizontal className="h-4 w-4" aria-hidden />
                  Simular o ajustar variables de siembra
                </button>
              </div>
            )}
          </div>

          {/* Metadatos del cálculo */}
          <div className="flex flex-col justify-between rounded-tarjeta border border-borde bg-white p-5 text-sm">
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2 border-b border-borde pb-2">
                <span className="text-tinta-suave">Campaña evaluada</span>
                <span className="text-right font-semibold text-tinta">
                  {temporada}
                  {cultivoNombre ? ` · ${cultivoNombre}` : ""}
                </span>
              </div>
              <div className="flex items-start justify-between gap-2 border-b border-borde pb-2">
                <span className="text-tinta-suave">Fecha de estimación</span>
                <span className="inline-flex items-center gap-1 text-right font-semibold text-tinta">
                  <CalendarClock className="h-3.5 w-3.5 text-marca" aria-hidden />
                  {fechaConsultaIso ? formatearFechaHora(fechaConsultaIso) : "Actual"}
                </span>
              </div>
              <div className="flex items-start justify-between gap-2 border-b border-borde pb-2">
                <span className="text-tinta-suave">Base de entrenamiento</span>
                <span className="text-right font-semibold text-tinta">
                  {bloqueModelo
                    ? `${bloqueModelo.campañas_usadas} campañas históricas`
                    : `${oficial.campañas_usadas} campañas`}
                </span>
              </div>
              <div className="flex items-start justify-between gap-2">
                <span className="text-tinta-suave">Referencia comparativa</span>
                <span className="text-right font-semibold text-tinta">
                  {referenciaPrincipal !== null ? `${referenciaPrincipal.toFixed(2)} t/ha` : "Sin datos"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* METRICAS DE DESEMPENO RANDOM FOREST (MAE, RMSE Y R2) */}
      {bloqueModelo && (
        <section
          aria-labelledby="metricas-rf-heading"
          className="rounded-tarjeta border border-borde bg-white p-5 sm:p-6"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3
                id="metricas-rf-heading"
                className="flex items-center gap-2 text-lg font-bold text-tinta"
              >
                <BarChart3 className="h-5 w-5 text-marca" aria-hidden />
                Métricas de desempeño del modelo Random Forest (MAE, RMSE y R²)
              </h3>
              <p className="mt-0.5 text-sm text-tinta-suave">
                Evaluación estadística fuera de muestra frente al promedio histórico por cultivo
                (línea base) mediante validación temporal <em>walk-forward</em>.
              </p>
            </div>

            {metricasEval ? (
              metricasEval.superaLineaBase ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-marca/40 bg-marca-suave px-3 py-1 text-xs font-bold text-marca">
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                  Supera en MAE al promedio histórico
                </span>
              ) : metricasEval.maeModelo < metricasEval.maeLineaBase ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-sindatos-borde bg-fondo px-3 py-1 text-xs font-bold text-tinta">
                  <Equal className="h-3.5 w-3.5 text-tinta-suave" aria-hidden />
                  Menor MAE puntual (IC no concluyente)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-atencion-borde/50 bg-atencion-fondo px-3 py-1 text-xs font-bold text-atencion-texto">
                  <Info className="h-3.5 w-3.5 text-atencion-icono" aria-hidden />
                  No supera aún al promedio histórico en MAE
                </span>
              )
            ) : null}
          </div>

          {metricasEval ? (
            <>
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                {/* Tarjeta 1: MAE */}
                <div className="rounded-tarjeta border border-borde bg-fondo-suave p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold uppercase tracking-wide text-tinta-suave">
                      MAE · Error Absoluto Medio
                    </span>
                    <span className="rounded-control border border-borde bg-white px-2 py-0.5 text-xs font-bold text-marca">
                      Criterio principal
                    </span>
                  </div>
                  <p className="mt-2 text-2xl font-extrabold text-tinta">
                    {metricasEval.maeModelo.toFixed(3)}{" "}
                    <span className="text-sm font-semibold text-tinta-suave">t/ha</span>
                  </p>
                  <div className="mt-2 space-y-1 border-t border-borde pt-2 text-xs text-tinta-suave">
                    <p className="flex items-center justify-between gap-2">
                      <span>Promedio histórico (Línea base):</span>
                      <strong className="text-tinta">
                        {metricasEval.maeLineaBase.toFixed(3)} t/ha
                      </strong>
                    </p>
                    <p className="flex items-center justify-between gap-2">
                      <span>Diferencia (Modelo − Base):</span>
                      <strong
                        className={
                          metricasEval.diferenciaMae < 0 ? "text-marca" : "text-atencion-texto"
                        }
                      >
                        {metricasEval.diferenciaMae > 0 ? "+" : ""}
                        {metricasEval.diferenciaMae.toFixed(3)} t/ha
                        {reduccionMaePct !== null && reduccionMaePct > 0
                          ? ` (−${reduccionMaePct}%)`
                          : ""}
                      </strong>
                    </p>
                  </div>
                </div>

                {/* Tarjeta 2: RMSE */}
                <div className="rounded-tarjeta border border-borde bg-fondo-suave p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold uppercase tracking-wide text-tinta-suave">
                      RMSE · Raíz Error Cuadrático
                    </span>
                  </div>
                  <p className="mt-2 text-2xl font-extrabold text-tinta">
                    {metricasEval.rmseModelo.toFixed(3)}{" "}
                    <span className="text-sm font-semibold text-tinta-suave">t/ha</span>
                  </p>
                  <div className="mt-2 space-y-1 border-t border-borde pt-2 text-xs text-tinta-suave">
                    <p className="flex items-center justify-between gap-2">
                      <span>Promedio histórico (Línea base):</span>
                      <strong className="text-tinta">
                        {metricasEval.rmseLineaBase.toFixed(3)} t/ha
                      </strong>
                    </p>
                    <p className="text-xs leading-snug text-tinta-suave">
                      Penaliza con mayor peso las desviaciones grandes en t/ha.
                    </p>
                  </div>
                </div>

                {/* Tarjeta 3: R² */}
                <div className="rounded-tarjeta border border-borde bg-fondo-suave p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold uppercase tracking-wide text-tinta-suave">
                      R² · Coeficiente de Determinación
                    </span>
                  </div>
                  <p className="mt-2 text-2xl font-extrabold text-tinta">
                    {metricasEval.r2Modelo !== null
                      ? metricasEval.r2Modelo.toFixed(3)
                      : "Sin varianza"}
                  </p>
                  <div className="mt-2 space-y-1 border-t border-borde pt-2 text-xs text-tinta-suave">
                    {metricasEval.r2Modelo !== null ? (
                      metricasEval.r2Modelo >= 0 ? (
                        <p>
                          Varianza explicada en validación:{" "}
                          <strong className="text-marca">
                            {(metricasEval.r2Modelo * 100).toFixed(1)} %
                          </strong>
                        </p>
                      ) : (
                        <p>
                          Ajuste inferior a la media global en los cortes históricos evaluados.
                        </p>
                      )
                    ) : (
                      <p>Se requieren al menos 2 observaciones con variación para calcular R².</p>
                    )}
                    <p className="text-xs leading-snug text-tinta-suave">
                      Valores cercanos a 1.000 indican mayor capacidad explicativa.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-3 rounded-tarjeta border border-borde bg-fondo-suave px-4 py-3 text-xs text-tinta-suave">
                <strong className="text-tinta">Detalle de validación:</strong>{" "}
                validación temporal <em>walk-forward</em> sin fuga de datos en{" "}
                <strong className="text-tinta">{metricasEval.cortesEvaluados}</strong>{" "}
                {metricasEval.cortesEvaluados === 1 ? "corte" : "cortes"} (
                <strong className="text-tinta">{metricasEval.filasEvaluadas}</strong>{" "}
                {metricasEval.filasEvaluadas === 1 ? "registro de lote" : "registros de lote"}) ·
                Intervalo de confianza Bootstrap 95 % para ΔMAE:{" "}
                <strong className="text-tinta">
                  [{metricasEval.icDiferenciaMae[0].toFixed(3)},{" "}
                  {metricasEval.icDiferenciaMae[1].toFixed(3)}] t/ha
                </strong>{" "}
                (el modelo supera significativamente al promedio histórico cuando el límite superior
                es menor que 0).
              </div>
            </>
          ) : (
            <div className="mt-4 rounded-tarjeta border border-dashed border-sindatos-borde bg-fondo-suave p-4 text-sm text-tinta-suave">
              Esta versión del modelo no tiene métricas de validación actualizadas guardadas.
              {puedeEntrenar && cultivoId
                ? " Usa el botón “Actualizar modelo IA” arriba para recalcular MAE, RMSE y R²."
                : ""}
            </div>
          )}
        </section>
      )}

      {/* B. FACTORES DE INFLUENCIA CON BARRAS VISUALES */}
      <section
        aria-labelledby="factores-heading"
        className="rounded-tarjeta border border-borde bg-white p-5 sm:p-6"
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 id="factores-heading" className="text-lg font-bold text-tinta">
              ¿Qué factores influyeron en esta estimación?
            </h3>
            <p className="mt-0.5 text-sm text-tinta-suave">
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
                  className="rounded-tarjeta border border-borde bg-fondo-suave p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-tinta">{factor.etiqueta}</span>
                      <span className="rounded-control border border-borde bg-white px-2 py-0.5 text-xs font-semibold text-marca">
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
                  <div className="mt-2.5 h-2.5 w-full overflow-hidden rounded-full bg-white ring-1 ring-borde">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${chip.barra}`}
                      style={{ width: `${anchoBarra}%` }}
                    />
                  </div>

                  <p className="mt-2 text-xs leading-relaxed text-tinta-suave">{factor.detalle}</p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-4 rounded-tarjeta border border-dashed border-sindatos-borde bg-fondo-suave p-4 text-sm text-tinta-suave">
            Registra superficie sembrada, fecha de siembra y variedad en la pestaña{" "}
            <strong>Registro</strong> para cuantificar el aporte de cada variable en la estimación.
          </div>
        )}

        {/* Contexto agronómico real complementario (sin alterar el modelo pre-siembra) */}
        {evaluacionRegistro && (
          <div className="mt-4 grid grid-cols-1 gap-3 border-t border-borde pt-4 sm:grid-cols-2">
            <div className="rounded-tarjeta border border-borde bg-white p-3.5 text-xs">
              <p className="font-bold text-tinta">
                Contexto de suelo ({evaluacionRegistro.sueloConDato}/6 indicadores cargados)
              </p>
              <p className="mt-1 text-tinta-suave">
                Registro agronómico complementario de campo; el modelo Random Forest pre-siembra
                no incorpora aún variables químicas de suelo en el cálculo numérico.
              </p>
            </div>
            <div className="rounded-tarjeta border border-borde bg-white p-3.5 text-xs">
              <p className="font-bold text-tinta">
                Contexto climático ({evaluacionRegistro.clima30d.length} registros en 30d ·{" "}
                {evaluacionRegistro.lluvia30dMm} mm lluvia)
              </p>
              <p className="mt-1 text-tinta-suave">
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
          className="rounded-tarjeta border border-borde bg-white p-5 sm:p-6 lg:col-span-7"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3
                id="evolucion-heading"
                className="flex items-center gap-2 text-lg font-bold text-tinta"
              >
                <History className="h-5 w-5 text-marca" aria-hidden />
                Evolución histórica del rendimiento
              </h3>
              <p className="mt-0.5 text-xs text-tinta-suave">
                Se distinguen las cosechas reales registradas (verde sólido) frente a la estimación
                actual de la campaña (ámbar).
              </p>
            </div>
          </div>

          {puntosGrafico.length > 0 ? (
            <>
              <div className="mt-4 flex flex-wrap items-center gap-4 text-xs font-medium text-tinta-suave">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-sm bg-marca" aria-hidden />
                  Cosecha real registrada
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-sm border border-dashed border-atencion-icono bg-atencion-icono" aria-hidden />
                  Estimación predictiva actual
                </span>
                {referenciaPrincipal !== null && (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-0.5 w-4 border-t-2 border-dashed border-tinta-suave" aria-hidden />
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
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-borde)" vertical={false} />
                    <XAxis
                      dataKey="etiqueta"
                      tick={{ fontSize: 12, fill: "var(--color-tinta)" }}
                      interval={0}
                      angle={puntosGrafico.length > 4 ? -15 : 0}
                      textAnchor={puntosGrafico.length > 4 ? "end" : "middle"}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: "var(--color-tinta-suave)" }}
                      unit=" t/ha"
                      width={68}
                    />
                    <Tooltip
                      formatter={(value) => [`${Number(value).toFixed(2)} t/ha`, "Rendimiento"]}
                      contentStyle={{
                        borderRadius: "10px",
                        border: "1px solid var(--color-borde)",
                        fontSize: "12px",
                      }}
                    />
                    <Legend wrapperStyle={{ display: "none" }} />
                    {referenciaPrincipal !== null && (
                      <ReferenceLine
                        y={referenciaPrincipal}
                        stroke="var(--color-tinta-suave)"
                        strokeDasharray="4 4"
                      />
                    )}
                    <Bar dataKey="valor" radius={[6, 6, 0, 0]} maxBarSize={52}>
                      {puntosGrafico.map((entry) => (
                        <Cell
                          key={entry.etiqueta}
                          fill={entry.tipo === "estimacion" ? "var(--color-atencion-icono)" : "var(--color-marca)"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <div className="mt-4 rounded-tarjeta border border-dashed border-sindatos-borde bg-fondo-suave p-6 text-center text-sm text-tinta-suave">
              Todavía no hay cosechas reales previas ni estimación disponible para graficar la serie
              histórica.
            </div>
          )}
        </section>

        {/* D. COMPARACIÓN DE CAMPAÑAS */}
        <section
          aria-labelledby="comparacion-heading"
          className="flex flex-col justify-between rounded-tarjeta border border-borde bg-white p-5 sm:p-6 lg:col-span-5"
        >
          <div>
            <h3 id="comparacion-heading" className="text-lg font-bold text-tinta">
              Comparación de campañas
            </h3>
            <p className="mt-0.5 text-xs text-tinta-suave">
              Contraste en t/ha y variación porcentual respecto a la estimación actual.
            </p>

            <div className="mt-4 space-y-2.5">
              {/* Fila 1: Campaña actual estimada */}
              <div className="rounded-tarjeta border border-marca/40 bg-marca-suave p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-wide text-marca">
                    Campaña actual ({temporada})
                  </span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-marca">
                    Estimación
                  </span>
                </div>
                <p className="mt-1 text-xl font-extrabold text-tinta">
                  {estimadoPrincipal !== null ? `${estimadoPrincipal.toFixed(2)} t/ha` : "Sin datos"}
                  {produccionTotalTn !== null ? (
                    <span className="ml-2 text-xs font-semibold text-tinta-suave">
                      ({produccionTotalTn.toFixed(1)} t)
                    </span>
                  ) : null}
                </p>
              </div>

              {/* Fila 2: Última campaña cosechada */}
              <div className="rounded-tarjeta border border-borde bg-fondo-suave p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-tinta-suave">
                    {ultimaCampanaReal
                      ? `Última cosecha (${ultimaCampanaReal.temporada})`
                      : "Última campaña cosechada"}
                  </span>
                  {ultimaCampanaReal && estimadoPrincipal !== null && (
                    <span className="text-xs font-bold text-tinta">
                      {formatoDelta(
                        Math.round((estimadoPrincipal - ultimaCampanaReal.rendimientoTnHa) * 100) /
                          100,
                      )}{" "}
                      ({formatoPorcentaje(estimadoPrincipal, ultimaCampanaReal.rendimientoTnHa)})
                    </span>
                  )}
                </div>
                <p className="mt-1 text-base font-bold text-tinta">
                  {ultimaCampanaReal
                    ? `${ultimaCampanaReal.rendimientoTnHa.toFixed(2)} t/ha`
                    : "Sin cosecha previa en esta parcela"}
                </p>
              </div>

              {/* Fila 3: Promedio / referencia histórica */}
              <div className="rounded-tarjeta border border-borde bg-fondo-suave p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-tinta-suave">
                    {impacto?.fuenteReferencia === "mediana_modelo"
                      ? "Mediana histórica del modelo"
                      : "Promedio / línea base histórica"}
                  </span>
                  {referenciaPrincipal !== null && estimadoPrincipal !== null && (
                    <span className="text-xs font-bold text-tinta">
                      {formatoDelta(diferenciaPrincipal)} ({porcentajeVsRef})
                    </span>
                  )}
                </div>
                <p className="mt-1 text-base font-bold text-tinta">
                  {referenciaPrincipal !== null
                    ? `${referenciaPrincipal.toFixed(2)} t/ha`
                    : "Sin referencia disponible"}
                </p>
              </div>
            </div>
          </div>

          {historicoPrevio.length > 0 && (
            <div className="mt-4 border-t border-borde pt-3">
              <p className="text-xs font-bold uppercase tracking-wide text-tinta-suave">
                Historial reciente de la parcela
              </p>
              <ul className="mt-2 space-y-1.5 text-xs">
                {historicoPrevio
                  .slice(-3)
                  .reverse()
                  .map((h) => (
                    <li
                      key={h.campanaId}
                      className="flex items-center justify-between gap-2 text-tinta"
                    >
                      <span className="text-tinta-suave">
                        {h.temporada} · {h.cultivoNombre}
                      </span>
                      <span className="font-bold">
                        {h.rendimientoTnHa.toFixed(2)} t/ha
                        {estimadoPrincipal !== null && (
                          <span className="ml-1.5 font-normal text-tinta-suave">
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
        className="rounded-tarjeta border border-borde bg-white p-5 sm:p-6"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-marca" aria-hidden />
          <h3 id="explicacion-heading" className="text-lg font-bold text-tinta">
            Explicación del resultado
          </h3>
        </div>
        <p className="mt-1 text-sm text-tinta-suave">
          Lectura interpretativa basada únicamente en las asociaciones estadísticas del modelo y en
          los registros reales cargados en la parcela.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-tarjeta border border-borde bg-fondo-suave p-4">
            <h4 className="flex items-center gap-1.5 text-sm font-bold text-tinta">
              <ClipboardCheck className="h-4 w-4 text-marca" aria-hidden />
              Variables asociadas al cálculo
            </h4>
            <ul className="mt-2 space-y-1.5 text-xs text-tinta-suave">
              {factores.length > 0 ? (
                factores.map((f) => (
                  <li key={f.variable}>
                    <strong className="text-tinta">{f.etiqueta}:</strong> {f.valorIngresado}
                  </li>
                ))
              ) : (
                <li>
                  No se evaluaron predictores específicos porque faltan variables de siembra en la
                  campaña o historial suficiente del cultivo.
                </li>
              )}
              <li>
                <strong className="text-tinta">Referencia histórica del lote/cultivo:</strong>{" "}
                {bloqueModelo
                  ? `${bloqueModelo.campañas_usadas} campañas usadas en el entrenamiento`
                  : `${oficial.campañas_usadas} campañas históricas cerradas`}
              </li>
            </ul>
          </div>

          <div className="rounded-tarjeta border border-borde bg-fondo-suave p-4">
            <h4 className="flex items-center gap-1.5 text-sm font-bold text-marca">
              <TrendingUp className="h-4 w-4" aria-hidden />
              Condiciones asociadas a mayor rendimiento
            </h4>
            {factoresPositivos.length > 0 ? (
              <ul className="mt-2 space-y-1.5 text-xs text-tinta">
                {factoresPositivos.map((f) => (
                  <li key={f.variable}>
                    <strong>{f.etiqueta}</strong> ({formatoDelta(f.delta_t_ha)}): {f.detalle}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-tinta-suave">
                Con los datos ingresados actualmente no se identificaron variables con aporte
                positivo adicional sobre la referencia.
              </p>
            )}
          </div>

          <div className="rounded-tarjeta border border-borde bg-fondo-suave p-4">
            <h4 className="flex items-center gap-1.5 text-sm font-bold text-atencion-texto">
              <TrendingDown className="h-4 w-4 text-atencion-icono" aria-hidden />
              Condiciones asociadas a menor rendimiento
            </h4>
            {factoresNegativos.length > 0 ? (
              <ul className="mt-2 space-y-1.5 text-xs text-tinta">
                {factoresNegativos.map((f) => (
                  <li key={f.variable}>
                    <strong>{f.etiqueta}</strong> ({formatoDelta(f.delta_t_ha)}): {f.detalle}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-tinta-suave">
                No se detectaron factores de siembra que reduzcan la estimación respecto al escenario
                base.
              </p>
            )}
          </div>

          <div className="rounded-tarjeta border border-borde bg-fondo-suave p-4">
            <h4 className="text-sm font-bold text-tinta">
              Cómo mejorar futuras estimaciones
            </h4>
            <ul className="mt-2 list-disc space-y-1.5 pl-4 text-xs text-tinta-suave">
              {mejorasFuturas.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
        </div>

        {advertenciasUnicas.length > 0 && (
          <div className="mt-4 rounded-tarjeta border border-borde bg-white p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-tinta-suave">
              Notas técnicas del modelo
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-tinta-suave">
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
