"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  Activity as IconoEstado,
  ArrowLeft,
  CalendarRange,
  ClipboardList,
  CloudSun,
  Layers,
  LineChart,
  PackageCheck,
  Pencil,
  Plus,
  SlidersHorizontal,
  Sprout,
  Trash2,
} from "lucide-react";
import { Ayuda } from "@/components/ayuda";
import { BadgeEstadoCampana } from "@/components/badge";
import { EstadoBadge } from "@/components/estado/estado-badge";
import { EstimacionComponente } from "@/components/estado/estimacion-componente";
import { PanelEstadoParcela } from "@/components/estado/panel-estado-parcela";
import { IconoActividad } from "@/components/icono-actividad";
import { api, apiErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useResumenParcela } from "@/lib/cargar-resumen";
import { formatearFecha } from "@/lib/format";
import { elegirCampanaActual } from "@/lib/parcelas";
import type { RegistroCosechaCampana } from "@/lib/prediccion";
import type { AreaResumen } from "@/lib/resumen-parcela";
import {
  ESTADO_CAMPANA_LABEL,
  TIPO_ACTIVIDAD_LABEL,
  type Actividad,
  type Campana,
  type Cultivo,
  type EstadoCampana,
  type Parcela,
} from "@/lib/types";
import { CampanaForm } from "./campana-form";
import { ClimaForm } from "./clima-form";
import { RegistroCosechaForm } from "./registro-cosecha-form";
import { SueloForm } from "./suelo-form";
import { ActividadForm } from "./actividad-form";
import { BarraModoDesarrollo } from "./barra-modo-desarrollo";

const ESTADOS: EstadoCampana[] = ["PLANIFICADA", "EN_CURSO", "COSECHADA"];
type PestanaParcela = "registro" | "estimacion";

/** Boton grande para cargar un dato, dentro del area a la que pertenece. */
function BotonCargar({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-11 items-center gap-2 rounded-md border-2 border-emerald-700 bg-emerald-700 px-4 text-sm font-bold text-white hover:bg-emerald-800 sm:text-base"
    >
      <Plus className="h-5 w-5 shrink-0" aria-hidden />
      {children}
    </button>
  );
}

function TarjetaDominioMonitoreo({
  titulo,
  descripcion,
  icono: Icono,
  area,
  botonLabel,
  onAccion,
}: {
  titulo: string;
  descripcion: string;
  icono: typeof Layers;
  area: AreaResumen | undefined;
  botonLabel: string;
  onAccion?: () => void;
}) {
  const faltantes = area ? area.indicadores.length - area.conDato : 0;
  return (
    <article className="flex flex-col justify-between gap-4 rounded-xl border-2 border-stone-200 bg-white p-4">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-lg font-bold text-stone-900">
            <Icono className="h-5 w-5 shrink-0 text-emerald-700" aria-hidden />
            {titulo}
          </h3>
          {area && <EstadoBadge estado={area.estado} tamano="sm" />}
        </div>
        <p className="mt-1 text-sm text-stone-600">{descripcion}</p>
        {area && (
          <p className="mt-2 text-xs font-medium text-stone-700">
            {area.conDato} de {area.indicadores.length} indicadores cargados
            {area.alertas > 0
              ? ` · ${area.alertas} ${area.alertas === 1 ? "alerta activa" : "alertas activas"}`
              : faltantes > 0
                ? ` · Faltan ${faltantes}`
                : " · Completo"}
          </p>
        )}
      </div>

      {onAccion && (
        <div>
          <BotonCargar onClick={onAccion}>{botonLabel}</BotonCargar>
        </div>
      )}
    </article>
  );
}

