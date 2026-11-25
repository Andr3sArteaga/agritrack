"use client";

import {
  ArrowLeft,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  Equal,
  FlaskConical,
  History,
  Info,
  RefreshCw,
  SlidersHorizontal,
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
    etiquetaBadge: "Sobre la referencia",
    tituloCorto: "Sobre la referencia",
    punteado: false,
  },
  NEUTRO: {
    icono: Equal,
    caja: "border-tinta-suave bg-fondo text-tinta",
    pildora: "border-tinta-suave bg-white text-tinta-suave",
    claseIcono: "text-tinta-suave",
    etiquetaBadge: "Similar a la referencia",
    tituloCorto: "Similar a la referencia",
    punteado: true,
  },
  NEGATIVO: {
    icono: TrendingDown,
    caja: "border-atencion-borde/50 bg-atencion-fondo text-tinta",
    pildora: "border-atencion-borde/50 bg-white text-atencion-texto",
    claseIcono: "text-atencion-icono",
    etiquetaBadge: "Bajo la referencia",
    tituloCorto: "Bajo la referencia",
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
  const [mostrarValidacionTecnica, setMostrarValidacionTecnica] = useState(false);
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

      {avisoEntrenamiento &&
        (avisoEntrenamiento.tipo === "error" ? (
          <Advertencia tipo="ATENCION" titulo="No se pudo actualizar el modelo">
            {avisoEntrenamiento.texto}
          </Advertencia>
        ) : (
          <div className="flex items-start gap-2.5 rounded-tarjeta border border-marca/40 bg-marca-suave px-4 py-3 text-sm text-tinta">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-marca" aria-hidden />
            <span>{avisoEntrenamiento.texto}</span>
          </div>
        ))}

      {/* BLOQUE 1: HERO ESTIMACIÓN + EVOLUCIÓN HISTÓRICA */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Hero (5 cols) */}
        <section
          aria-labelledby="res-principal-heading"
          className="flex flex-col justify-between rounded-tarjeta border border-borde bg-white p-5 sm:p-6 lg:col-span-5"
        >
          <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-marca">
                  Estimación · {temporada}
                  {cultivoNombre ? ` (${cultivoNombre})` : ""}
                </p>
                <h2 id="res-principal-heading" className="sr-only">
                  Estimación de rendimiento · Campaña {temporada}
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {datos.etiqueta_datos && <EtiquetaDemo texto={datos.etiqueta_datos} />}
                {esModeloOficial ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-marca/40 bg-marca-suave px-2.5 py-0.5 text-xs font-bold text-marca">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                    Modelo Oficial {bloqueModelo?.version_modelo ?? ""}
                  </span>
                ) : esModeloExperimental ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-indigo-300 bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-900">
                    <FlaskConical className="h-3.5 w-3.5" aria-hidden />
                    Experimental {bloqueModelo?.version_modelo ?? ""}
                  </span>
                ) : (
                  <span className="rounded-full border border-borde bg-fondo-suave px-2.5 py-0.5 text-xs font-bold text-tinta-suave">
                    Línea base histórica
                  </span>
                )}
              </div>
            </div>

            <div>
              <p className="flex items-center gap-1.5 text-xs font-semibold text-tinta-suave">
                <Sprout className="h-4 w-4 text-marca" aria-hidden />
                Rendimiento esperado
              </p>
              {estimadoPrincipal !== null ? (
                <div className="mt-1">
                  <p className="text-4xl font-extrabold tracking-tight text-tinta">
                    {estimadoPrincipal.toFixed(2)}{" "}
                    <span className="text-lg font-bold text-tinta-suave">t/ha</span>
                  </p>
                  <p className="mt-1 text-sm font-semibold text-marca">
                    {produccionTotalTn !== null
                      ? `${produccionTotalTn.toFixed(1)} toneladas totales`
                      : "Pendiente superficie sembrada"}
                  </p>
                </div>
              ) : (
                <div className="mt-2">
                  <EstadoBadge estado="SIN_DATOS" tamano="lg" />
                </div>
              )}
            </div>

            <div
              className={`rounded-tarjeta border p-3.5 ${estilo.caja} ${
                estilo.punteado ? "border-dashed" : ""
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold ${estilo.pildora}`}
                >
                  <Zap className={`h-3.5 w-3.5 shrink-0 ${estilo.claseIcono}`} aria-hidden />
                  {estilo.etiquetaBadge}
                </span>
                <span className="inline-flex items-center gap-1 text-sm font-extrabold text-tinta">
                  <IconoEscenario className={`h-4 w-4 ${estilo.claseIcono}`} aria-hidden />
                  {diferenciaPrincipal !== null
                    ? `${formatoDelta(diferenciaPrincipal)} (${porcentajeVsRef})`
                    : estilo.tituloCorto}
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-tinta/85">
                {impacto?.resumen ??
                  "Comparación frente a la referencia histórica registrada para el cultivo en el sistema."}
              </p>
            </div>

            <dl className="grid grid-cols-2 gap-3 border-t border-borde pt-3 text-sm">
              <div>
                <dt className="text-xs text-tinta-suave">Referencia</dt>
                <dd className="mt-0.5 font-semibold text-tinta">
                  {referenciaPrincipal !== null ? `${referenciaPrincipal.toFixed(2)} t/ha` : "Sin datos"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-tinta-suave">Entrenamiento</dt>
                <dd className="mt-0.5 font-semibold text-tinta">
                  {bloqueModelo
                    ? `${bloqueModelo.campañas_usadas} campañas`
                    : `${oficial.campañas_usadas} campañas`}
                </dd>
              </div>
            </dl>
          </div>

          {(onEditarVariablesSiembra || (puedeEntrenar && cultivoId)) && (
            <div className="mt-5 flex flex-wrap gap-2 border-t border-borde pt-4">
              {onEditarVariablesSiembra && (
                <button
                  type="button"
                  onClick={onEditarVariablesSiembra}
                  className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-control bg-marca px-3.5 text-sm font-semibold text-white hover:bg-marca-hover"
                >
                  <SlidersHorizontal className="h-4 w-4 shrink-0" aria-hidden />
                  Ajustar variables de siembra
                </button>
              )}
              {puedeEntrenar && cultivoId && (
                <button
                  type="button"
                  disabled={entrenandoModelo}
                  onClick={actualizarModeloIa}
                  className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-control border border-borde bg-fondo-suave px-3 text-sm font-semibold text-tinta hover:bg-marca-suave disabled:opacity-60"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 text-marca ${entrenandoModelo ? "animate-spin" : ""}`}
                    aria-hidden
                  />
                  {entrenandoModelo ? "Actualizando..." : "Actualizar modelo IA"}
                </button>
              )}
            </div>
          )}
        </section>

        {/* Evolución histórica (7 cols) */}
        <section
          aria-labelledby="evolucion-heading"
          className="flex flex-col justify-between rounded-tarjeta border border-borde bg-white p-5 sm:p-6 lg:col-span-7"
        >
          <div>
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
                  Comparación de cosechas reales frente a la estimación actual de la campaña.
                </p>
              </div>
            </div>

            {puntosGrafico.length > 0 ? (
              <>
                <div className="mt-4 flex flex-wrap items-center gap-4 text-xs font-medium text-tinta-suave">
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className="h-3 w-3 rounded-sm"
                      style={{ backgroundColor: "#78a88a" }}
                      aria-hidden
                    />
                    Cosecha real registrada
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className="h-3 w-3 rounded-sm border border-dashed border-atencion-icono bg-atencion-icono"
                      aria-hidden
                    />
                    Estimación actual
                  </span>
                  {referenciaPrincipal !== null && (
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className="h-0.5 w-4 border-t-2 border-dashed border-tinta-suave"
                        aria-hidden
                      />
                      Referencia ({referenciaPrincipal.toFixed(2)} t/ha)
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
                            fill={
                              entry.tipo === "estimacion"
                                ? "var(--color-atencion-icono)"
                                : "#78a88a"
                            }
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
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 border-t border-borde pt-4 sm:grid-cols-2">
            <div className="rounded-control bg-fondo-suave px-3.5 py-2.5">
              <p className="text-xs text-tinta-suave">
                {ultimaCampanaReal
                  ? `Última cosecha (${ultimaCampanaReal.temporada})`
                  : "Última cosecha"}
              </p>
              <div className="mt-0.5 flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-base font-bold text-tinta">
                  {ultimaCampanaReal
                    ? `${ultimaCampanaReal.rendimientoTnHa.toFixed(2)} t/ha`
                    : "Sin cosecha previa"}
                </span>
                {ultimaCampanaReal && estimadoPrincipal !== null && (
                  <span className="text-xs font-semibold text-tinta-suave">
                    {formatoDelta(
                      Math.round((estimadoPrincipal - ultimaCampanaReal.rendimientoTnHa) * 100) /
                        100,
                    )}{" "}
                    ({formatoPorcentaje(estimadoPrincipal, ultimaCampanaReal.rendimientoTnHa)})
                  </span>
                )}
              </div>
            </div>

            <div className="rounded-control bg-fondo-suave px-3.5 py-2.5">
              <p className="text-xs text-tinta-suave">
                {impacto?.fuenteReferencia === "mediana_modelo"
                  ? "Referencia histórica (mediana)"
                  : "Referencia histórica (línea base)"}
              </p>
              <div className="mt-0.5 flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-base font-bold text-tinta">
                  {referenciaPrincipal !== null
                    ? `${referenciaPrincipal.toFixed(2)} t/ha`
                    : "Sin referencia"}
                </span>
                {referenciaPrincipal !== null && estimadoPrincipal !== null && (
                  <span className="text-xs font-semibold text-tinta-suave">
                    {formatoDelta(diferenciaPrincipal)} ({porcentajeVsRef})
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* BLOQUE 2: QUÉ EXPLICA ESTA ESTIMACIÓN (UNIFICADO) */}
      <section
        aria-labelledby="factores-heading"
        className="rounded-tarjeta border border-borde bg-white p-5 sm:p-6"
      >
        <div className="mb-4">
          <h3 id="factores-heading" className="text-lg font-bold text-tinta">
            Qué explica esta estimación
          </h3>
          <p className="mt-0.5 text-sm text-tinta-suave">
            Aporte individual de las variables de manejo y recomendaciones según el estado actual de
            la parcela.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Izquierda: Factores que influyeron */}
          <div className="lg:col-span-7">
            <h4 className="mb-3 text-sm font-bold text-tinta">Factores que influyeron</h4>
            {factores.length > 0 ? (
              <div className="space-y-3">
                {factores.map((factor) => {
                  const chip = CHIP_FACTOR[factor.efecto];
                  const IconoChip = chip.icono;
                  const anchoBarra =
                    factor.delta_t_ha === 0
                      ? 8
                      : Math.min(
                          100,
                          Math.max(14, (Math.abs(factor.delta_t_ha) / maxAbsDelta) * 100),
                        );
                  return (
                    <div
                      key={factor.variable}
                      className="rounded-tarjeta border border-borde bg-fondo-suave p-3.5"
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

                      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white ring-1 ring-borde">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${chip.barra}`}
                          style={{ width: `${anchoBarra}%` }}
                        />
                      </div>

                      <p className="mt-2 text-xs leading-relaxed text-tinta-suave">
                        {factor.detalle}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-tarjeta border border-dashed border-sindatos-borde bg-fondo-suave p-4 text-sm text-tinta-suave">
                Registra superficie sembrada, fecha de siembra y variedad en la pestaña{" "}
                <strong>Registro</strong> para cuantificar el aporte de cada variable en la
                estimación.
              </div>
            )}
          </div>

          {/* Derecha: Qué mejorar + Contexto de campo */}
          <div className="space-y-4 lg:col-span-5">
            <div className="rounded-tarjeta border border-borde bg-fondo-suave p-4">
              <h4 className="text-sm font-bold text-tinta">Cómo mejorar futuras estimaciones</h4>
              <ul className="mt-2.5 list-disc space-y-2 pl-4 text-xs leading-relaxed text-tinta-suave">
                {mejorasFuturas.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </div>

            {evaluacionRegistro && (
              <div className="rounded-tarjeta border border-borde bg-white p-4">
                <h4 className="text-sm font-bold text-tinta">Contexto de campo (informativo)</h4>
                <dl className="mt-2.5 space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-2 border-b border-borde pb-2">
                    <dt className="text-tinta-suave">Suelo</dt>
                    <dd className="font-semibold text-tinta">
                      {evaluacionRegistro.sueloConDato}/6 indicadores
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-tinta-suave">Clima (últimos 30 días)</dt>
                    <dd className="font-semibold text-tinta">
                      {evaluacionRegistro.clima30d.length} registros ·{" "}
                      {evaluacionRegistro.lluvia30dMm} mm lluvia
                    </dd>
                  </div>
                </dl>
                <p className="mt-2.5 text-xs text-tinta-suave">
                  Registros agronómicos complementarios de seguimiento; no forman parte de la fórmula
                  pre-siembra del modelo Random Forest.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* BLOQUE 3: REVELACIÓN PROGRESIVA — VALIDACIÓN TÉCNICA DEL MODELO */}
      {(bloqueModelo || advertenciasUnicas.length > 0) && (
        <section
          aria-labelledby="metricas-rf-heading"
          className="rounded-tarjeta border border-borde bg-white"
        >
          <button
            id="metricas-rf-heading"
            type="button"
            aria-expanded={mostrarValidacionTecnica}
            onClick={() => setMostrarValidacionTecnica((prev) => !prev)}
            className="flex min-h-11 w-full flex-wrap items-center justify-between gap-3 rounded-tarjeta px-5 py-4 text-left transition-colors hover:bg-fondo-suave/60 sm:px-6"
          >
            <div className="flex flex-wrap items-center gap-2.5">
              <BarChart3 className="h-5 w-5 shrink-0 text-marca" aria-hidden />
              <div>
                <span className="text-base font-bold text-tinta">
                  Validación técnica del modelo
                </span>
                <p className="text-xs text-tinta-suave">
                  Métricas estadísticas (MAE, RMSE, R²), validación temporal y notas técnicas.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {metricasEval && (
                <>
                  {metricasEval.superaLineaBase ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-marca/40 bg-marca-suave px-2.5 py-0.5 text-xs font-bold text-marca">
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                      Supera línea base
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full border border-atencion-borde/50 bg-atencion-fondo px-2.5 py-0.5 text-xs font-bold text-atencion-texto">
                      <Info className="h-3.5 w-3.5 text-atencion-icono" aria-hidden />
                      No supera aún
                    </span>
                  )}
                  <span className="rounded-full border border-borde bg-fondo-suave px-2.5 py-0.5 text-xs font-semibold text-tinta">
                    MAE {metricasEval.maeModelo.toFixed(3)} t/ha
                  </span>
                </>
              )}
              <ChevronDown
                className={`h-5 w-5 text-tinta-suave transition-transform duration-200 ${
                  mostrarValidacionTecnica ? "rotate-180" : ""
                }`}
                aria-hidden
              />
            </div>
          </button>

          {mostrarValidacionTecnica && (
            <div className="space-y-4 border-t border-borde p-5 sm:p-6">
              {bloqueModelo &&
                (metricasEval ? (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm text-tinta-suave">
                        Evaluación estadística fuera de muestra frente al promedio histórico por
                        cultivo (línea base) mediante validación temporal <em>walk-forward</em>.
                      </p>
                      {metricasEval.superaLineaBase ? (
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
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
                            <p>
                              Se requieren al menos 2 observaciones con variación para calcular R².
                            </p>
                          )}
                          <p className="text-xs leading-snug text-tinta-suave">
                            Valores cercanos a 1.000 indican mayor capacidad explicativa.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-tarjeta border border-borde bg-fondo-suave px-4 py-3 text-xs text-tinta-suave">
                      <span>
                        <strong className="text-tinta">Detalle de validación:</strong> validación
                        temporal <em>walk-forward</em> sin fuga de datos en{" "}
                        <strong className="text-tinta">{metricasEval.cortesEvaluados}</strong>{" "}
                        {metricasEval.cortesEvaluados === 1 ? "corte" : "cortes"} (
                        <strong className="text-tinta">{metricasEval.filasEvaluadas}</strong>{" "}
                        {metricasEval.filasEvaluadas === 1 ? "registro de lote" : "registros de lote"}
                        ) · Intervalo de confianza Bootstrap 95 % para ΔMAE:{" "}
                        <strong className="text-tinta">
                          [{metricasEval.icDiferenciaMae[0].toFixed(3)},{" "}
                          {metricasEval.icDiferenciaMae[1].toFixed(3)}] t/ha
                        </strong>{" "}
                        (el modelo supera significativamente al promedio histórico cuando el límite
                        superior es menor que 0).
                      </span>
                      {fechaConsultaIso && (
                        <span className="inline-flex items-center gap-1 font-medium text-tinta">
                          <CalendarClock className="h-3.5 w-3.5 text-marca" aria-hidden />
                          {formatearFechaHora(fechaConsultaIso)}
                        </span>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="rounded-tarjeta border border-dashed border-sindatos-borde bg-fondo-suave p-4 text-sm text-tinta-suave">
                    Esta versión del modelo no tiene métricas de validación actualizadas guardadas.
                    {puedeEntrenar && cultivoId
                      ? " Usa el botón “Actualizar modelo IA” arriba para recalcular MAE, RMSE y R²."
                      : ""}
                  </div>
                ))}

              {advertenciasUnicas.length > 0 && (
                <div className="rounded-tarjeta border border-borde bg-fondo-suave/60 p-4">
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
            </div>
          )}
        </section>
      )}
    </div>
  );
}
