"use client";

import {
  ChevronDown,
  ChevronUp,
  CloudSun,
  FlaskConical,
  LineChart,
  SlidersHorizontal,
  Sparkles,
  Wrench,
} from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { api, apiErrorMessage } from "@/lib/api";
import { ES_MODO_DEV, type PrepararParcelaDevRespuesta } from "@/lib/prediccion";
import type { Campana, Cultivo } from "@/lib/types";

const STORAGE_KEY_DEV = "agritrack_panel_dev_abierto";
const EVENTO_DEV = "agritrack-panel-dev-cambio";

const hoyLocal = (): string => new Date().toLocaleDateString("en-CA");
const ayerLocal = (): string =>
  new Date(Date.now() - 24 * 60 * 60 * 1000).toLocaleDateString("en-CA");

function suscribirPanelDev(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(EVENTO_DEV, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(EVENTO_DEV, onStoreChange);
  };
}

function leerEstadoPanelDev(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(STORAGE_KEY_DEV) !== "false";
}

function guardarEstadoPanelDev(abierto: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY_DEV, abierto ? "true" : "false");
  window.dispatchEvent(new Event(EVENTO_DEV));
}

export function BarraModoDesarrollo({
  parcelaId,
  cultivos,
  campanaActual,
  onRecargarTodo,
  onAbrirImpacto,
  onVerEstimacion,
}: {
  parcelaId: string;
  cultivos: Cultivo[];
  campanaActual: Campana | null;
  onRecargarTodo: (campanaFocusId?: string) => void;
  onAbrirImpacto: (campana: Campana) => void;
  onVerEstimacion?: () => void;
}) {
  const abierto = useSyncExternalStore(
    suscribirPanelDev,
    leerEstadoPanelDev,
    () => true,
  );

  const [cultivoManualId, setCultivoManualId] = useState<string | null>(null);
  const [ejecutando, setEjecutando] = useState<"ia" | "monitoreo" | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!ES_MODO_DEV) return null;

  const cultivoPorDefecto =
    campanaActual?.cultivoId ??
    cultivos.find((c) => c.nombre.toLowerCase().includes("soya"))?.id ??
    cultivos[0]?.id ??
    "";
  const cultivoSeleccionadoId = cultivoManualId ?? cultivoPorDefecto;

  async function prepararParaIA() {
    setError(null);
    setMensaje(null);
    setEjecutando("ia");
    try {
      const { data } = await api.post<PrepararParcelaDevRespuesta>(
        "/prediccion/preparar-dev",
        {
          parcelaId,
          cultivoId: cultivoSeleccionadoId || undefined,
        },
      );

      for (const faltante of data.campanasSinActividadCosecha) {
        await api.post("/actividades", {
          campanaId: faltante.campanaId,
          tipo: "COSECHA",
          fecha: faltante.fechaCosecha,
          descripcion: "Cosecha histórica generada automáticamente (Modo Dev)",
          rendimientoTnHa: faltante.rendimientoTnHa,
        });
      }

      if (data.campanaActualNecesitaSiembra) {
        await api.post("/actividades", {
          campanaId: data.campanaActualNecesitaSiembra.campanaId,
          tipo: "SIEMBRA",
          fecha: data.campanaActualNecesitaSiembra.fechaSiembra,
          descripcion: "Siembra inicial generada automáticamente (Modo Dev)",
          insumo: "Semilla certificada",
          cantidad: 60,
          unidad: "kg/ha",
        });
      }

      setMensaje(
        `Parcela lista: ${data.campanasHabilitadas} campañas históricas de ${data.cultivoNombre} creadas/actualizadas y modelo Random Forest ${data.versionModelo} (${data.estadoModelo}) entrenado para "${data.temporadaActual}".`,
      );
      onRecargarTodo(data.campanaActualId);
    } catch (err) {
      setError(
        apiErrorMessage(
          err,
          "No se pudo preparar la parcela con campañas y modelo IA.",
        ),
      );
    } finally {
      setEjecutando(null);
    }
  }

  async function rellenarMonitoreo() {
    setError(null);
    setMensaje(null);
    setEjecutando("monitoreo");
    try {
      const hoy = hoyLocal();
      const ayer = ayerLocal();
      await api.post("/monitoreo/suelo", {
        parcelaId,
        fecha: hoy,
        ph: 6.2,
        nitrogeno: 24,
        fosforo: 18,
        potasio: 165,
        materiaOrganica: 2.8,
        humedad: 23.5,
        notas: "Análisis completo de laboratorio (Modo Dev)",
      });
      await api.post("/monitoreo/clima", {
        parcelaId,
        fecha: ayer,
        condicion: "LLUVIA_LIGERA",
        lluviaMm: 18,
        notas: "Lluvia moderada previa (Modo Dev)",
      });
      await api.post("/monitoreo/clima", {
        parcelaId,
        fecha: hoy,
        condicion: "SOLEADO",
        notas: "Jornada despejada (Modo Dev)",
      });

      setMensaje(
        "Monitoreo cargado: análisis completo de suelo y registros climáticos de hoy y ayer.",
      );
      onRecargarTodo();
    } catch (err) {
      setError(
        apiErrorMessage(
          err,
          "No se pudo cargar el monitoreo rápido de suelo y clima.",
        ),
      );
    } finally {
      setEjecutando(null);
    }
  }

  return (
    <section
      aria-label="Herramientas de modo desarrollo"
      className="rounded-xl border-2 border-dashed border-amber-500 bg-amber-50/70 p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Wrench className="h-5 w-5 shrink-0 text-amber-800" aria-hidden />
          <div>
            <p className="text-sm font-bold text-amber-950">
              Modo Desarrollo · Relleno rápido y pruebas del modelo IA
            </p>
            <p className="text-xs text-amber-900">
              Visible solo en entorno local (`NODE_ENV !== production`). Genera campañas reales,
              entrena Random Forest y carga datos en 1 clic.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => guardarEstadoPanelDev(!abierto)}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-amber-600 bg-white px-3 text-xs font-bold text-amber-900 hover:bg-amber-100"
        >
          {abierto ? (
            <>
              <ChevronUp className="h-4 w-4" aria-hidden />
              Ocultar barra dev
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" aria-hidden />
              Mostrar barra dev
            </>
          )}
        </button>
      </div>

      {abierto && (
        <div className="mt-3 space-y-3 border-t border-amber-300 pt-3">
          {cultivos.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <label
                htmlFor="dev-cultivo"
                className="text-xs font-bold text-amber-950"
              >
                Cultivo objetivo para historial/modelo:
              </label>
              <select
                id="dev-cultivo"
                value={cultivoSeleccionadoId}
                onChange={(e) => setCultivoManualId(e.target.value)}
                disabled={ejecutando !== null}
                className="min-h-11 rounded-md border border-amber-500 bg-white px-3 text-sm font-medium text-stone-900"
              >
                {cultivos.map((cultivo) => (
                  <option key={cultivo.id} value={cultivo.id}>
                    {cultivo.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={ejecutando !== null}
              onClick={prepararParaIA}
              className="inline-flex min-h-11 items-center gap-2 rounded-md border-2 border-emerald-800 bg-emerald-700 px-3.5 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4 shrink-0" aria-hidden />
              {ejecutando === "ia"
                ? "Preparando campañas y entrenando..."
                : "Preparar parcela para predicción IA (+ campañas y modelo)"}
            </button>

            <button
              type="button"
              disabled={ejecutando !== null}
              onClick={rellenarMonitoreo}
              className="inline-flex min-h-11 items-center gap-2 rounded-md border-2 border-amber-700 bg-white px-3.5 text-sm font-bold text-amber-950 hover:bg-amber-100 disabled:opacity-50"
            >
              <CloudSun className="h-4 w-4 shrink-0" aria-hidden />
              {ejecutando === "monitoreo"
                ? "Cargando monitoreo..."
                : "Rellenar monitoreo rápido (Suelo + Clima)"}
            </button>

            <button
              type="button"
              disabled={ejecutando !== null || !campanaActual}
              onClick={() => campanaActual && onAbrirImpacto(campanaActual)}
              title={
                campanaActual
                  ? "Abre el formulario de variables de siembra con escenarios en vivo"
                  : "Primero prepara o crea una campaña en esta parcela"
              }
              className="inline-flex min-h-11 items-center gap-2 rounded-md border-2 border-stone-600 bg-white px-3.5 text-sm font-bold text-stone-900 hover:bg-stone-100 disabled:opacity-50"
            >
              <SlidersHorizontal className="h-4 w-4 shrink-0" aria-hidden />
              Probar impacto en tiempo real (Abrir siembra)
            </button>

            {onVerEstimacion && (
              <button
                type="button"
                disabled={ejecutando !== null || !campanaActual}
                onClick={onVerEstimacion}
                className="inline-flex min-h-11 items-center gap-2 rounded-md border-2 border-emerald-700 bg-white px-3.5 text-sm font-bold text-emerald-900 hover:bg-emerald-50 disabled:opacity-50"
              >
                <LineChart className="h-4 w-4 shrink-0" aria-hidden />
                Ver resultado en Tab 2 (Estimación)
              </button>
            )}
          </div>

          {!campanaActual && (
            <p className="flex items-center gap-1.5 text-xs text-amber-900">
              <FlaskConical className="h-4 w-4 shrink-0" aria-hidden />
              Esta parcela todavía no tiene una campaña actual. Pulsa &quot;Preparar parcela
              para predicción IA&quot; para generarla junto con sus 6 campañas históricas.
            </p>
          )}

          {mensaje && (
            <p
              role="status"
              className="rounded-md border border-emerald-700 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-950"
            >
              {mensaje}
            </p>
          )}

          {error && (
            <p
              role="alert"
              className="rounded-md border border-red-700 bg-red-50 px-3 py-2 text-xs font-semibold text-red-900"
            >
              {error}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