export default function ParcelaPrivadaDetallePage() {
  const params = useParams<{ id: string }>();
  const parcelaId = params.id;
  const { usuario } = useAuth();
  const esJefe = usuario?.rol === "JEFE";
  const puedeRegistrarActividad = usuario?.rol === "JEFE" || usuario?.rol === "OPERATIVO";

  const [pestanaActiva, setPestanaActiva] = useState<PestanaParcela>("registro");

  const [parcela, setParcela] = useState<Parcela | null>(null);
  const [cultivos, setCultivos] = useState<Cultivo[]>([]);
  const [campanas, setCampanas] = useState<Campana[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [campanaAbierta, setCampanaAbierta] = useState<string | null>(null);
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [registroCosecha, setRegistroCosecha] = useState<RegistroCosechaCampana | null>(null);
  const [registroActivo, setRegistroActivo] = useState<RegistroCosechaCampana | null>(null);

  const [mostrarFormCampana, setMostrarFormCampana] = useState(false);
  const [mostrarFormActividad, setMostrarFormActividad] = useState(false);
  const [corrigiendo, setCorrigiendo] = useState<Actividad | null>(null);
  const [modalRegistroCosecha, setModalRegistroCosecha] = useState<{
    campana: Campana;
    modo: "siembra" | "cosecha";
  } | null>(null);
  const [versionEstimacion, setVersionEstimacion] = useState(0);
  // Suelo y clima: que formulario esta abierto, y contador para recargar el estado al guardar.
  const [formMonitoreo, setFormMonitoreo] = useState<"suelo" | "clima" | null>(null);
  const [versionEstado, setVersionEstado] = useState(0);
  const { datos: resumenEstado, error: errorEstado } = useResumenParcela(
    parcela,
    campanas,
    cultivos,
    versionEstado,
  );
  const alGuardarMonitoreo = () => {
    setFormMonitoreo(null);
    setVersionEstado((v) => v + 1);
  };

  const cargarParcela = useCallback(() => {
    api
      .get<Parcela>(`/parcelas/${parcelaId}`)
      .then((res) => setParcela(res.data))
      .catch((err) => setError(apiErrorMessage(err, "No se pudo cargar la parcela")));
  }, [parcelaId]);

  const cargarCampanas = useCallback(() => {
    api
      .get<Campana[]>("/campanas", { params: { parcelaId } })
      .then((res) => setCampanas(res.data))
      .catch((err) => setError(apiErrorMessage(err, "No se pudieron cargar las campañas")));
  }, [parcelaId]);

  useEffect(() => {
    cargarParcela();
    cargarCampanas();
    api.get<Cultivo[]>("/cultivos").then((res) => setCultivos(res.data));
  }, [cargarParcela, cargarCampanas]);

  const cargarActividades = useCallback((campanaId: string) => {
    api
      .get<Actividad[]>("/actividades", { params: { campanaId } })
      .then((res) => setActividades(res.data));
  }, []);

  const cargarRegistroCosecha = useCallback((campanaId: string) => {
    api
      .get<RegistroCosechaCampana | null | "">(`/campanas/${campanaId}/registro-cosecha`)
      .then((res) =>
        setRegistroCosecha(res.data && typeof res.data === "object" ? res.data : null),
      )
      .catch(() => setRegistroCosecha(null));
  }, []);

  // Se estima la campaña actual; si no hay, la mas reciente.
  const campanaParaEstimar =
    elegirCampanaActual(campanas) ??
    [...campanas].sort((a, b) => b.fechaInicio.localeCompare(a.fechaInicio))[0] ??
    null;
  const campanaParaEstimarId = campanaParaEstimar?.id ?? null;

  useEffect(() => {
    if (!campanaParaEstimarId) return;
    let cancelado = false;
    api
      .get<RegistroCosechaCampana | null | "">(`/campanas/${campanaParaEstimarId}/registro-cosecha`)
      .then((res) => {
        if (!cancelado) {
          setRegistroActivo(res.data && typeof res.data === "object" ? res.data : null);
        }
      })
      .catch(() => {
        if (!cancelado) setRegistroActivo(null);
      });
    return () => {
      cancelado = true;
    };
  }, [campanaParaEstimarId, versionEstimacion]);

  function toggleCampana(campanaId: string) {
    if (campanaAbierta === campanaId) {
      setCampanaAbierta(null);
      setActividades([]);
      setRegistroCosecha(null);
    } else {
      setCampanaAbierta(campanaId);
      cargarActividades(campanaId);
      cargarRegistroCosecha(campanaId);
    }
  }

  async function cambiarEstado(campana: Campana, estado: EstadoCampana) {
    try {
      await api.patch(`/campanas/${campana.id}`, { estado });
      cargarCampanas();
    } catch (err) {
      alert(apiErrorMessage(err, "No se pudo cambiar el estado"));
    }
  }

  async function eliminarCampana(campana: Campana) {
    if (!confirm(`¿Eliminar la campaña "${campana.temporada}"?`)) return;
    try {
      await api.delete(`/campanas/${campana.id}`);
      cargarCampanas();
    } catch (err) {
      alert(apiErrorMessage(err, "No se pudo eliminar la campaña"));
    }
  }

  function cultivoNombre(id: string): string {
    return cultivos.find((c) => c.id === id)?.nombre ?? "—";
  }

  if (error) return <p className="text-red-600">{error}</p>;
  if (!parcela) return <p className="text-stone-500">Cargando...</p>;

  const areaSuelo = resumenEstado?.areas.find((a) => a.id === "SUELO");
  const areaClima = resumenEstado?.areas.find((a) => a.id === "CLIMA");
  const registroVisibleActivo =
    registroActivo && campanaParaEstimar && registroActivo.campanaId === campanaParaEstimar.id
      ? registroActivo
      : registroCosecha && campanaParaEstimar && registroCosecha.campanaId === campanaParaEstimar.id
        ? registroCosecha
        : null;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/panel/parcelas"
          className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Volver a parcelas
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-stone-900">{parcela.nombre}</h1>
        <p className="mt-1 text-stone-600">
          {parcela.hectareas} ha · {parcela.ubicacionTexto}
        </p>
      </div>

      {puedeRegistrarActividad && (
        <BarraModoDesarrollo
          parcelaId={parcela.id}
          cultivos={cultivos}
          campanaActual={campanaParaEstimar}
          onRecargarTodo={(campanaFocusId) => {
            cargarParcela();
            cargarCampanas();
            setVersionEstado((v) => v + 1);
            setVersionEstimacion((v) => v + 1);
            const objetivoId = campanaFocusId ?? campanaAbierta;
            if (objetivoId) {
              setCampanaAbierta(objetivoId);
              cargarActividades(objetivoId);
              cargarRegistroCosecha(objetivoId);
            }
          }}
          onAbrirImpacto={(campana) => {
            setCampanaAbierta(campana.id);
            cargarActividades(campana.id);
            cargarRegistroCosecha(campana.id);
            setModalRegistroCosecha({ campana, modo: "siembra" });
          }}
          onVerEstimacion={() => setPestanaActiva("estimacion")}
        />
      )}

      {/* Navegación estricta de 2 pestañas */}
      <div
        role="tablist"
        aria-label="Secciones de la parcela"
        className="grid grid-cols-1 gap-2 rounded-xl border-2 border-stone-200 bg-stone-100 p-1.5 sm:grid-cols-2"
      >
        <button
          id="tab-registro"
          type="button"
          role="tab"
          aria-selected={pestanaActiva === "registro"}
          aria-controls="panel-registro"
          onClick={() => setPestanaActiva("registro")}
          className={`flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold transition-colors sm:text-base ${
            pestanaActiva === "registro"
              ? "bg-emerald-800 text-white shadow-sm"
              : "bg-white text-stone-800 hover:bg-stone-50"
          }`}
        >
          <ClipboardList className="h-5 w-5 shrink-0" aria-hidden />
          1. Estado de la Parcela / Registro
        </button>

        <button
          id="tab-estimacion"
          type="button"
          role="tab"
          aria-selected={pestanaActiva === "estimacion"}
          aria-controls="panel-estimacion"
          onClick={() => setPestanaActiva("estimacion")}
          className={`flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold transition-colors sm:text-base ${
            pestanaActiva === "estimacion"
              ? "bg-emerald-800 text-white shadow-sm"
              : "bg-white text-stone-800 hover:bg-stone-50"
          }`}
        >
          <LineChart className="h-5 w-5 shrink-0" aria-hidden />
          2. Estimación de Rendimiento
        </button>
      </div>

      {/* TAB 1: ESTADO DE LA PARCELA / REGISTRO */}
      {pestanaActiva === "registro" && (
        <div
          id="panel-registro"
          role="tabpanel"
          aria-labelledby="tab-registro"
          className="space-y-8"
        >
          {/* BLOQUE 1: VARIABLES DE MANEJO / SIEMBRA QUE AFECTAN AL MODELO */}
          <section
            aria-labelledby="bloque-agronomico"
            className="space-y-4 rounded-xl border-2 border-emerald-800/25 bg-emerald-50/35 p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2
                  id="bloque-agronomico"
                  className="flex items-center gap-2 text-xl font-bold text-stone-900"
                >
                  <Sprout className="h-6 w-6 shrink-0 text-emerald-700" aria-hidden />
                  1. Variables agronómicas de manejo (afectan al modelo IA)
                </h2>
                <p className="mt-1 text-sm text-stone-700">
                  Superficie sembrada, fecha de siembra y variedad de la campaña activa. Estos datos
                  determinan el resultado de rendimiento que verás en el Tab 2.
                </p>
              </div>

              {campanaParaEstimar && <BadgeEstadoCampana estado={campanaParaEstimar.estado} />}
            </div>

            {campanaParaEstimar ? (
              <>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-stone-200 bg-white p-3.5">
                    <p className="text-xs font-bold uppercase tracking-wide text-stone-600">
                      Superficie sembrada
                    </p>
                    <p className="mt-1 text-lg font-bold text-stone-900">
                      {registroVisibleActivo
                        ? `${registroVisibleActivo.haSembradas} ha`
                        : `${parcela.hectareas} ha (lote)`}
                    </p>
                  </div>
                  <div className="rounded-lg border border-stone-200 bg-white p-3.5">
                    <p className="text-xs font-bold uppercase tracking-wide text-stone-600">
                      Fecha de siembra
                    </p>
                    <p className="mt-1 text-lg font-bold text-stone-900">
                      {registroVisibleActivo?.fechaSiembra
                        ? formatearFecha(registroVisibleActivo.fechaSiembra)
                        : "Sin fecha"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-stone-200 bg-white p-3.5">
                    <p className="text-xs font-bold uppercase tracking-wide text-stone-600">
                      Variedad / semilla
                    </p>
                    <p className="mt-1 text-lg font-bold text-stone-900">
                      {registroVisibleActivo?.variedad ?? "Sin especificar"}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-emerald-800/15 pt-3">
                  <p className="text-sm font-medium text-stone-700">
                    Campaña activa:{" "}
                    <strong className="text-stone-900">
                      {campanaParaEstimar.temporada} · {cultivoNombre(campanaParaEstimar.cultivoId)}
                    </strong>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {puedeRegistrarActividad && (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            setModalRegistroCosecha({
                              campana: campanaParaEstimar,
                              modo: "siembra",
                            })
                          }
                          className="inline-flex min-h-11 items-center gap-1.5 rounded-md border-2 border-emerald-800 bg-emerald-700 px-4 text-sm font-bold text-white hover:bg-emerald-800"
                        >
                          <SlidersHorizontal className="h-4 w-4 shrink-0" aria-hidden />
                          Editar variables de siembra
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setModalRegistroCosecha({
                              campana: campanaParaEstimar,
                              modo: "cosecha",
                            })
                          }
                          className="inline-flex min-h-11 items-center gap-1.5 rounded-md border-2 border-stone-400 bg-white px-3.5 text-sm font-bold text-stone-800 hover:bg-stone-50"
                        >
                          <PackageCheck className="h-4 w-4 shrink-0" aria-hidden />
                          Registrar cosecha real
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => setPestanaActiva("estimacion")}
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-md border-2 border-emerald-700 bg-white px-3.5 text-sm font-bold text-emerald-900 hover:bg-emerald-50"
                    >
                      <LineChart className="h-4 w-4 shrink-0" aria-hidden />
                      Ver resultado en Tab 2 →
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-stone-200 bg-white p-4">
                <p className="text-sm text-stone-700">
                  Esta parcela aún no tiene una campaña activa para registrar variables de siembra.
                </p>
                {esJefe && (
                  <button
                    type="button"
                    onClick={() => setMostrarFormCampana(true)}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-md bg-emerald-700 px-4 text-sm font-bold text-white hover:bg-emerald-800"
                  >
                    <Plus className="h-4 w-4" aria-hidden />
                    Crear primera campaña
                  </button>
                )}
              </div>
            )}
          </section>

          {/* BLOQUE 2: MONITOREO AMBIENTAL (SUELO Y CLIMA SEPARADOS) */}
          <section className="space-y-4" aria-labelledby="estado-parcela">
            <div>
              <h2
                id="estado-parcela"
                className="flex items-center gap-2 text-xl font-bold text-stone-900"
              >
                <IconoEstado className="h-6 w-6 shrink-0 text-emerald-700" aria-hidden />
                2. Monitoreo de suelo y clima (registro por dominio)
              </h2>
              <p className="mt-1 text-sm text-stone-600">
                Registra las mediciones físicas y ambientales de la parcela sin mezclarlas con las
                variables de manejo de campaña.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <TarjetaDominioMonitoreo
                titulo="Suelo (Acidez y nutrientes N-P-K)"
                descripcion="Análisis de laboratorio o humedad medida en campo: pH, materia orgánica, humedad, nitrógeno, fósforo y potasio."
                icono={Layers}
                area={areaSuelo}
                botonLabel="Agregar datos de suelo"
                onAccion={puedeRegistrarActividad ? () => setFormMonitoreo("suelo") : undefined}
              />
              <TarjetaDominioMonitoreo
                titulo="Clima (Condición diaria y lluvia)"
                descripcion="Registro climático diario y acumulación de precipitaciones en pluviómetro (últimos 30 días)."
                icono={CloudSun}
                area={areaClima}
                botonLabel="Anotar clima"
                onAccion={puedeRegistrarActividad ? () => setFormMonitoreo("clima") : undefined}
              />
            </div>

            {errorEstado ? (
              <p className="text-red-700">{errorEstado}</p>
            ) : resumenEstado ? (
              <PanelEstadoParcela
                resumen={resumenEstado}
                ocultarEstimacion
                acciones={
                  puedeRegistrarActividad
                    ? {
                        SUELO: (
                          <BotonCargar onClick={() => setFormMonitoreo("suelo")}>
                            Agregar datos de suelo
                          </BotonCargar>
                        ),
                        CLIMA: (
                          <BotonCargar onClick={() => setFormMonitoreo("clima")}>
                            Anotar clima
                          </BotonCargar>
                        ),
                      }
                    : undefined
                }
              />
            ) : (
              <p className="text-stone-600">Cargando el estado detallado de la parcela...</p>
            )}
          </section>

          {/* BLOQUE 3: CAMPAÑAS Y BITÁCORA DE ACTIVIDADES */}
          <section className="space-y-3" aria-labelledby="bloque-campanas">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2
                id="bloque-campanas"
                className="flex items-center gap-2 text-xl font-bold text-stone-900"
              >
                <CalendarRange className="h-6 w-6 shrink-0 text-emerald-700" aria-hidden />
                3. Historial de campañas y bitácora de actividades
                <Ayuda texto="Una campaña es un ciclo de cultivo en esta parcela: desde la siembra hasta la cosecha." />
              </h2>
              {esJefe && (
                <button
                  onClick={() => setMostrarFormCampana(true)}
                  title="Crear una campaña nueva en esta parcela"
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
                >
                  <Plus className="h-4 w-4" aria-hidden />
                  Nueva campaña
                </button>
              )}
            </div>

            <div className="space-y-3">
              {campanas.length === 0 && (
                <p className="text-sm text-stone-500">Todavía no hay campañas registradas.</p>
              )}
              {campanas.map((campana) => (
                <div key={campana.id} className="rounded-lg border border-stone-200 bg-white">
                  <button
                    onClick={() => toggleCampana(campana.id)}
                    className="flex min-h-11 w-full items-center justify-between px-5 py-4 text-left"
                  >
                    <div>
                      <p className="font-medium text-stone-900">
                        {campana.temporada} · {cultivoNombre(campana.cultivoId)}
                      </p>
                      <p className="text-sm text-stone-500">
                        {formatearFecha(campana.fechaInicio)} – {formatearFecha(campana.fechaFin)}
                      </p>
                    </div>
                    <BadgeEstadoCampana estado={campana.estado} />
                  </button>

                  {campanaAbierta === campana.id && (
                    <div className="border-t border-stone-100 px-5 py-4">
                      {esJefe && (
                        <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
                          <span className="inline-flex items-center gap-1 text-stone-500">
                            Cambiar estado:
                            <Ayuda texto="Pasa la campaña a otra etapa: planificada, en curso o cosechada." />
                          </span>
                          {ESTADOS.map((estado) => (
                            <button
                              key={estado}
                              disabled={estado === campana.estado}
                              onClick={() => cambiarEstado(campana, estado)}
                              className="min-h-11 rounded-md border border-stone-300 px-2.5 py-1 text-xs text-stone-700 hover:bg-stone-100 disabled:opacity-40"
                            >
                              {ESTADO_CAMPANA_LABEL[estado]}
                            </button>
                          ))}
                          <button
                            onClick={() => eliminarCampana(campana)}
                            title="Eliminar la campaña (pide confirmación)"
                            className="ml-auto inline-flex min-h-11 items-center gap-1 text-xs text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden />
                            Eliminar campaña
                          </button>
                        </div>
                      )}

                      <div className="mb-4 rounded-lg border border-stone-200 bg-stone-50 p-3 sm:p-4">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <h3 className="text-sm font-semibold text-stone-900">
                              Variables del modelo (siembra) y cosecha
                            </h3>
                            <p className="text-xs text-stone-600">
                              Superficie, variedad y fecha de siembra alimentan la estimación en
                              tiempo real.
                            </p>
                          </div>
                          {puedeRegistrarActividad && (
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setModalRegistroCosecha({ campana, modo: "siembra" })
                                }
                                className="inline-flex min-h-11 items-center gap-1.5 rounded-md border-2 border-emerald-700 bg-white px-3 text-xs font-bold text-emerald-800 hover:bg-emerald-50"
                              >
                                <SlidersHorizontal className="h-4 w-4" aria-hidden />
                                Variables de siembra / Impacto
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setModalRegistroCosecha({ campana, modo: "cosecha" })
                                }
                                className="inline-flex min-h-11 items-center gap-1.5 rounded-md border-2 border-stone-400 bg-white px-3 text-xs font-bold text-stone-800 hover:bg-stone-100"
                              >
                                <PackageCheck className="h-4 w-4" aria-hidden />
                                Registrar cosecha
                              </button>
                            </div>
                          )}
                        </div>

                        {registroCosecha && registroCosecha.campanaId === campana.id ? (
                          <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-stone-700 sm:grid-cols-2">
                            <div className="rounded-md border border-stone-200 bg-white px-3 py-2">
                              <p className="font-semibold text-stone-900">Siembra</p>
                              <p>
                                {registroCosecha.haSembradas} ha ·{" "}
                                {registroCosecha.variedad ?? "Sin variedad"} ·{" "}
                                {formatearFecha(registroCosecha.fechaSiembra)}
                              </p>
                            </div>
                            <div className="rounded-md border border-stone-200 bg-white px-3 py-2">
                              <p className="font-semibold text-stone-900">Cosecha real</p>
                              {registroCosecha.toneladas !== null &&
                              registroCosecha.haCosechadas !== null &&
                              registroCosecha.haCosechadas > 0 ? (
                                <p>
                                  {registroCosecha.toneladas} t en {registroCosecha.haCosechadas} ha
                                  (
                                  {(
                                    registroCosecha.toneladas / registroCosecha.haCosechadas
                                  ).toFixed(2)}{" "}
                                  t/ha) · {formatearFecha(registroCosecha.fechaCosecha)}
                                </p>
                              ) : (
                                <p className="text-stone-500">Pendiente de cosecha.</p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <p className="mt-2 text-xs text-stone-600">
                            Sin variables de siembra cargadas todavía para esta campaña.
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-stone-900">
                          Actividades
                          <Ayuda texto="Labores de campo de esta campaña. Los registros no se editan: si hubo un error, se corrige con un registro nuevo." />
                        </h3>
                        {puedeRegistrarActividad && (
                          <button
                            onClick={() => {
                              setCorrigiendo(null);
                              setMostrarFormActividad(true);
                            }}
                            title="Registrar una labor de campo en esta campaña"
                            className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-emerald-700 hover:text-emerald-800"
                          >
                            <Plus className="h-4 w-4" aria-hidden />
                            Registrar actividad
                          </button>
                        )}
                      </div>

                      <ul className="mt-3 space-y-2">
                        {actividades.length === 0 && (
                          <p className="text-sm text-stone-500">Sin actividades registradas.</p>
                        )}
                        {actividades.map((actividad) => (
                          <li
                            key={actividad.id}
                            className={`rounded-md border px-3 py-2 text-sm ${
                              actividad.vigente
                                ? "border-stone-200"
                                : "border-stone-100 bg-stone-50 text-stone-400 line-through"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="inline-flex flex-wrap items-center gap-1.5 font-medium">
                                <IconoActividad tipo={actividad.tipo} />
                                #{actividad.secuencia} {TIPO_ACTIVIDAD_LABEL[actividad.tipo]} ·{" "}
                                {formatearFecha(actividad.fecha)}
                                {actividad.tipo === "COSECHA" &&
                                  actividad.rendimientoTnHa !== null && (
                                    <> · {actividad.rendimientoTnHa} t/ha</>
                                  )}
                              </span>
                              {actividad.vigente && puedeRegistrarActividad && (
                                <button
                                  onClick={() => {
                                    setCorrigiendo(actividad);
                                    setMostrarFormActividad(true);
                                  }}
                                  title="Registrar una corrección: el registro original se conserva"
                                  className="inline-flex min-h-11 shrink-0 items-center gap-1 text-xs font-medium text-amber-700 hover:text-amber-900 no-underline"
                                >
                                  <Pencil className="h-3.5 w-3.5" aria-hidden />
                                  Corregir
                                </button>
                              )}
                            </div>
                            <p className={actividad.vigente ? "text-stone-600" : ""}>
                              {actividad.descripcion}
                            </p>
                            {!actividad.vigente && (
                              <p className="text-xs italic text-stone-400">
                                Reemplazada por una corrección
                              </p>
                            )}
                            {actividad.correccionDeId && (
                              <p className="text-xs text-amber-700 no-underline">
                                Corrige a #
                                {actividades.find((a) => a.id === actividad.correccionDeId)
                                  ?.secuencia ?? "?"}
                                {actividad.motivoCorreccion && `: ${actividad.motivoCorreccion}`}
                              </p>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* TAB 2: ESTIMACIÓN DE RENDIMIENTO */}
      {pestanaActiva === "estimacion" && (
        <div
          id="panel-estimacion"
          role="tabpanel"
          aria-labelledby="tab-estimacion"
          className="space-y-4"
        >
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-xl font-bold text-stone-900">
              <LineChart className="h-6 w-6 shrink-0 text-emerald-700" aria-hidden />
              Estimación de rendimiento e impacto en campaña
            </h2>
          </div>

          {campanaParaEstimar ? (
            <EstimacionComponente
              parcelaId={parcela.id}
              campanaId={campanaParaEstimar.id}
              temporada={campanaParaEstimar.temporada}
              cultivoNombre={cultivoNombre(campanaParaEstimar.cultivoId)}
              hectareasParcela={parcela.hectareas}
              versionRecarga={versionEstimacion}
              onEditarVariablesSiembra={
                puedeRegistrarActividad
                  ? () => setModalRegistroCosecha({ campana: campanaParaEstimar, modo: "siembra" })
                  : undefined
              }
              onIrATabRegistro={() => setPestanaActiva("registro")}
            />
          ) : (
            <div className="space-y-3 rounded-xl border-2 border-dashed border-sindatos-borde bg-sindatos-fondo p-6 text-sindatos-texto">
              <p className="text-lg font-bold">Todavía no hay una campaña para estimar</p>
              <p className="text-sm">
                Crea una campaña agrícola y registra las variables de siembra en el Tab 1 (o usa el
                botón de Modo Desarrollo) para visualizar el rendimiento estimado y su impacto.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setPestanaActiva("registro")}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-md border-2 border-stone-400 bg-white px-4 text-sm font-bold text-stone-800 hover:bg-stone-50"
                >
                  ← Ir a Estado de la Parcela / Registro
                </button>
                {esJefe && (
                  <button
                    type="button"
                    onClick={() => setMostrarFormCampana(true)}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-md bg-emerald-700 px-4 text-sm font-bold text-white hover:bg-emerald-800"
                  >
                    <Plus className="h-4 w-4" aria-hidden />
                    Nueva campaña
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {formMonitoreo === "suelo" && (
        <SueloForm
          parcelaId={parcelaId}
          onClose={() => setFormMonitoreo(null)}
          onSaved={alGuardarMonitoreo}
        />
      )}
      {formMonitoreo === "clima" && (
        <ClimaForm
          parcelaId={parcelaId}
          onClose={() => setFormMonitoreo(null)}
          onSaved={alGuardarMonitoreo}
        />
      )}
      {mostrarFormCampana && (
        <CampanaForm
          parcelaId={parcelaId}
          cultivos={cultivos}
          onClose={() => setMostrarFormCampana(false)}
          onSaved={() => {
            setMostrarFormCampana(false);
            cargarCampanas();
          }}
        />
      )}
      {mostrarFormActividad && campanaAbierta && (
        <ActividadForm
          parcelaId={parcela.id}
          campanaId={campanaAbierta}
          hectareasParcela={parcela.hectareas}
          registroCosecha={
            registroCosecha && registroCosecha.campanaId === campanaAbierta
              ? registroCosecha
              : null
          }
          corrigiendo={corrigiendo}
          onClose={() => setMostrarFormActividad(false)}
          onSaved={() => {
            setMostrarFormActividad(false);
            cargarActividades(campanaAbierta);
            cargarRegistroCosecha(campanaAbierta);
            cargarCampanas();
            setVersionEstimacion((v) => v + 1);
          }}
        />
      )}
      {modalRegistroCosecha && (
        <RegistroCosechaForm
          parcelaId={parcela.id}
          campana={modalRegistroCosecha.campana}
          hectareasParcela={parcela.hectareas}
          registro={
            registroCosecha && registroCosecha.campanaId === modalRegistroCosecha.campana.id
              ? registroCosecha
              : registroActivo && registroActivo.campanaId === modalRegistroCosecha.campana.id
                ? registroActivo
                : null
          }
          modo={modalRegistroCosecha.modo}
          onClose={() => setModalRegistroCosecha(null)}
          onSaved={() => {
            const id = modalRegistroCosecha.campana.id;
            setModalRegistroCosecha(null);
            cargarRegistroCosecha(id);
            cargarCampanas();
            setVersionEstimacion((v) => v + 1);
          }}
        />
      )}
    </div>
  );
}
