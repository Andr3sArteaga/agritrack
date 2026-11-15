"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
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
  TestTubes,
  Trash2,
} from "lucide-react";
import { BadgeEstadoCampana } from "@/components/badge";
import {
  EstimacionComponente,
  type PuntoHistoricoRendimiento,
} from "@/components/estado/estimacion-componente";
import { IconoActividad } from "@/components/icono-actividad";
import { api, apiErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatearFecha } from "@/lib/format";
import { elegirCampanaActual } from "@/lib/parcelas";
import type { RegistroCosechaCampana } from "@/lib/prediccion";
import {
  ESTADO_CAMPANA_LABEL,
  TIPO_ACTIVIDAD_LABEL,
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
import { BarraModoDesarrollo } from "./barra-modo-desarrollo";
import { CampanaForm } from "./campana-form";
import { ClimaForm } from "./clima-form";
import {
  evaluarRegistroParcela,
  type DimensionEstadoRegistro,
  type EstadoRegistroItem,
} from "./estado-registro-parcela";
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

function TarjetaCategoriaAmbiente({
  titulo,
  descripcion,
  contador,
  estado,
  icono: Icono,
  puedeEditar,
  etiquetaConsultar,
  etiquetaRegistrar,
  onConsultar,
  onRegistrar,
}: {
  titulo: string;
  descripcion: string;
  contador: string;
  estado: EstadoRegistroItem;
  icono: typeof TestTubes;
  puedeEditar: boolean;
  etiquetaConsultar: string;
  etiquetaRegistrar?: string;
  onConsultar: () => void;
  onRegistrar?: () => void;
}) {
  const sinDatos = estado === "SIN_DATOS";
  return (
    <article
      className={`flex flex-col justify-between gap-4 rounded-xl bg-white p-5 transition-colors ${
        sinDatos
          ? "border-2 border-dashed border-stone-300"
          : "border border-[#E4EAE6]"
      }`}
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#E8F5EF] text-[#006B4F]">
              <Icono className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#17211D]">{titulo}</h3>
              <p className="text-xs font-medium text-[#006B4F]">{contador}</p>
            </div>
          </div>
          <BadgeEstadoRegistro estado={estado} tamano="sm" />
        </div>

        <p className="text-sm leading-relaxed text-[#68736D]">{descripcion}</p>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-[#E4EAE6] pt-3">
        <button
          type="button"
          onClick={onConsultar}
          className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#E4EAE6] bg-[#F8FAF9] px-3 text-xs font-semibold text-[#17211D] hover:bg-[#E8F5EF] hover:text-[#006B4F]"
        >
          <Eye className="h-4 w-4 shrink-0" aria-hidden />
          {etiquetaConsultar}
        </button>

        {puedeEditar && onRegistrar && etiquetaRegistrar && (
          <button
            type="button"
            onClick={onRegistrar}
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg bg-[#006B4F] px-3.5 text-xs font-semibold text-white hover:bg-[#00553E]"
          >
            <Plus className="h-4 w-4 shrink-0" aria-hidden />
            {etiquetaRegistrar}
          </button>
        )}
      </div>
    </article>
  );
}

export default function ParcelaPrivadaDetallePage() {
  const params = useParams<{ id: string }>();
  const parcelaId = params.id;
  const { usuario } = useAuth();
  const rol = usuario?.rol;
  const esJefe = rol === "JEFE";
  const puedeRegistrarActividad = rol === "JEFE" || rol === "OPERATIVO";
  const puedeVerReportesIntegridad = rol === "JEFE" || rol === "CONTABILIDAD";

  const [pestanaActiva, setPestanaActiva] = useState<PestanaParcela>("registro");

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

  if (error) return <p className="text-red-600">{error}</p>;
  if (!parcela || !evaluacion) {
    return (
      <div className="rounded-xl border border-[#E4EAE6] bg-white p-6 text-sm text-[#68736D]">
        Cargando detalle de la parcela...
      </div>
    );
  }

  const actividadesOrdenadas = [...actividades].sort(
    (a, b) => b.fecha.localeCompare(a.fecha) || b.secuencia - a.secuencia,
  );
  const actividadesVigentesCount = actividades.filter((a) => a.vigente).length;
  const estadoProgresoPct = Math.round((evaluacion.completadas / 5) * 100);

  return (
    <div className="-mx-4 -my-6 min-h-full bg-[#F8FAF9] px-4 py-6 text-[#17211D] md:-mx-8 md:-my-8 md:px-8 md:py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* A. ENCABEZADO ÚNICO DE LA PARCELA (Toda la identidad va solo aquí) */}
        <header className="rounded-xl border border-[#E4EAE6] bg-white p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/panel/parcelas"
              className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-[#68736D] hover:text-[#006B4F]"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Volver a parcelas
            </Link>

            <div className="flex flex-wrap items-center gap-2">
              {parcela.poligono && (
                <button
                  type="button"
                  onClick={() => setModalMapa(true)}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-[#E4EAE6] bg-white px-3.5 text-xs font-semibold text-[#17211D] hover:bg-[#F8FAF9]"
                >
                  <MapPin className="h-4 w-4 text-[#006B4F]" aria-hidden />
                  Ver mapa
                </button>
              )}
              {esJefe && (
                <>
                  <button
                    type="button"
                    onClick={() => setModalEditarParcela(true)}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-[#E4EAE6] bg-white px-3.5 text-xs font-semibold text-[#17211D] hover:bg-[#F8FAF9]"
                  >
                    <Pencil className="h-4 w-4 text-[#006B4F]" aria-hidden />
                    Editar parcela
                  </button>
                  <button
                    type="button"
                    onClick={() => setMostrarFormCampana(true)}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-[#006B4F] px-3.5 text-xs font-semibold text-white hover:bg-[#00553E]"
                  >
                    <Plus className="h-4 w-4" aria-hidden />
                    Nueva campaña
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-[#17211D] sm:text-3xl">
              {parcela.nombre}
            </h1>
            {parcela.disponibleParaPreventa && (
              <span className="rounded-full border border-[#006B4F]/30 bg-[#E8F5EF] px-3 py-0.5 text-xs font-semibold text-[#006B4F]">
                Disponible para preventa
              </span>
            )}
            {integridad && integridad.totalVerificadas > 0 && (
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                  integridad.valido
                    ? "border-[#006B4F]/30 bg-[#E8F5EF] text-[#006B4F]"
                    : "border-red-300 bg-red-50 text-red-700"
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

          {/* Grilla única de metadatos: nunca repetida en bloques inferiores */}
          <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-[#E4EAE6] pt-4 sm:grid-cols-3 lg:grid-cols-6">
            <div>
              <dt className="text-xs font-medium text-[#68736D]">Ubicación</dt>
              <dd className="mt-0.5 text-sm font-semibold text-[#17211D]">
                {parcela.ubicacionTexto || "Sin registrar"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-[#68736D]">Superficie total</dt>
              <dd className="mt-0.5 text-sm font-semibold text-[#17211D]">
                {parcela.hectareas} ha
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-[#68736D]">Campaña activa</dt>
              <dd className="mt-0.5 text-sm font-semibold text-[#17211D]">
                {campanaSeleccionada ? (
                  <div className="flex flex-col gap-1">
                    {campanas.length > 1 ? (
                      <select
                        aria-label="Seleccionar campaña de la parcela"
                        value={campanaSeleccionada.id}
                        onChange={(e) => setCampanaManualId(e.target.value)}
                        className="min-h-9 rounded-md border border-[#E4EAE6] bg-[#F8FAF9] px-2 py-1 text-xs font-semibold text-[#17211D]"
                      >
                        {campanas.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.temporada} ({ESTADO_CAMPANA_LABEL[c.estado]})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span>{campanaSeleccionada.temporada}</span>
                    )}
                  </div>
                ) : (
                  "Sin campaña"
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-[#68736D]">Cultivo actual</dt>
              <dd className="mt-0.5 text-sm font-semibold text-[#17211D]">
                {campanaSeleccionada ? cultivoNombre(campanaSeleccionada.cultivoId) : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-[#68736D]">Variedad / semilla</dt>
              <dd className="mt-0.5 text-sm font-semibold text-[#17211D]">
                {registroActivo?.variedad?.trim() || "Sin registrar"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-[#68736D]">Fecha de siembra</dt>
              <dd className="mt-0.5 text-sm font-semibold text-[#17211D]">
                {registroActivo?.fechaSiembra
                  ? formatearFecha(registroActivo.fechaSiembra)
                  : "Sin registrar"}
              </dd>
            </div>
          </dl>

          {/* Barra compacta de gestión de estado de campaña (solo JEFE) */}
          {esJefe && campanaSeleccionada && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#E4EAE6] pt-3 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-[#68736D]">Etapa de la campaña:</span>
                <BadgeEstadoCampana estado={campanaSeleccionada.estado} />
                <span className="text-[#68736D]">· Cambiar a:</span>
                {ESTADOS_CAMPANA.map((estado) => (
                  <button
                    key={estado}
                    type="button"
                    disabled={estado === campanaSeleccionada.estado}
                    onClick={() => cambiarEstadoCampana(campanaSeleccionada, estado)}
                    className="min-h-9 rounded-md border border-[#E4EAE6] bg-[#F8FAF9] px-2.5 text-xs font-medium text-[#17211D] hover:bg-[#E8F5EF] disabled:opacity-40"
                  >
                    {ESTADO_CAMPANA_LABEL[estado]}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => eliminarCampana(campanaSeleccionada)}
                className="inline-flex min-h-9 items-center gap-1 rounded-md px-2 text-xs font-medium text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                Eliminar campaña
              </button>
            </div>
          )}
        </header>

        {/* Barra de Modo Desarrollo (mantenida para pruebas rápidas en entorno dev) */}
        {puedeRegistrarActividad && (
          <BarraModoDesarrollo
            parcelaId={parcela.id}
            cultivos={cultivos}
            campanaActual={campanaSeleccionada}
            onRecargarTodo={(campanaFocusId) => {
              if (campanaFocusId) setCampanaManualId(campanaFocusId);
              setVersionDatos((v) => v + 1);
              setVersionEstimacion((v) => v + 1);
            }}
            onAbrirImpacto={(campana) => {
              setModalRegistroCosecha({ campana, modo: "siembra" });
            }}
            onVerEstimacion={() => setPestanaActiva("estimacion")}
          />
        )}

        {/* NAVEGACIÓN PRINCIPAL EN 2 PESTAÑAS */}
        <div
          role="tablist"
          aria-label="Vistas principales de la parcela"
          className="grid grid-cols-1 gap-2 rounded-xl border border-[#E4EAE6] bg-white p-1.5 sm:grid-cols-2"
        >
          <button
            id="tab-registro"
            type="button"
            role="tab"
            aria-selected={pestanaActiva === "registro"}
            aria-controls="panel-registro"
            onClick={() => setPestanaActiva("registro")}
            className={`flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold transition-colors sm:text-base ${
              pestanaActiva === "registro"
                ? "bg-[#006B4F] text-white"
                : "text-[#68736D] hover:bg-[#F8FAF9] hover:text-[#17211D]"
            }`}
          >
            <ClipboardList className="h-5 w-5 shrink-0" aria-hidden />
            Registro
          </button>

          <button
            id="tab-estimacion"
            type="button"
            role="tab"
            aria-selected={pestanaActiva === "estimacion"}
            aria-controls="panel-estimacion"
            onClick={() => setPestanaActiva("estimacion")}
            className={`flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold transition-colors sm:text-base ${
              pestanaActiva === "estimacion"
                ? "bg-[#006B4F] text-white"
                : "text-[#68736D] hover:bg-[#F8FAF9] hover:text-[#17211D]"
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
            {/* D. ESTADO DEL REGISTRO (Resumen superior de completitud) */}
            <section
              aria-labelledby="heading-estado-registro"
              className="rounded-xl border border-[#E4EAE6] bg-white p-5 sm:p-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 id="heading-estado-registro" className="text-lg font-bold text-[#17211D]">
                    Estado del registro
                  </h2>
                  <p className="mt-0.5 text-sm text-[#68736D]">
                    {evaluacion.completadas} de 5 dimensiones completas para respaldo técnico y
                    estimación de rendimiento.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setModalCompletitud(true)}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-[#006B4F]/40 bg-[#E8F5EF] px-4 text-xs font-bold text-[#006B4F] hover:bg-[#006B4F] hover:text-white"
                >
                  <SlidersHorizontal className="h-4 w-4 shrink-0" aria-hidden />
                  Ver qué información falta registrar
                  {evaluacion.totalFaltantes > 0 ? ` (${evaluacion.totalFaltantes})` : ""}
                </button>
              </div>

              <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-[#F8FAF9] ring-1 ring-[#E4EAE6]">
                <div
                  className="h-full rounded-full bg-[#006B4F] transition-all duration-300"
                  style={{ width: `${Math.max(6, estadoProgresoPct)}%` }}
                />
              </div>

              <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
                {evaluacion.dimensiones.map((dim) => (
                  <button
                    key={dim.id}
                    type="button"
                    onClick={() => setModalCompletitud(true)}
                    className={`flex flex-col justify-between rounded-xl p-3 text-left transition-colors hover:border-[#006B4F]/50 ${
                      dim.estado === "SIN_DATOS"
                        ? "border-2 border-dashed border-stone-300 bg-[#F8FAF9]"
                        : "border border-[#E4EAE6] bg-white"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-bold text-[#17211D]">{dim.nombre}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <BadgeEstadoRegistro estado={dim.estado} tamano="sm" />
                    </div>
                    <p className="mt-1.5 text-[11px] text-[#68736D]">{dim.resumen}</p>
                  </button>
                ))}
              </div>
            </section>

            {/* C. VARIABLES DEL CULTIVO Y AMBIENTE (4 Tarjetas de Categorías + Modales) */}
            <section aria-labelledby="heading-variables-ambiente" className="space-y-3">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h2 id="heading-variables-ambiente" className="text-lg font-bold text-[#17211D]">
                    Variables del cultivo y ambiente
                  </h2>
                  <p className="text-sm text-[#68736D]">
                    Consulta el historial o carga nuevos registros por categoría.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <TarjetaCategoriaAmbiente
                  titulo="Suelo"
                  descripcion="Análisis de laboratorio y mediciones de campo: acidez (pH), materia orgánica, humedad y nutrientes N-P-K."
                  contador={`${evaluacion.sueloConDato}/6 indicadores · ${suelo.length} análisis`}
                  estado={evaluacion.estadoSuelo}
                  icono={TestTubes}
                  puedeEditar={puedeRegistrarActividad}
                  etiquetaConsultar="Consultar historial"
                  etiquetaRegistrar="Registrar suelo"
                  onConsultar={() => setModalCategoria("suelo")}
                  onRegistrar={() => setFormMonitoreo("suelo")}
                />

                <TarjetaCategoriaAmbiente
                  titulo="Clima"
                  descripcion="Condición climática diaria, lluvias registradas en milímetros y alertas por helada, granizo o viento."
                  contador={`${clima.length} ${
                    clima.length === 1 ? "medición" : "mediciones"
                  } · ${evaluacion.clima30d.length} en últimos 30 días`}
                  estado={evaluacion.estadoClima}
                  icono={CloudRain}
                  puedeEditar={puedeRegistrarActividad}
                  etiquetaConsultar="Consultar historial"
                  etiquetaRegistrar="Registrar clima"
                  onConsultar={() => setModalCategoria("clima")}
                  onRegistrar={() => setFormMonitoreo("clima")}
                />

                <TarjetaCategoriaAmbiente
                  titulo="Manejo del cultivo"
                  descripcion="Superficie sembrada, fecha de siembra y variedad (predictores del modelo IA), además de los datos de cosecha."
                  contador={
                    campanaSeleccionada
                      ? `${evaluacion.manejoConDato}/3 variables pre-siembra listas`
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

                <TarjetaCategoriaAmbiente
                  titulo="Observaciones"
                  descripcion="Notas técnicas consolidadas provenientes de análisis de suelo, registros de clima y bitácora de actividades."
                  contador={`${evaluacion.observaciones.length} ${
                    evaluacion.observaciones.length === 1
                      ? "observación registrada"
                      : "observaciones registradas"
                  }`}
                  estado={evaluacion.estadoObservaciones}
                  icono={ClipboardList}
                  puedeEditar={puedeRegistrarActividad}
                  etiquetaConsultar="Ver observaciones"
                  onConsultar={() => setModalCategoria("observaciones")}
                />
              </div>
            </section>

            {/* B. ACTIVIDADES AGRÍCOLAS (Línea de Tiempo Cronológica) */}
            <section
              aria-labelledby="heading-actividades"
              className="rounded-xl border border-[#E4EAE6] bg-white p-5 sm:p-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2
                    id="heading-actividades"
                    className="flex items-center gap-2 text-lg font-bold text-[#17211D]"
                  >
                    <CalendarRange className="h-5 w-5 text-[#006B4F]" aria-hidden />
                    Actividades agrícolas
                  </h2>
                  <p className="mt-0.5 text-sm text-[#68736D]">
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
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-[#006B4F] px-4 text-sm font-semibold text-white hover:bg-[#00553E]"
                  >
                    <Plus className="h-4 w-4" aria-hidden />
                    Registrar actividad
                  </button>
                )}
              </div>

              {!campanaSeleccionada ? (
                <div className="mt-5 rounded-xl border-2 border-dashed border-stone-300 bg-[#F8FAF9] p-6 text-center">
                  <p className="text-sm font-semibold text-[#17211D]">
                    No hay una campaña seleccionada todavía.
                  </p>
                  <p className="mt-1 text-xs text-[#68736D]">
                    Crea una campaña agrícola para comenzar la bitácora de siembra, aplicaciones y
                    cosecha.
                  </p>
                  {esJefe && (
                    <button
                      type="button"
                      onClick={() => setMostrarFormCampana(true)}
                      className="mt-4 inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-[#006B4F] px-4 text-sm font-semibold text-white hover:bg-[#00553E]"
                    >
                      <Plus className="h-4 w-4" aria-hidden />
                      Crear primera campaña
                    </button>
                  )}
                </div>
              ) : cargandoActividades ? (
                <p className="mt-4 text-sm text-[#68736D]">Cargando línea de tiempo...</p>
              ) : actividadesOrdenadas.length === 0 ? (
                <div className="mt-5 rounded-xl border-2 border-dashed border-stone-300 bg-[#F8FAF9] p-6 text-center">
                  <p className="text-sm font-semibold text-[#17211D]">
                    Todavía no hay actividades agrícolas registradas en esta campaña.
                  </p>
                  <p className="mt-1 text-xs text-[#68736D]">
                    Registra siembra, fertilización, fumigación, mediciones de humedad o cosecha
                    para construir la trazabilidad.
                  </p>
                  {puedeRegistrarActividad && (
                    <button
                      type="button"
                      onClick={() => setModalActividad({ corrigiendo: null, tipoInicial: "SIEMBRA" })}
                      className="mt-4 inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-[#006B4F] px-4 text-sm font-semibold text-white hover:bg-[#00553E]"
                    >
                      <Plus className="h-4 w-4" aria-hidden />
                      Registrar primera actividad
                    </button>
                  )}
                </div>
              ) : (
                <ol className="relative mt-6 space-y-4 border-l-2 border-[#E4EAE6] pl-5">
                  {actividadesOrdenadas.map((act) => (
                    <li key={act.id} className="relative">
                      <span
                        className={`absolute -left-[27px] top-4 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-white ${
                          act.vigente ? "bg-[#006B4F]" : "bg-stone-300"
                        }`}
                        aria-hidden
                      />
                      <div
                        className={`rounded-xl border p-4 ${
                          act.vigente
                            ? "border-[#E4EAE6] bg-[#F8FAF9]/60"
                            : "border-stone-200 bg-stone-50 opacity-70"
                        }`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-md bg-[#E8F5EF] px-2.5 py-1 text-xs font-bold text-[#006B4F]">
                              <IconoActividad tipo={act.tipo} />
                              {TIPO_ACTIVIDAD_LABEL[act.tipo]}
                            </span>
                            <span className="text-xs font-semibold text-[#68736D]">
                              #{act.secuencia} · {formatearFecha(act.fecha)}
                            </span>
                            {act.tipo === "COSECHA" && act.rendimientoTnHa !== null && (
                              <span className="rounded-md bg-white px-2 py-0.5 text-xs font-bold text-[#006B4F] ring-1 ring-[#006B4F]/30">
                                {act.rendimientoTnHa} t/ha
                              </span>
                            )}
                            {!act.vigente && (
                              <span className="rounded-md bg-stone-200 px-2 py-0.5 text-[11px] font-medium text-stone-700">
                                Reemplazada por corrección
                              </span>
                            )}
                          </div>

                          {act.vigente && puedeRegistrarActividad && (
                            <button
                              type="button"
                              onClick={() => setModalActividad({ corrigiendo: act })}
                              title="Registrar corrección sin borrar el historial"
                              className="inline-flex min-h-9 items-center gap-1 rounded-md border border-[#E4EAE6] bg-white px-2.5 text-xs font-semibold text-amber-800 hover:bg-amber-50"
                            >
                              <Pencil className="h-3.5 w-3.5" aria-hidden />
                              Corregir
                            </button>
                          )}
                        </div>

                        <p
                          className={`mt-2 text-sm ${
                            act.vigente ? "text-[#17211D]" : "line-through text-stone-500"
                          }`}
                        >
                          {act.descripcion}
                        </p>

                        {(act.insumo ||
                          act.cantidad !== null ||
                          act.maquinariaUtilizada ||
                          act.tercerizado) && (
                          <div className="mt-2.5 flex flex-wrap gap-2 text-xs text-[#68736D]">
                            {act.insumo && (
                              <span className="rounded-md border border-[#E4EAE6] bg-white px-2 py-0.5">
                                Insumo: <strong className="text-[#17211D]">{act.insumo}</strong>
                              </span>
                            )}
                            {act.cantidad !== null && (
                              <span className="rounded-md border border-[#E4EAE6] bg-white px-2 py-0.5">
                                Cantidad:{" "}
                                <strong className="text-[#17211D]">
                                  {act.cantidad} {act.unidad ?? ""}
                                </strong>
                              </span>
                            )}
                            {act.maquinariaUtilizada && (
                              <span className="rounded-md border border-[#E4EAE6] bg-white px-2 py-0.5">
                                Equipo:{" "}
                                <strong className="text-[#17211D]">{act.maquinariaUtilizada}</strong>
                              </span>
                            )}
                            {act.tercerizado && (
                              <span className="rounded-md border border-[#E4EAE6] bg-white px-2 py-0.5 font-medium text-[#17211D]">
                                Servicio tercerizado
                              </span>
                            )}
                          </div>
                        )}

                        {act.correccionDeId && (
                          <p className="mt-2 text-xs font-medium text-amber-800">
                            Corrige a #
                            {actividades.find((x) => x.id === act.correccionDeId)?.secuencia ?? "?"}
                            {act.motivoCorreccion ? `: ${act.motivoCorreccion}` : ""}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </section>
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
                cultivoNombre={cultivoNombre(campanaSeleccionada.cultivoId)}
                hectareasParcela={parcela.hectareas}
                campanasHistoricas={campanasHistoricas}
                evaluacionRegistro={evaluacion}
                versionRecarga={versionEstimacion}
                onEditarVariablesSiembra={
                  puedeRegistrarActividad
                    ? () =>
                        setModalRegistroCosecha({ campana: campanaSeleccionada, modo: "siembra" })
                    : undefined
                }
                onIrATabRegistro={() => setPestanaActiva("registro")}
              />
            ) : (
              <div className="space-y-3 rounded-xl border-2 border-dashed border-stone-300 bg-white p-6 text-center">
                <p className="text-base font-bold text-[#17211D]">
                  Todavía no hay una campaña para estimar
                </p>
                <p className="text-sm text-[#68736D]">
                  Crea una campaña agrícola y registra las variables de siembra en la pestaña
                  Registro para consultar el rendimiento estimado y los factores influyentes.
                </p>
                <div className="flex flex-wrap justify-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setPestanaActiva("registro")}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-[#E4EAE6] bg-[#F8FAF9] px-4 text-sm font-semibold text-[#17211D] hover:bg-[#E8F5EF]"
                  >
                    Ir a Registro
                  </button>
                  {esJefe && (
                    <button
                      type="button"
                      onClick={() => setMostrarFormCampana(true)}
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-[#006B4F] px-4 text-sm font-semibold text-white hover:bg-[#00553E]"
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
