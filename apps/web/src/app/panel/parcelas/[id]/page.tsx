"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarRange,
  ClipboardList,
  CloudRain,
  Eye,
  LineChart,
  MapPin,
  Pencil,
  Plus,
  ShieldCheck,
  ShieldAlert,
  SlidersHorizontal,
  Sprout,
  Tag as IconoTag,
  TestTubes,
  Trash2,
} from "lucide-react";
import { BadgeEstadoCampana } from "@/components/badge";
import {
  EstimacionComponente,
  type PuntoHistoricoRendimiento,
} from "@/components/estado/estimacion-componente";
import { ActionMenu, type AccionMenu } from "@/components/ui/action-menu";
import { ActivityItem } from "@/components/ui/activity-item";
import { Button } from "@/components/ui/button";
import { CropChip } from "@/components/ui/crop-chip";
import { ParcelThumb } from "@/components/ui/parcel-thumb";
import { RangeBar } from "@/components/ui/range-bar";
import { Tag } from "@/components/ui/tag";
import { api, apiErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatearFecha } from "@/lib/format";
import { elegirCampanaActual } from "@/lib/parcelas";
import type { RegistroCosechaCampana } from "@/lib/prediccion";
import {
  ESTADO_CAMPANA_LABEL,
  type Actividad,
  type AnalisisSuelo,
  type Campana,
  type Cultivo,
  type EstadoCampana,
  type HistoricoItem,
  type Parcela,
  type RegistroClima,
  type ReporteCampana,
  type ResultadoVerificacion,
  type TipoActividad,
} from "@/lib/types";
import { ParcelaForm } from "../parcela-form";
import { ActividadForm } from "./actividad-form";
import { CampanaForm } from "./campana-form";
import { ClimaForm } from "./clima-form";
import {
  evaluarRegistroParcela,
  type DimensionEstadoRegistro,
  type EstadoRegistroItem,
} from "./estado-registro-parcela";
import { FotosParcelaSeccion } from "./fotos-parcela-seccion";
import {
  BadgeEstadoRegistro,
  ModalDetalleCompletitud,
  ModalHistorialClima,
  ModalHistorialSuelo,
  ModalManejoCultivo,
  ModalMapaParcela,
  ModalObservaciones,
} from "./modales-variables";
import { RegistroCosechaForm } from "./registro-cosecha-form";
import { SueloForm } from "./suelo-form";

const ESTADOS_CAMPANA: EstadoCampana[] = ["PLANIFICADA", "EN_CURSO", "COSECHADA"];
type PestanaParcela = "registro" | "estimacion";
type ModalCategoria = "suelo" | "clima" | "manejo" | "observaciones" | null;

function BloqueAmbiente({
  titulo,
  resumen,
  estado,
  icono: Icono,
  puedeEditar,
  etiquetaConsultar,
  etiquetaRegistrar,
  onConsultar,
  onRegistrar,
  children,
}: {
  titulo: string;
  resumen: string;
  estado: EstadoRegistroItem;
  icono: typeof TestTubes;
  puedeEditar: boolean;
  etiquetaConsultar: string;
  etiquetaRegistrar?: string;
  onConsultar: () => void;
  onRegistrar?: () => void;
  children?: React.ReactNode;
}) {
  const sinDatos = estado === "SIN_DATOS";
  return (
    <div
      className={`rounded-tarjeta p-3.5 transition-colors ${
        sinDatos
          ? "border-2 border-dashed border-sindatos-borde bg-fondo-suave/50"
          : "border border-borde bg-fondo-suave/60"
      }`}
    >
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-marca-suave text-marca">
            <Icono className="h-4 w-4" aria-hidden />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-tinta">{titulo}</h3>
              <BadgeEstadoRegistro estado={estado} tamano="sm" />
            </div>
            <p className="mt-0.5 text-xs text-tinta-suave">{resumen}</p>
          </div>
        </div>
      </div>

      {children && <div className="mt-3 border-t border-borde/70 pt-3">{children}</div>}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onConsultar}
          className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-control border border-borde bg-white px-3 text-sm font-semibold text-tinta hover:bg-marca-suave hover:text-marca"
        >
          <Eye className="h-4 w-4 shrink-0" aria-hidden />
          {etiquetaConsultar}
        </button>
        {puedeEditar && onRegistrar && etiquetaRegistrar && (
          <button
            type="button"
            onClick={onRegistrar}
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-control bg-marca px-3.5 text-sm font-semibold text-white hover:bg-marca-hover"
          >
            <Plus className="h-4 w-4 shrink-0" aria-hidden />
            {etiquetaRegistrar}
          </button>
        )}
      </div>
    </div>
  );
}

function ParcelaPrivadaDetalleContenido() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const parcelaId = params.id;
  const { usuario } = useAuth();
  const rol = usuario?.rol;
  const esJefe = rol === "JEFE";
  const puedeRegistrarActividad = rol === "JEFE" || rol === "OPERATIVO";
  const puedeVerReportesIntegridad = rol === "JEFE" || rol === "CONTABILIDAD";

  const [pestanaActiva, setPestanaActiva] = useState<PestanaParcela>(
    searchParams.get("tab") === "estimacion" ? "estimacion" : "registro",
  );

  // Datos principales de la parcela
  const [parcela, setParcela] = useState<Parcela | null>(null);
  const [cultivos, setCultivos] = useState<Cultivo[]>([]);
  const [campanas, setCampanas] = useState<Campana[]>([]);
  const [suelo, setSuelo] = useState<AnalisisSuelo[]>([]);
  const [clima, setClima] = useState<RegistroClima[]>([]);
  const [integridad, setIntegridad] = useState<ResultadoVerificacion | null>(null);
  const [historicoReportes, setHistoricoReportes] = useState<HistoricoItem[]>([]);
  const [registrosPorCampana, setRegistrosPorCampana] = useState<
    Record<string, RegistroCosechaCampana | null>
  >({});

  // Selección de campaña y actividades de esa campaña
  const [campanaManualId, setCampanaManualId] = useState<string | null>(null);
  const [actividadesState, setActividadesState] = useState<{
    campanaId: string;
    version: number;
    items: Actividad[];
  } | null>(null);

  // Versiones para recarga reactiva
  const [versionDatos, setVersionDatos] = useState(0);
  const [versionEstimacion, setVersionEstimacion] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Estado de modales (ningún formulario abierto en pantalla principal)
  const [modalEditarParcela, setModalEditarParcela] = useState(false);
  const [modalMapa, setModalMapa] = useState(false);
  const [modalCategoria, setModalCategoria] = useState<ModalCategoria>(null);
  const [modalCompletitud, setModalCompletitud] = useState(false);
  const [formMonitoreo, setFormMonitoreo] = useState<"suelo" | "clima" | null>(null);
  const [mostrarFormCampana, setMostrarFormCampana] = useState(false);
  const [modalActividad, setModalActividad] = useState<{
    corrigiendo: Actividad | null;
    tipoInicial?: TipoActividad;
  } | null>(null);
  const [modalRegistroCosecha, setModalRegistroCosecha] = useState<{
    campana: Campana;
    modo: "siembra" | "cosecha";
  } | null>(null);

  const cargarBase = useCallback(() => {
    Promise.all([
      api.get<Parcela>(`/parcelas/${parcelaId}`).then((res) => res.data),
      api.get<Campana[]>("/campanas", { params: { parcelaId } }).then((res) => res.data),
      api.get<Cultivo[]>("/cultivos").then((res) => res.data),
      api.get<AnalisisSuelo[]>("/monitoreo/suelo", { params: { parcelaId } }).then((res) => res.data),
      api.get<RegistroClima[]>("/monitoreo/clima", { params: { parcelaId } }).then((res) => res.data),
    ])
      .then(([p, cs, cults, s, c]) => {
        setParcela(p);
        setCampanas(cs);
        setCultivos(cults);
        setSuelo(s);
        setClima(c);
        setError(null);
      })
      .catch((err) => {
        setError(apiErrorMessage(err, "No se pudo cargar el detalle de la parcela"));
      });
  }, [parcelaId]);

  useEffect(() => {
    cargarBase();
  }, [cargarBase, versionDatos]);

  // Cargar integridad y reportes históricos si el rol lo permite
  useEffect(() => {
    if (!puedeVerReportesIntegridad) return;
    let cancelado = false;
    Promise.all([
      api
        .get<ResultadoVerificacion>(`/integridad/parcela/${parcelaId}`)
        .then((res) => res.data)
        .catch(() => null),
      api
        .get<HistoricoItem[]>("/reportes/historico", { params: { parcelaId } })
        .then((res) => res.data)
        .catch(() => []),
    ]).then(([resInt, resHist]) => {
      if (cancelado) return;
      if (resInt) setIntegridad(resInt);
      setHistoricoReportes(resHist);
    });
    return () => {
      cancelado = true;
    };
  }, [parcelaId, puedeVerReportesIntegridad, versionDatos]);

  // Cargar registros de manejo/cosecha para las campañas de esta parcela
  useEffect(() => {
    if (campanas.length === 0) return;
    let cancelado = false;
    Promise.all(
      campanas.map((c) =>
        api
          .get<RegistroCosechaCampana | null | "">(`/campanas/${c.id}/registro-cosecha`)
          .then((res) => [
            c.id,
            res.data && typeof res.data === "object" ? res.data : null,
          ] as const)
          .catch(() => [c.id, null] as const),
      ),
    ).then((pares) => {
      if (cancelado) return;
      const mapa: Record<string, RegistroCosechaCampana | null> = {};
      for (const [id, reg] of pares) mapa[id] = reg;
      setRegistrosPorCampana(mapa);
    });
    return () => {
      cancelado = true;
    };
  }, [campanas, versionDatos, versionEstimacion]);

  const campanaSeleccionada = useMemo(() => {
    if (campanas.length === 0) return null;
    if (campanaManualId) {
      const encontrada = campanas.find((c) => c.id === campanaManualId);
      if (encontrada) return encontrada;
    }
    return (
      elegirCampanaActual(campanas) ??
      [...campanas].sort((a, b) => b.fechaInicio.localeCompare(a.fechaInicio))[0] ??
      null
    );
  }, [campanas, campanaManualId]);

  const campanaActivaId = campanaSeleccionada?.id ?? null;

  // Cargar actividades de la campaña seleccionada de forma asíncrona segura
  useEffect(() => {
    if (!campanaActivaId || !rol) return;
    let cancelado = false;

    const solicitud =
      rol === "CONTABILIDAD"
        ? api.get<ReporteCampana>(`/reportes/campanas/${campanaActivaId}`).then(({ data }) =>
            data.actividades.map((a) => ({
              id: a.id,
              secuencia: a.secuencia,
              campanaId: campanaActivaId,
              tipo: a.tipo,
              fecha: a.fecha,
              descripcion: a.descripcion,
              insumo: a.insumo,
              cantidad: a.cantidad,
              unidad: a.unidad,
              responsableId: "",
              tercerizado: a.tercerizado,
              maquinariaUtilizada: null,
              rendimientoTnHa: a.rendimientoTnHa,
              correccionDeId: a.correccionDeId,
              motivoCorreccion: null,
              hash: "",
              hashAnterior: null,
              createdAt: a.fecha,
              vigente: true,
            })),
          )
        : api
            .get<Actividad[]>("/actividades", { params: { campanaId: campanaActivaId } })
            .then((res) => res.data);

    solicitud
      .then((items) => {
        if (!cancelado) {
          setActividadesState({
            campanaId: campanaActivaId,
            version: versionDatos,
            items,
          });
        }
      })
      .catch(() => {
        if (!cancelado) {
          setActividadesState({
            campanaId: campanaActivaId,
            version: versionDatos,
            items: [],
          });
        }
      });

    return () => {
      cancelado = true;
    };
  }, [campanaActivaId, rol, versionDatos]);

  const actividades = useMemo(
    () =>
      campanaActivaId && actividadesState?.campanaId === campanaActivaId
        ? actividadesState.items
        : [],
    [campanaActivaId, actividadesState],
  );
  const cargandoActividades = Boolean(
    campanaActivaId &&
      rol &&
      (!actividadesState ||
        actividadesState.campanaId !== campanaActivaId ||
        actividadesState.version !== versionDatos),
  );

  const cultivoNombre = useCallback(
    (cultivoId: string): string => cultivos.find((c) => c.id === cultivoId)?.nombre ?? "—",
    [cultivos],
  );

  const registroActivo = campanaActivaId ? registrosPorCampana[campanaActivaId] ?? null : null;

  const evaluacion = useMemo(() => {
    if (!parcela) return null;
    return evaluarRegistroParcela({
      parcela,
      campanaActiva: campanaSeleccionada,
      cultivoNombre: campanaSeleccionada ? cultivoNombre(campanaSeleccionada.cultivoId) : null,
      actividadesCampana: actividades,
      suelo,
      clima,
      registroActivo,
    });
  }, [parcela, campanaSeleccionada, cultivoNombre, actividades, suelo, clima, registroActivo]);

  // Historial real combinado para el Tab 2 (funciona para todos los roles)
  const campanasHistoricas = useMemo<PuntoHistoricoRendimiento[]>(() => {
    const mapa = new Map<string, PuntoHistoricoRendimiento>();

    for (const h of historicoReportes) {
      const reg = registrosPorCampana[h.campanaId];
      mapa.set(h.campanaId, {
        campanaId: h.campanaId,
        temporada: h.temporada,
        fecha: h.fecha,
        rendimientoTnHa: h.rendimientoTnHa,
        produccionTn: reg?.toneladas ?? null,
        cultivoNombre: h.cultivoNombre,
      });
    }

    for (const c of campanas) {
      if (mapa.has(c.id)) continue;
      const reg = registrosPorCampana[c.id];
      if (
        reg &&
        reg.toneladas !== null &&
        reg.haCosechadas !== null &&
        reg.haCosechadas > 0
      ) {
        mapa.set(c.id, {
          campanaId: c.id,
          temporada: c.temporada,
          fecha: reg.fechaCosecha ?? c.fechaFin ?? c.fechaInicio,
          rendimientoTnHa: Math.round((reg.toneladas / reg.haCosechadas) * 100) / 100,
          produccionTn: reg.toneladas,
          cultivoNombre: cultivoNombre(c.cultivoId),
        });
      }
    }

    return Array.from(mapa.values());
  }, [historicoReportes, campanas, registrosPorCampana, cultivoNombre]);

  async function cambiarEstadoCampana(campana: Campana, nuevoEstado: EstadoCampana) {
    try {
      await api.patch(`/campanas/${campana.id}`, { estado: nuevoEstado });
      setVersionDatos((v) => v + 1);
      setVersionEstimacion((v) => v + 1);
    } catch (err) {
      alert(apiErrorMessage(err, "No se pudo cambiar el estado de la campaña"));
    }
  }

  async function eliminarCampana(campana: Campana) {
    if (!confirm(`¿Eliminar la campaña "${campana.temporada}"?`)) return;
    try {
      await api.delete(`/campanas/${campana.id}`);
      if (campanaManualId === campana.id) setCampanaManualId(null);
      setVersionDatos((v) => v + 1);
      setVersionEstimacion((v) => v + 1);
    } catch (err) {
      alert(apiErrorMessage(err, "No se pudo eliminar la campaña"));
    }
  }

  function ejecutarAccionFaltante(id: DimensionEstadoRegistro["id"]) {
    setModalCompletitud(false);
    if (id === "general") {
      if (!campanaSeleccionada) {
        setMostrarFormCampana(true);
      } else {
        setModalEditarParcela(true);
      }
      return;
    }
    if (id === "actividades") {
      setModalActividad({ corrigiendo: null, tipoInicial: "SIEMBRA" });
      return;
    }
    if (id === "suelo") {
      setFormMonitoreo("suelo");
      return;
    }
    if (id === "clima") {
      setFormMonitoreo("clima");
      return;
    }
    if (id === "manejo" && campanaSeleccionada) {
      setModalRegistroCosecha({ campana: campanaSeleccionada, modo: "siembra" });
    }
  }

  if (error) return <p className="text-critico-borde">{error}</p>;
  if (!parcela || !evaluacion) {
    return (
      <div className="rounded-tarjeta border border-borde bg-white p-6 text-sm text-tinta-suave">
        Cargando detalle de la parcela...
      </div>
    );
  }

  const actividadesOrdenadas = [...actividades].sort(
    (a, b) => b.fecha.localeCompare(a.fecha) || b.secuencia - a.secuencia,
  );
  const actividadesVigentesCount = actividades.filter((a) => a.vigente).length;
  const estadoProgresoPct = Math.round((evaluacion.completadas / 5) * 100);
  const mostrarBarraMovilRegistro =
    pestanaActiva === "registro" && puedeRegistrarActividad && Boolean(campanaSeleccionada);

  const accionesJefe: AccionMenu[] = esJefe
    ? [
        ...(campanaSeleccionada
          ? [{ etiqueta: "Nueva campaña", icono: Plus, onClick: () => setMostrarFormCampana(true) }]
          : []),
        { etiqueta: "Editar parcela", icono: Pencil, onClick: () => setModalEditarParcela(true) },
        ...(campanaSeleccionada
          ? [
              {
                etiqueta: "Eliminar campaña",
                icono: Trash2,
                peligro: true,
                onClick: () => eliminarCampana(campanaSeleccionada),
              },
            ]
          : []),
      ]
    : [];

  return (
    <div className={`text-tinta ${mostrarBarraMovilRegistro ? "pb-24 md:pb-0" : ""}`}>
      <div className="mx-auto max-w-6xl space-y-5">
        {/* A. ENCABEZADO COMPACTO ORIENTADO A LA ACCIÓN */}
        <header className="rounded-tarjeta border border-borde bg-white p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/panel/parcelas"
              className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-tinta-suave hover:text-marca"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Volver a parcelas
            </Link>

            <div className="flex flex-wrap items-center gap-2">
              {puedeRegistrarActividad && campanaSeleccionada ? (
                <button
                  type="button"
                  onClick={() => setModalActividad({ corrigiendo: null })}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-control bg-marca px-4 text-sm font-semibold text-white hover:bg-marca-hover"
                >
                  <Plus className="h-4 w-4" aria-hidden />
                  Registrar actividad
                </button>
              ) : (
                esJefe &&
                !campanaSeleccionada && (
                  <button
                    type="button"
                    onClick={() => setMostrarFormCampana(true)}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-control bg-marca px-4 text-sm font-semibold text-white hover:bg-marca-hover"
                  >
                    <Plus className="h-4 w-4" aria-hidden />
                    Nueva campaña
                  </button>
                )
              )}

              {parcela.poligono && (
                <button
                  type="button"
                  onClick={() => setModalMapa(true)}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-control border border-borde bg-white px-3.5 text-sm font-semibold text-tinta hover:bg-fondo-suave"
                >
                  <MapPin className="h-4 w-4 text-marca" aria-hidden />
                  Ver mapa
                </button>
              )}

              {esJefe && accionesJefe.length > 0 && (
                <ActionMenu acciones={accionesJefe} etiqueta="Más acciones de la parcela" />
              )}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <ParcelThumb poligono={parcela.poligono} tamano={48} />
            <h1 className="text-2xl font-semibold leading-tight text-tinta sm:text-[28px]">
              {parcela.nombre}
            </h1>
            {parcela.disponibleParaPreventa && (
              <Tag tono="marca" icono={IconoTag}>
                Disponible para preventa
              </Tag>
            )}
            {integridad && integridad.totalVerificadas > 0 && (
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                  integridad.valido
                    ? "border-marca/30 bg-marca-suave text-marca"
                    : "border-critico-borde/40 bg-critico-fondo text-critico-borde"
                }`}
              >
                {integridad.valido ? (
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
                ) : (
                  <ShieldAlert className="h-3.5 w-3.5" aria-hidden />
                )}
                {integridad.valido
                  ? `${integridad.totalVerificadas} registros íntegros`
                  : "Alerta de integridad SHA-256"}
              </span>
            )}
          </div>

          {/* Franja compacta de metadatos y selector de campaña / etapa */}
          <div className="mt-4 flex flex-col gap-3 border-t border-borde pt-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              <span className="inline-flex items-center gap-1.5 text-tinta-suave">
                <MapPin className="h-4 w-4 shrink-0 text-marca" aria-hidden />
                <span className="font-semibold text-tinta">
                  {parcela.ubicacionTexto || "Sin ubicación"}
                </span>
              </span>
              <span className="font-semibold text-tinta">{parcela.hectareas} ha</span>
              <CropChip
                cultivo={campanaSeleccionada ? cultivoNombre(campanaSeleccionada.cultivoId) : null}
              />
              {registroActivo?.variedad?.trim() && (
                <span className="text-tinta-suave">
                  Variedad:{" "}
                  <strong className="font-semibold text-tinta">
                    {registroActivo.variedad.trim()}
                  </strong>
                </span>
              )}
              {registroActivo?.fechaSiembra && (
                <span className="text-tinta-suave">
                  Siembra:{" "}
                  <strong className="font-semibold text-tinta">
                    {formatearFecha(registroActivo.fechaSiembra)}
                  </strong>
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {campanaSeleccionada ? (
                <>
                  {campanas.length > 1 ? (
                    <select
                      aria-label="Seleccionar campaña de la parcela"
                      value={campanaSeleccionada.id}
                      onChange={(e) => setCampanaManualId(e.target.value)}
                      className="min-h-11 rounded-control border border-borde bg-fondo-suave px-3 text-sm font-semibold text-tinta"
                    >
                      {campanas.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.temporada} ({ESTADO_CAMPANA_LABEL[c.estado]})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="inline-flex min-h-11 items-center rounded-control border border-borde bg-fondo-suave px-3 text-sm font-semibold text-tinta">
                      {campanaSeleccionada.temporada}
                    </span>
                  )}

                  {esJefe ? (
                    <div className="flex items-center gap-2">
                      <BadgeEstadoCampana estado={campanaSeleccionada.estado} />
                      <select
                        aria-label="Cambiar etapa de la campaña"
                        value={campanaSeleccionada.estado}
                        onChange={(e) =>
                          cambiarEstadoCampana(campanaSeleccionada, e.target.value as EstadoCampana)
                        }
                        className="min-h-11 rounded-control border border-borde bg-white px-2.5 text-sm font-medium text-tinta"
                      >
                        {ESTADOS_CAMPANA.map((estado) => (
                          <option key={estado} value={estado}>
                            Etapa: {ESTADO_CAMPANA_LABEL[estado]}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <BadgeEstadoCampana estado={campanaSeleccionada.estado} />
                  )}
                </>
              ) : (
                <span className="text-sm font-medium text-tinta-suave">Sin campaña activa</span>
              )}
            </div>
          </div>
        </header>

        {/* NAVEGACIÓN PRINCIPAL EN 2 PESTAÑAS */}
        <div
          role="tablist"
          aria-label="Vistas principales de la parcela"
          className="grid grid-cols-1 gap-2 rounded-tarjeta border border-borde bg-white p-1.5 shadow-tarjeta sm:grid-cols-2"
        >
          <button
            id="tab-registro"
            type="button"
            role="tab"
            aria-selected={pestanaActiva === "registro"}
            aria-controls="panel-registro"
            onClick={() => setPestanaActiva("registro")}
            className={`flex min-h-11 items-center justify-center gap-2 rounded-control px-4 text-sm font-bold transition-colors sm:text-base ${
              pestanaActiva === "registro"
                ? "bg-marca text-white"
                : "text-tinta-suave hover:bg-fondo-suave hover:text-tinta"
            }`}
          >
            <ClipboardList className="h-5 w-5 shrink-0" aria-hidden />
            <span>Registro</span>
            {campanaSeleccionada && (
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  pestanaActiva === "registro"
                    ? "bg-white/20 text-white"
                    : "bg-fondo-suave text-tinta-suave"
                }`}
              >
                {actividadesVigentesCount}
              </span>
            )}
          </button>

          <button
            id="tab-estimacion"
            type="button"
            role="tab"
            aria-selected={pestanaActiva === "estimacion"}
            aria-controls="panel-estimacion"
            onClick={() => setPestanaActiva("estimacion")}
            className={`flex min-h-11 items-center justify-center gap-2 rounded-control px-4 text-sm font-bold transition-colors sm:text-base ${
              pestanaActiva === "estimacion"
                ? "bg-marca text-white"
                : "text-tinta-suave hover:bg-fondo-suave hover:text-tinta"
            }`}
          >
            <LineChart className="h-5 w-5 shrink-0" aria-hidden />
            Rendimiento estimado
          </button>
        </div>

        {/* PESTAÑA 1: REGISTRO */}
        {pestanaActiva === "registro" && (
          <div
            id="panel-registro"
            role="tabpanel"
            aria-labelledby="tab-registro"
            className="space-y-6"
          >
            {/* Barra compacta de avance del registro (detalle completo en modal) */}
            <section
              aria-labelledby="heading-estado-registro"
              className="flex flex-col gap-3 rounded-tarjeta border border-borde bg-white px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5"
            >
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 id="heading-estado-registro" className="text-sm font-bold text-tinta">
                    Registro de la parcela · {evaluacion.completadas} de 5 completas
                  </h2>
                  <span className="text-xs font-semibold text-tinta-suave">
                    {estadoProgresoPct}%
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-fondo-suave ring-1 ring-borde">
                  <div
                    className="h-full rounded-full bg-marca transition-all duration-300"
                    style={{ width: `${Math.max(6, estadoProgresoPct)}%` }}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => setModalCompletitud(true)}
                className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-control border border-marca/40 bg-marca-suave px-4 text-sm font-bold text-marca hover:bg-marca hover:text-white"
              >
                <SlidersHorizontal className="h-4 w-4 shrink-0" aria-hidden />
                {evaluacion.totalFaltantes > 0
                  ? `Ver faltantes (${evaluacion.totalFaltantes})`
                  : "Ver resumen"}
              </button>
            </section>

            {/* Layout 2 columnas: Actividades primero (campo/móvil) + Ambiente y manejo lateral */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              {/* Columna principal: ACTIVIDADES AGRÍCOLAS */}
              <section
                aria-labelledby="heading-actividades"
                className="rounded-tarjeta border border-borde bg-white p-5 sm:p-6 lg:col-span-7"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2
                      id="heading-actividades"
                      className="flex items-center gap-2 text-lg font-bold text-tinta"
                    >
                      <CalendarRange className="h-5 w-5 text-marca" aria-hidden />
                      Actividades agrícolas
                    </h2>
                    <p className="mt-0.5 text-sm text-tinta-suave">
                      {campanaSeleccionada
                        ? `${actividadesVigentesCount} ${
                            actividadesVigentesCount === 1
                              ? "labor vigente registrada"
                              : "labores vigentes registradas"
                          } en la campaña seleccionada.`
                        : "Selecciona o crea una campaña para registrar labores de campo."}
                    </p>
                  </div>

                  {puedeRegistrarActividad && campanaSeleccionada && (
                    <button
                      type="button"
                      onClick={() => setModalActividad({ corrigiendo: null })}
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-control bg-marca px-4 text-sm font-semibold text-white hover:bg-marca-hover"
                    >
                      <Plus className="h-4 w-4" aria-hidden />
                      Registrar actividad
                    </button>
                  )}
                </div>

                {!campanaSeleccionada ? (
                  <div className="mt-5 rounded-tarjeta border-2 border-dashed border-sindatos-borde bg-fondo-suave p-6 text-center">
                    <p className="text-sm font-semibold text-tinta">
                      No hay una campaña seleccionada todavía.
                    </p>
                    <p className="mt-1 text-xs text-tinta-suave">
                      Crea una campaña agrícola para comenzar la bitácora de siembra, aplicaciones y
                      cosecha.
                    </p>
                    {esJefe && (
                      <button
                        type="button"
                        onClick={() => setMostrarFormCampana(true)}
                        className="mt-4 inline-flex min-h-11 items-center gap-1.5 rounded-control bg-marca px-4 text-sm font-semibold text-white hover:bg-marca-hover"
                      >
                        <Plus className="h-4 w-4" aria-hidden />
                        Crear primera campaña
                      </button>
                    )}
                  </div>
                ) : cargandoActividades ? (
                  <p className="mt-4 text-sm text-tinta-suave">Cargando línea de tiempo...</p>
                ) : actividadesOrdenadas.length === 0 ? (
                  <div className="mt-5 rounded-tarjeta border-2 border-dashed border-sindatos-borde bg-fondo-suave p-6 text-center">
                    <p className="text-sm font-semibold text-tinta">
                      Todavía no hay actividades agrícolas registradas en esta campaña.
                    </p>
                    <p className="mt-1 text-xs text-tinta-suave">
                      Registra siembra, fertilización, fumigación, mediciones de humedad o cosecha
                      para construir la trazabilidad.
                    </p>
                    {puedeRegistrarActividad && (
                      <button
                        type="button"
                        onClick={() =>
                          setModalActividad({ corrigiendo: null, tipoInicial: "SIEMBRA" })
                        }
                        className="mt-4 inline-flex min-h-11 items-center gap-1.5 rounded-control bg-marca px-4 text-sm font-semibold text-white hover:bg-marca-hover"
                      >
                        <Plus className="h-4 w-4" aria-hidden />
                        Registrar primera actividad
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="mt-4 divide-y divide-borde">
                    {actividadesOrdenadas.map((act) => (
                      <ActivityItem
                        key={act.id}
                        tipo={act.tipo}
                        fecha={act.fecha}
                        descripcion={act.descripcion}
                        secuencia={act.secuencia}
                        reemplazada={!act.vigente}
                        acciones={
                          act.vigente && puedeRegistrarActividad ? (
                            <Button
                              variante="secundario"
                              icono={Pencil}
                              onClick={() => setModalActividad({ corrigiendo: act })}
                              title="Registrar corrección sin borrar el historial"
                            >
                              Corregir
                            </Button>
                          ) : undefined
                        }
                        etiquetas={
                          (act.tipo === "COSECHA" && act.rendimientoTnHa !== null) ||
                          act.insumo ||
                          act.cantidad !== null ||
                          act.maquinariaUtilizada ||
                          act.tercerizado ? (
                            <>
                              {act.tipo === "COSECHA" && act.rendimientoTnHa !== null && (
                                <Tag tono="marca">{act.rendimientoTnHa} t/ha</Tag>
                              )}
                              {act.insumo && <Tag>Insumo: {act.insumo}</Tag>}
                              {act.cantidad !== null && (
                                <Tag>
                                  Cantidad: {act.cantidad} {act.unidad ?? ""}
                                </Tag>
                              )}
                              {act.maquinariaUtilizada && <Tag>Equipo: {act.maquinariaUtilizada}</Tag>}
                              {act.tercerizado && <Tag>Servicio tercerizado</Tag>}
                            </>
                          ) : undefined
                        }
                        nota={
                          act.correccionDeId
                            ? `Corrige a #${
                                actividades.find((x) => x.id === act.correccionDeId)?.secuencia ?? "?"
                              }${act.motivoCorreccion ? `: ${act.motivoCorreccion}` : ""}`
                            : undefined
                        }
                      />
                    ))}
                  </div>
                )}
              </section>

              {/* Columna lateral: AMBIENTE Y MANEJO */}
              <section
                aria-labelledby="heading-variables-ambiente"
                className="rounded-tarjeta border border-borde bg-white p-5 lg:col-span-5"
              >
                <div className="mb-4">
                  <h2 id="heading-variables-ambiente" className="text-lg font-bold text-tinta">
                    Ambiente y manejo
                  </h2>
                  <p className="mt-0.5 text-sm text-tinta-suave">
                    Estado resumido y acceso rápido por categoría.
                  </p>
                </div>

                <div className="space-y-3">
                  <BloqueAmbiente
                    titulo="Suelo"
                    resumen={`${evaluacion.sueloConDato}/6 indicadores · ${suelo.length} análisis`}
                    estado={evaluacion.estadoSuelo}
                    icono={TestTubes}
                    puedeEditar={puedeRegistrarActividad}
                    etiquetaConsultar="Historial"
                    etiquetaRegistrar="Registrar"
                    onConsultar={() => setModalCategoria("suelo")}
                    onRegistrar={() => setFormMonitoreo("suelo")}
                  >
                    <div className="space-y-3">
                      {(["ph", "humedad"] as const).map((campo) => {
                        const ind = evaluacion.indicadoresSuelo.find((i) => i.campo === campo);
                        return (
                          <RangeBar
                            key={campo}
                            etiqueta={ind?.etiqueta ?? campo}
                            valor={ind?.valor ?? null}
                            min={0}
                            max={campo === "ph" ? 14 : 100}
                            unidad={campo === "ph" ? "" : "%"}
                            fecha={ind?.fecha}
                          />
                        );
                      })}
                    </div>
                  </BloqueAmbiente>

                  <BloqueAmbiente
                    titulo="Clima"
                    resumen={
                      evaluacion.clima30d.length > 0
                        ? `${evaluacion.clima30d.length} en últimos 30d · ${evaluacion.lluvia30dMm} mm lluvia`
                        : `${clima.length} ${
                            clima.length === 1 ? "registro histórico" : "registros históricos"
                          }`
                    }
                    estado={evaluacion.estadoClima}
                    icono={CloudRain}
                    puedeEditar={puedeRegistrarActividad}
                    etiquetaConsultar="Historial"
                    etiquetaRegistrar="Registrar"
                    onConsultar={() => setModalCategoria("clima")}
                    onRegistrar={() => setFormMonitoreo("clima")}
                  />

                  <BloqueAmbiente
                    titulo="Manejo del cultivo"
                    resumen={
                      campanaSeleccionada
                        ? `${evaluacion.manejoConDato}/3 variables de siembra${
                            registroActivo?.variedad?.trim()
                              ? ` · ${registroActivo.variedad.trim()}`
                              : ""
                          }${
                            registroActivo?.fechaSiembra
                              ? ` · ${formatearFecha(registroActivo.fechaSiembra)}`
                              : ""
                          }`
                        : "Sin campaña activa"
                    }
                    estado={evaluacion.estadoManejo}
                    icono={Sprout}
                    puedeEditar={puedeRegistrarActividad && !!campanaSeleccionada}
                    etiquetaConsultar="Ver detalle"
                    etiquetaRegistrar="Editar siembra"
                    onConsultar={() => setModalCategoria("manejo")}
                    onRegistrar={() =>
                      campanaSeleccionada &&
                      setModalRegistroCosecha({ campana: campanaSeleccionada, modo: "siembra" })
                    }
                  />

                  <BloqueAmbiente
                    titulo="Observaciones"
                    resumen={`${evaluacion.observaciones.length} ${
                      evaluacion.observaciones.length === 1
                        ? "nota registrada"
                        : "notas registradas"
                    }`}
                    estado={evaluacion.estadoObservaciones}
                    icono={ClipboardList}
                    puedeEditar={puedeRegistrarActividad}
                    etiquetaConsultar="Ver notas"
                    onConsultar={() => setModalCategoria("observaciones")}
                  />
                </div>
              </section>
            </div>

            {/* E. FOTOS DE LA PARCELA (Gestión y visibilidad en preventa) */}
            <FotosParcelaSeccion
              parcelaId={parcela.id}
              disponibleParaPreventa={parcela.disponibleParaPreventa}
              puedeEditar={puedeRegistrarActividad}
            />
          </div>
        )}

        {/* Barra fija en celular para registrar labor con 1 toque */}
        {mostrarBarraMovilRegistro && (
          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-borde bg-white/95 px-4 py-3 backdrop-blur-xs md:hidden">
            <button
              type="button"
              onClick={() => setModalActividad({ corrigiendo: null })}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-control bg-marca px-4 text-base font-semibold text-white shadow-tarjeta hover:bg-marca-hover"
            >
              <Plus className="h-5 w-5" aria-hidden />
              Registrar actividad
            </button>
          </div>
        )}

        {/* PESTAÑA 2: RENDIMIENTO ESTIMADO */}
        {pestanaActiva === "estimacion" && (
          <div
            id="panel-estimacion"
            role="tabpanel"
            aria-labelledby="tab-estimacion"
            className="space-y-4"
          >
            {campanaSeleccionada ? (
              <EstimacionComponente
                parcelaId={parcela.id}
                campanaId={campanaSeleccionada.id}
                temporada={campanaSeleccionada.temporada}
                cultivoId={campanaSeleccionada.cultivoId}
                cultivoNombre={cultivoNombre(campanaSeleccionada.cultivoId)}
                hectareasParcela={parcela.hectareas}
                campanasHistoricas={campanasHistoricas}
                evaluacionRegistro={evaluacion}
                versionRecarga={versionEstimacion}
                puedeEntrenar={esJefe}
                onEditarVariablesSiembra={
                  puedeRegistrarActividad
                    ? () =>
                        setModalRegistroCosecha({ campana: campanaSeleccionada, modo: "siembra" })
                    : undefined
                }
                onIrATabRegistro={() => setPestanaActiva("registro")}
              />
            ) : (
              <div className="space-y-3 rounded-tarjeta border-2 border-dashed border-sindatos-borde bg-white p-6 text-center">
                <p className="text-base font-bold text-tinta">
                  Todavía no hay una campaña para estimar
                </p>
                <p className="text-sm text-tinta-suave">
                  Crea una campaña agrícola y registra las variables de siembra en la pestaña
                  Registro para consultar el rendimiento estimado y los factores influyentes.
                </p>
                <div className="flex flex-wrap justify-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setPestanaActiva("registro")}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-control border border-borde bg-fondo-suave px-4 text-sm font-semibold text-tinta hover:bg-marca-suave"
                  >
                    Ir a Registro
                  </button>
                  {esJefe && (
                    <button
                      type="button"
                      onClick={() => setMostrarFormCampana(true)}
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-control bg-marca px-4 text-sm font-semibold text-white hover:bg-marca-hover"
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
      </div>

      {/* MODALES DE CONSULTA DE CATEGORÍAS Y COMPLETITUD */}
      {modalCategoria === "suelo" && (
        <ModalHistorialSuelo
          suelo={suelo}
          evaluacion={evaluacion}
          puedeEditar={puedeRegistrarActividad}
          onRegistrarSuelo={() => {
            setModalCategoria(null);
            setFormMonitoreo("suelo");
          }}
          onClose={() => setModalCategoria(null)}
        />
      )}

      {modalCategoria === "clima" && (
        <ModalHistorialClima
          clima={clima}
          evaluacion={evaluacion}
          puedeEditar={puedeRegistrarActividad}
          onRegistrarClima={() => {
            setModalCategoria(null);
            setFormMonitoreo("clima");
          }}
          onClose={() => setModalCategoria(null)}
        />
      )}

      {modalCategoria === "manejo" && (
        <ModalManejoCultivo
          campana={campanaSeleccionada}
          registro={registroActivo}
          evaluacion={evaluacion}
          puedeEditar={puedeRegistrarActividad}
          onEditarSiembra={() => {
            if (!campanaSeleccionada) return;
            setModalCategoria(null);
            setModalRegistroCosecha({ campana: campanaSeleccionada, modo: "siembra" });
          }}
          onRegistrarCosecha={() => {
            if (!campanaSeleccionada) return;
            setModalCategoria(null);
            setModalRegistroCosecha({ campana: campanaSeleccionada, modo: "cosecha" });
          }}
          onClose={() => setModalCategoria(null)}
        />
      )}

      {modalCategoria === "observaciones" && (
        <ModalObservaciones
          evaluacion={evaluacion}
          puedeEditar={puedeRegistrarActividad}
          hasCampanaActiva={!!campanaSeleccionada}
          onAgregarNotaSuelo={() => {
            setModalCategoria(null);
            setFormMonitoreo("suelo");
          }}
          onAgregarNotaClima={() => {
            setModalCategoria(null);
            setFormMonitoreo("clima");
          }}
          onAgregarActividad={() => {
            setModalCategoria(null);
            setModalActividad({ corrigiendo: null });
          }}
          onClose={() => setModalCategoria(null)}
        />
      )}

      {modalCompletitud && (
        <ModalDetalleCompletitud
          evaluacion={evaluacion}
          puedeEditar={puedeRegistrarActividad}
          esJefe={esJefe}
          onAccionDimension={ejecutarAccionFaltante}
          onClose={() => setModalCompletitud(false)}
        />
      )}

      {modalMapa && parcela.poligono && (
        <ModalMapaParcela
          nombre={parcela.nombre}
          poligono={parcela.poligono}
          onClose={() => setModalMapa(false)}
        />
      )}

      {/* MODALES DE CREACIÓN Y EDICIÓN */}
      {modalEditarParcela && (
        <ParcelaForm
          parcela={parcela}
          onClose={() => setModalEditarParcela(false)}
          onSaved={() => {
            setModalEditarParcela(false);
            setVersionDatos((v) => v + 1);
          }}
        />
      )}

      {formMonitoreo === "suelo" && (
        <SueloForm
          parcelaId={parcelaId}
          onClose={() => setFormMonitoreo(null)}
          onSaved={() => {
            setFormMonitoreo(null);
            setVersionDatos((v) => v + 1);
          }}
        />
      )}

      {formMonitoreo === "clima" && (
        <ClimaForm
          parcelaId={parcelaId}
          onClose={() => setFormMonitoreo(null)}
          onSaved={() => {
            setFormMonitoreo(null);
            setVersionDatos((v) => v + 1);
          }}
        />
      )}

      {mostrarFormCampana && (
        <CampanaForm
          parcelaId={parcelaId}
          cultivos={cultivos}
          onClose={() => setMostrarFormCampana(false)}
          onSaved={() => {
            setMostrarFormCampana(false);
            setVersionDatos((v) => v + 1);
            setVersionEstimacion((v) => v + 1);
          }}
        />
      )}

      {modalActividad && campanaSeleccionada && (
        <ActividadForm
          parcelaId={parcela.id}
          campanaId={campanaSeleccionada.id}
          hectareasParcela={parcela.hectareas}
          registroCosecha={registroActivo}
          corrigiendo={modalActividad.corrigiendo}
          tipoInicial={modalActividad.tipoInicial}
          onClose={() => setModalActividad(null)}
          onSaved={() => {
            setModalActividad(null);
            setVersionDatos((v) => v + 1);
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
            registrosPorCampana[modalRegistroCosecha.campana.id] ?? registroActivo
          }
          modo={modalRegistroCosecha.modo}
          onClose={() => setModalRegistroCosecha(null)}
          onSaved={() => {
            setModalRegistroCosecha(null);
            setVersionDatos((v) => v + 1);
            setVersionEstimacion((v) => v + 1);
          }}
        />
      )}
    </div>
  );
}

export default function ParcelaPrivadaDetallePage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-tarjeta border border-borde bg-white p-6 text-sm text-tinta-suave">
          Cargando detalle de la parcela...
        </div>
      }
    >
      <ParcelaPrivadaDetalleContenido />
    </Suspense>
  );
}
