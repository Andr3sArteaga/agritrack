"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CalendarRange,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDashed,
  ClipboardCheck,
  FlaskConical,
  History,
  LineChart,
  MapPin,
  OctagonAlert,
  Plus,
  Ruler,
  SlidersHorizontal,
  Sprout,
  Tag,
  Tractor,
} from "lucide-react";
import { ActividadForm } from "@/app/panel/parcelas/[id]/actividad-form";
import { ChipRegistrado, ICONO_AREA, areaSoloRegistrada } from "@/components/estado/desglose-areas";
import { EstadoBadge } from "@/components/estado/estado-badge";
import { EstadoVacio } from "@/components/estado/estado-vacio";
import { api, apiErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useResumenesParcelas } from "@/lib/cargar-resumen";
import { contarPorEstado, type EstadoIndicador } from "@/lib/estado";
import { formatearFecha } from "@/lib/format";
import {
  useIdsDemo,
  type EstimacionRespuesta,
  type RegistroCosechaCampana,
  type ResultadoImpacto,
} from "@/lib/prediccion";
import {
  ESTADO_CAMPANA_LABEL,
  TIPO_ACTIVIDAD_LABEL,
  type Actividad,
  type ReporteCampana,
  type ResumenDashboard,
} from "@/lib/types";
import { SaludOperativaChart } from "./salud-operativa-chart";

interface DetalleSeleccionada {
  clave: string;
  registroCosecha: RegistroCosechaCampana | null;
  estimacion: EstimacionRespuesta | null;
  impacto: ResultadoImpacto | null;
  ultimaActividad: {
    fecha: string;
    tipo: Actividad["tipo"];
    descripcion: string;
  } | null;
  totalActividadesVigentes: number;
}

const PUNTO_ESTADO: Record<EstadoIndicador, string> = {
  BIEN: "bg-marca",
  ATENCION: "bg-atencion-icono",
  CRITICO: "bg-critico-borde",
  SIN_DATOS: "bg-sindatos-icono",
};

const COLOR_BARRA_AREA: Record<EstadoIndicador, string> = {
  BIEN: "bg-marca",
  ATENCION: "bg-atencion-icono",
  CRITICO: "bg-critico-borde",
  SIN_DATOS: "bg-sindatos-icono",
};

function TarjetaKpiEstado({
  titulo,
  cantidad,
  total,
  subtitulo,
  icono: Icono,
  acento,
  bordeClase,
  fondoIcono,
  colorIcono,
  colorBarra,
  punteado = false,
}: {
  titulo: string;
  cantidad: number;
  total: number;
  subtitulo: string;
  icono: typeof CircleDashed;
  acento: string;
  bordeClase: string;
  fondoIcono: string;
  colorIcono: string;
  colorBarra: string;
  punteado?: boolean;
}) {
  const porcentaje = total > 0 ? Math.round((cantidad / total) * 100) : 0;

  return (
    <article
      className={`flex flex-col justify-between rounded-tarjeta bg-white p-4 shadow-xs ${bordeClase} ${
        punteado ? "border-2 border-dashed" : "border"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-tinta-suave">
            {titulo}
          </p>
          <p className="mt-2 text-3xl font-extrabold tracking-tight text-tinta">
            {cantidad}
          </p>
        </div>
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-control ${fondoIcono}`}
        >
          <Icono className={`h-5 w-5 ${colorIcono}`} aria-hidden />
        </div>
      </div>

      <div className="mt-3 space-y-2">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="truncate text-tinta-suave">{subtitulo}</span>
          <span className={`shrink-0 font-bold ${acento}`}>{porcentaje}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-fondo-suave ring-1 ring-borde">
          <div
            className={`h-full rounded-full transition-all duration-300 ${colorBarra}`}
            style={{ width: `${cantidad > 0 ? Math.max(8, porcentaje) : 0}%` }}
          />
        </div>
      </div>
    </article>
  );
}

export default function DashboardPage() {
  const { usuario } = useAuth();
  const router = useRouter();
  const rol = usuario?.rol;
  const esJefe = rol === "JEFE";

  const [resumen, setResumen] = useState<ResumenDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filtros interactivos del encabezado
  const [filtroFinca, setFiltroFinca] = useState<string>("TODAS");
  const [filtroCampana, setFiltroCampana] = useState<string>("TODAS");
  const [mostrarDemo, setMostrarDemo] = useState(false);

  const [versionRecarga, setVersionRecarga] = useState(0);
  const [elegidaId, setElegidaId] = useState<string | null>(null);
  const [detalleState, setDetalleState] = useState<DetalleSeleccionada | null>(null);
  const [mostrarModalActividad, setMostrarModalActividad] = useState(false);

  const carruselRef = useRef<HTMLDivElement | null>(null);

  const idsDemo = useIdsDemo();
  const { datos: parcelas, error: errorParcelas } = useResumenesParcelas(
    versionRecarga,
    mostrarDemo,
  );

  useEffect(() => {
    if (rol === "OPERATIVO") {
      router.replace("/panel/parcelas");
    }
  }, [rol, router]);

  useEffect(() => {
    let cancelado = false;
    api
      .get<ResumenDashboard>("/reportes/dashboard")
      .then((res) => {
        if (!cancelado) setResumen(res.data);
      })
      .catch((err) => {
        if (!cancelado) setError(apiErrorMessage(err, "No se pudo cargar el resumen"));
      });
    return () => {
      cancelado = true;
    };
  }, [versionRecarga]);

  // Opciones dinámicas de filtros derivadas únicamente de datos reales
  const fincasDisponibles = useMemo(() => {
    if (!parcelas) return [];
    return Array.from(
      new Set(parcelas.map((p) => p.ubicacion.trim()).filter(Boolean)),
    ).sort((a, b) => a.localeCompare(b));
  }, [parcelas]);

  const campanasDisponibles = useMemo(() => {
    if (!parcelas) return { temporadas: [] as string[], haySinCampana: false };
    const temporadas = Array.from(
      new Set(
        parcelas
          .map((p) => p.campanaActual?.temporada)
          .filter((t): t is string => Boolean(t)),
      ),
    ).sort((a, b) => b.localeCompare(a));
    const haySinCampana = parcelas.some((p) => p.campanaActual === null);
    return { temporadas, haySinCampana };
  }, [parcelas]);

  const parcelasFiltradas = useMemo(() => {
    if (!parcelas) return [];
    return parcelas.filter((p) => {
      if (filtroFinca !== "TODAS" && p.ubicacion.trim() !== filtroFinca) {
        return false;
      }
      if (filtroCampana === "__SIN_CAMPANA__") {
        return p.campanaActual === null;
      }
      if (filtroCampana !== "TODAS") {
        return p.campanaActual?.temporada === filtroCampana;
      }
      return true;
    });
  }, [parcelas, filtroFinca, filtroCampana]);

  const elegida = useMemo(
    () =>
      parcelasFiltradas.find((p) => p.parcelaId === elegidaId) ??
      parcelasFiltradas[0] ??
      null,
    [parcelasFiltradas, elegidaId],
  );

  const claveDetalle = elegida
    ? `${elegida.parcelaId}:${elegida.campanaActual?.id ?? "sin"}:${versionRecarga}`
    : null;

  // Carga asíncrona ligera del detalle específico de la parcela seleccionada
  useEffect(() => {
    if (!elegida || !claveDetalle || !rol) return;
    const campanaId = elegida.campanaActual?.id ?? null;
    if (!campanaId) return;

    let cancelado = false;

    const solicitudActividades =
      rol === "CONTABILIDAD"
        ? api
            .get<ReporteCampana>(`/reportes/campanas/${campanaId}`)
            .then(({ data }) => {
              const ordenadas = [...data.actividades].sort(
                (a, b) => b.fecha.localeCompare(a.fecha) || b.secuencia - a.secuencia,
              );
              const ultima = ordenadas[0] ?? null;
              return {
                ultima: ultima
                  ? {
                      fecha: ultima.fecha,
                      tipo: ultima.tipo,
                      descripcion: ultima.descripcion,
                    }
                  : null,
                totalVigentes: ordenadas.length,
              };
            })
            .catch(() => ({ ultima: null, totalVigentes: 0 }))
        : api
            .get<Actividad[]>("/actividades", { params: { campanaId } })
            .then(({ data }) => {
              const vigentes = data
                .filter((a) => a.vigente)
                .sort(
                  (a, b) => b.fecha.localeCompare(a.fecha) || b.secuencia - a.secuencia,
                );
              const ultima = vigentes[0] ?? null;
              return {
                ultima: ultima
                  ? {
                      fecha: ultima.fecha,
                      tipo: ultima.tipo,
                      descripcion: ultima.descripcion,
                    }
                  : null,
                totalVigentes: vigentes.length,
              };
            })
            .catch(() => ({ ultima: null, totalVigentes: 0 }));

    Promise.all([
      api
        .get<RegistroCosechaCampana | null | "">(
          `/campanas/${campanaId}/registro-cosecha`,
        )
        .then((res) =>
          res.data && typeof res.data === "object" ? res.data : null,
        )
        .catch(() => null),
      api
        .get<EstimacionRespuesta>("/prediccion/estimacion", {
          params: { lote: elegida.parcelaId, campana: campanaId },
        })
        .then((res) => res.data)
        .catch(() => null),
      api
        .get<ResultadoImpacto>("/prediccion/impacto", {
          params: { lote: elegida.parcelaId, campana: campanaId },
        })
        .then((res) => res.data)
        .catch(() => null),
      solicitudActividades,
    ]).then(([regCosecha, est, imp, actInfo]) => {
      if (cancelado) return;
      setDetalleState({
        clave: claveDetalle,
        registroCosecha: regCosecha,
        estimacion: est,
        impacto: imp,
        ultimaActividad: actInfo.ultima,
        totalActividadesVigentes: actInfo.totalVigentes,
      });
    });

    return () => {
      cancelado = true;
    };
  }, [elegida, claveDetalle, rol]);

  const detalleActivo =
    claveDetalle && detalleState?.clave === claveDetalle ? detalleState : null;
  const cargandoDetalle = Boolean(
    elegida?.campanaActual && claveDetalle && detalleState?.clave !== claveDetalle,
  );

  function desplazarCarrusel(direccion: "izq" | "der") {
    if (!carruselRef.current) return;
    const delta = direccion === "izq" ? -280 : 280;
    carruselRef.current.scrollBy({ left: delta, behavior: "smooth" });
  }

  if (error) return <p className="text-critico-borde">{error}</p>;
  if (!resumen) {
    return (
      <div className="rounded-tarjeta border border-borde bg-white p-6 text-sm text-tinta-suave">
        Cargando resumen general...
      </div>
    );
  }

  // Métricas reales calculadas sobre las parcelas filtradas
  const conteo = contarPorEstado(parcelasFiltradas.map((p) => p.estado));
  const totalParcelasVisibles = parcelasFiltradas.length;
  const sinCampanaActiva = parcelasFiltradas.filter(
    (p) => p.campanaActual === null,
  ).length;
  const conCampanaEnCurso = parcelasFiltradas.filter(
    (p) => p.campanaActual?.estado === "EN_CURSO",
  ).length;
  const alertasAtencion = parcelasFiltradas
    .filter((p) => p.estado === "ATENCION")
    .reduce((acc, p) => acc + p.alertas, 0);
  const alertasCriticas = parcelasFiltradas
    .filter((p) => p.estado === "CRITICO")
    .reduce((acc, p) => acc + p.alertas, 0);
  const hectareasTotalesFiltradas = parcelasFiltradas.reduce(
    (acc, p) => acc + p.hectareas,
    0,
  );

  // Cálculo honesto para la columna de estimación de rendimiento de la parcela elegida
  const estResp = detalleActivo?.estimacion ?? null;
  const impacto = detalleActivo?.impacto ?? null;
  const bloqueModelo =
    estResp?.experimental ??
    (estResp?.oficial.fuente === "modelo" ? estResp.oficial : null);
  const valorEstimadoTnHa =
    impacto?.estimado_t_ha ??
    bloqueModelo?.valor_t_ha ??
    estResp?.oficial.valor_t_ha ??
    elegida?.estimacion?.rendimientoTnHa ??
    null;
  const produccionEstimadaTn =
    impacto?.produccion_estimada_tn ??
    (valorEstimadoTnHa !== null && elegida
      ? Math.round(
          valorEstimadoTnHa *
            (detalleActivo?.registroCosecha?.haSembradas ?? elegida.hectareas) *
            100,
        ) / 100
      : null);
  const campanasReferencia =
    bloqueModelo?.campañas_usadas ??
    estResp?.oficial.campañas_usadas ??
    elegida?.estimacion?.campanasUsadas ??
    0;

  // Diagnóstico contextual real de qué falta en la parcela elegida
  const accionesPendientes: {
    texto: string;
    href: string;
    accionEtiqueta: string;
  }[] = [];

  if (elegida) {
    const areaSuelo = elegida.areas.find((a) => a.id === "SUELO");
    const areaClima = elegida.areas.find((a) => a.id === "CLIMA");
    const reg = detalleActivo?.registroCosecha ?? null;

    if (!elegida.campanaActual) {
      accionesPendientes.push({
        texto: `Crear una campaña agrícola para "${elegida.nombre}" y definir su cultivo.`,
        href: `/panel/parcelas/${elegida.parcelaId}`,
        accionEtiqueta: "Crear campaña",
      });
    } else if (!cargandoDetalle && (!reg?.fechaSiembra || !reg?.variedad)) {
      accionesPendientes.push({
        texto: `Completar variables de siembra (${
          !reg?.fechaSiembra ? "fecha de siembra" : "variedad/semilla"
        }) para afinar el modelo predictivo.`,
        href: `/panel/parcelas/${elegida.parcelaId}`,
        accionEtiqueta: "Completar siembra",
      });
    }

    if (areaClima && areaClima.conDato === 0) {
      accionesPendientes.push({
        texto: "Registrar condiciones climáticas recientes (últimos 30 días).",
        href: `/panel/parcelas/${elegida.parcelaId}`,
        accionEtiqueta: "Anotar clima",
      });
    }

    if (areaSuelo && areaSuelo.conDato < areaSuelo.indicadores.length) {
      const faltan = areaSuelo.indicadores.length - areaSuelo.conDato;
      accionesPendientes.push({
        texto: `Cargar ${faltan} ${
          faltan === 1 ? "indicador faltante" : "indicadores faltantes"
        } de análisis de suelo.`,
        href: `/panel/parcelas/${elegida.parcelaId}`,
        accionEtiqueta: "Cargar suelo",
      });
    }

    if (elegida.alertas > 0) {
      accionesPendientes.push({
        texto: `Revisar ${elegida.alertas} ${
          elegida.alertas === 1 ? "alerta activa" : "alertas activas"
        } detectadas en la parcela.`,
        href: `/panel/parcelas/${elegida.parcelaId}`,
        accionEtiqueta: "Revisar alertas",
      });
    }
  }

  let mensajeContextualEstimacion: string | null = null;
  if (elegida) {
    const areaClima = elegida.areas.find((a) => a.id === "CLIMA");
    const areaSuelo = elegida.areas.find((a) => a.id === "SUELO");
    const reg = detalleActivo?.registroCosecha ?? null;
    if (!elegida.campanaActual) {
      mensajeContextualEstimacion =
        "Esta parcela necesita una campaña activa para generar una estimación.";
    } else if (valorEstimadoTnHa === null) {
      mensajeContextualEstimacion =
        "Aún no hay suficientes campañas cerradas de este cultivo para calcular la línea base o el modelo.";
    } else if (!cargandoDetalle && (!reg?.fechaSiembra || !reg?.variedad)) {
      mensajeContextualEstimacion =
        "Faltan variables de manejo (fecha de siembra o variedad) para personalizar la estimación.";
    } else if (areaClima && areaClima.conDato === 0) {
      mensajeContextualEstimacion =
        "Se necesitan más registros climáticos recientes para complementar la lectura en campo.";
    } else if (areaSuelo && areaSuelo.conDato < areaSuelo.indicadores.length) {
      mensajeContextualEstimacion =
        "Completa los indicadores de suelo pendientes para respaldar la interpretación técnica.";
    }
  }

  const tieneFiltrosActivos = filtroFinca !== "TODAS" || filtroCampana !== "TODAS";

  return (
    <div className="-mx-4 -my-6 min-h-full bg-fondo-suave px-4 py-6 text-tinta md:-mx-8 md:-my-8 md:px-8 md:py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* 1. ENCABEZADO Y FILTROS */}
        <header className="flex flex-col gap-4 rounded-tarjeta border border-borde bg-white p-5 shadow-xs lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-tinta sm:text-3xl">
              Resumen
            </h1>
            <p className="mt-0.5 text-sm text-tinta-suave">
              Estado de tus parcelas y de la operación
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="min-w-[175px] flex-1 sm:flex-initial">
              <label htmlFor="filtro-finca" className="sr-only">
                Filtrar por ubicación
              </label>
              <select
                id="filtro-finca"
                value={filtroFinca}
                onChange={(e) => setFiltroFinca(e.target.value)}
                className="min-h-11 w-full rounded-control border border-borde bg-fondo-suave px-3 text-sm font-medium text-tinta"
              >
                <option value="TODAS">Todas las ubicaciones</option>
                {fincasDisponibles.map((finca) => (
                  <option key={finca} value={finca}>
                    {finca}
                  </option>
                ))}
              </select>
            </div>

            <div className="min-w-[185px] flex-1 sm:flex-initial">
              <label htmlFor="filtro-campana" className="sr-only">
                Selector de campaña agrícola
              </label>
              <select
                id="filtro-campana"
                value={filtroCampana}
                onChange={(e) => setFiltroCampana(e.target.value)}
                className="min-h-11 w-full rounded-control border border-borde bg-fondo-suave px-3 text-sm font-medium text-tinta"
              >
                <option value="TODAS">Todas las campañas</option>
                {campanasDisponibles.temporadas.map((temp) => (
                  <option key={temp} value={temp}>
                    {temp}
                  </option>
                ))}
                {campanasDisponibles.haySinCampana && (
                  <option value="__SIN_CAMPANA__">Sin campaña activa</option>
                )}
              </select>
            </div>

            {(idsDemo?.size ?? 0) > 0 && (
              <button
                type="button"
                aria-pressed={mostrarDemo}
                onClick={() => setMostrarDemo((prev) => !prev)}
                className={`inline-flex min-h-11 items-center gap-2 rounded-control border px-3.5 text-xs font-bold transition-colors ${
                  mostrarDemo
                    ? "border-marca bg-marca-suave text-marca"
                    : "border-borde bg-white text-tinta hover:bg-fondo-suave"
                }`}
              >
                <FlaskConical className="h-4 w-4 shrink-0" aria-hidden />
                {mostrarDemo ? "Ocultar datos iniciales" : "Mostrar datos iniciales"}
                <span className="rounded-full bg-white px-2 py-0.5 text-xs ring-1 ring-borde">
                  {idsDemo?.size ?? 0}
                </span>
              </button>
            )}
          </div>
        </header>

        {errorParcelas ? (
          <p className="rounded-tarjeta border border-critico-borde/30 bg-critico-fondo p-4 text-sm text-critico-borde">
            {errorParcelas}
          </p>
        ) : parcelas === null ? (
          <div className="rounded-tarjeta border border-borde bg-white p-6 text-sm text-tinta-suave">
            Cargando el estado de tus parcelas...
          </div>
        ) : parcelas.length === 0 ? (
          <EstadoVacio titulo="Todavía no hay parcelas registradas">
            <p>Crea tu primera parcela para monitorear cultivos, suelo, clima y rendimiento.</p>
            {esJefe && (
              <p className="mt-3">
                <Link
                  href="/panel/parcelas"
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-control bg-marca px-4 text-sm font-semibold text-white hover:bg-marca-hover"
                >
                  <Plus className="h-4 w-4" aria-hidden />
                  Ir a Parcelas
                </Link>
              </p>
            )}
          </EstadoVacio>
        ) : (
          <>
            {/* 2. KPIs GENERALES + SALUD OPERATIVA GLOBAL */}
            <section aria-label="Indicadores generales y salud operativa">
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:col-span-7">
                  <TarjetaKpiEstado
                    titulo="Parcelas sin datos"
                    cantidad={conteo.SIN_DATOS}
                    total={totalParcelasVisibles}
                    subtitulo={
                      sinCampanaActiva > 0
                        ? `${sinCampanaActiva} sin campaña activa`
                        : "Falta información de monitoreo"
                    }
                    icono={CircleDashed}
                    acento="text-sindatos-texto"
                    bordeClase="border-sindatos-borde"
                    fondoIcono="bg-sindatos-fondo"
                    colorIcono="text-sindatos-icono"
                    colorBarra="bg-sindatos-icono"
                    punteado={conteo.SIN_DATOS > 0}
                  />

                  <TarjetaKpiEstado
                    titulo="Parcelas en buen estado"
                    cantidad={conteo.BIEN}
                    total={totalParcelasVisibles}
                    subtitulo={`${conCampanaEnCurso} ${
                      conCampanaEnCurso === 1 ? "campaña en curso" : "campañas en curso"
                    }`}
                    icono={CheckCircle2}
                    acento="text-marca"
                    bordeClase="border-borde"
                    fondoIcono="bg-marca-suave"
                    colorIcono="text-marca"
                    colorBarra="bg-marca"
                  />

                  <TarjetaKpiEstado
                    titulo="Parcelas en atención"
                    cantidad={conteo.ATENCION}
                    total={totalParcelasVisibles}
                    subtitulo={
                      alertasAtencion > 0
                        ? `${alertasAtencion} ${
                            alertasAtencion === 1 ? "alerta por revisar" : "alertas por revisar"
                          }`
                        : "Sin avisos preventivos"
                    }
                    icono={AlertTriangle}
                    acento="text-atencion-icono"
                    bordeClase="border-borde"
                    fondoIcono="bg-atencion-fondo"
                    colorIcono="text-atencion-icono"
                    colorBarra="bg-atencion-icono"
                  />

                  <TarjetaKpiEstado
                    titulo="Parcelas críticas"
                    cantidad={conteo.CRITICO}
                    total={totalParcelasVisibles}
                    subtitulo={
                      alertasCriticas > 0
                        ? `${alertasCriticas} ${
                            alertasCriticas === 1 ? "alerta crítica" : "alertas críticas"
                          }`
                        : "Sin incidencias críticas"
                    }
                    icono={OctagonAlert}
                    acento="text-critico-borde"
                    bordeClase="border-borde"
                    fondoIcono="bg-critico-fondo"
                    colorIcono="text-critico-borde"
                    colorBarra="bg-critico-borde"
                  />
                </div>

                <div className="xl:col-span-5">
                  <SaludOperativaChart
                    conteo={conteo}
                    hectareasTotales={hectareasTotalesFiltradas}
                  />
                </div>
              </div>
            </section>

            {/* 3. MIS PARCELAS (CARRUSEL HORIZONTAL) */}
            <section aria-labelledby="mis-parcelas-heading" className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2
                    id="mis-parcelas-heading"
                    className="text-lg font-bold text-tinta"
                  >
                    Mis Parcelas
                  </h2>
                  <p className="text-xs text-tinta-suave">
                    Mostrando {parcelasFiltradas.length} de {parcelas.length} parcelas activas.
                    Selecciona una para actualizar el detalle inferior.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {tieneFiltrosActivos && (
                    <button
                      type="button"
                      onClick={() => {
                        setFiltroFinca("TODAS");
                        setFiltroCampana("TODAS");
                      }}
                      className="min-h-10 rounded-control border border-borde bg-white px-3 text-sm font-semibold text-tinta hover:bg-marca-suave"
                    >
                      Limpiar filtros
                    </button>
                  )}
                  <button
                    type="button"
                    aria-label="Desplazar parcelas a la izquierda"
                    onClick={() => desplazarCarrusel("izq")}
                    className="flex h-10 w-10 items-center justify-center rounded-control border border-borde bg-white text-tinta hover:bg-marca-suave"
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    aria-label="Desplazar parcelas a la derecha"
                    onClick={() => desplazarCarrusel("der")}
                    className="flex h-10 w-10 items-center justify-center rounded-control border border-borde bg-white text-tinta hover:bg-marca-suave"
                  >
                    <ChevronRight className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              </div>

              {parcelasFiltradas.length === 0 ? (
                <div className="rounded-tarjeta border-2 border-dashed border-sindatos-borde bg-white p-6 text-center text-sm text-tinta-suave">
                  Ninguna parcela coincide con los filtros actuales.
                </div>
              ) : (
                <div
                  ref={carruselRef}
                  role="tablist"
                  aria-label="Selector de parcelas"
                  className="flex snap-x snap-mandatory gap-3.5 overflow-x-auto pb-2"
                >
                  {parcelasFiltradas.map((parcela) => {
                    const seleccionada = elegida?.parcelaId === parcela.parcelaId;
                    return (
                      <button
                        key={parcela.parcelaId}
                        id={`pestana-${parcela.parcelaId}`}
                        type="button"
                        role="tab"
                        aria-selected={seleccionada}
                        onClick={() => setElegidaId(parcela.parcelaId)}
                        className={`group flex w-64 shrink-0 snap-start flex-col overflow-hidden rounded-tarjeta bg-white text-left shadow-xs transition-all ${
                          seleccionada
                            ? "border-2 border-marca ring-2 ring-marca-suave"
                            : "border border-borde hover:border-marca/50"
                        }`}
                      >
                        {/* Cabecera visual representativa del lote */}
                        <div
                          className={`relative flex h-20 w-full items-end justify-between px-4 py-3 ${
                            seleccionada
                              ? "bg-gradient-to-br from-marca to-marca-hover text-white"
                              : "bg-marca-suave text-marca"
                          }`}
                        >
                          <div className="flex items-center gap-1.5 text-xs font-semibold">
                            <Sprout className="h-4 w-4 shrink-0" aria-hidden />
                            <span className="truncate">
                              {parcela.cultivoActual ?? "Sin cultivo activo"}
                            </span>
                          </div>
                          <span
                            title={`Estado: ${parcela.estado}`}
                            className={`h-3 w-3 shrink-0 rounded-full ring-2 ring-white ${
                              PUNTO_ESTADO[parcela.estado]
                            }`}
                          />
                        </div>

                        <div className="flex flex-1 flex-col justify-between gap-2 p-4">
                          <div>
                            <p className="truncate text-base font-bold text-tinta">
                              {parcela.nombre}
                            </p>
                            <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-tinta-suave">
                              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                              {parcela.ubicacion || "Sin ubicación"}
                            </p>
                          </div>

                          <div className="flex items-center justify-between border-t border-borde pt-2.5 text-xs">
                            <span className="font-bold text-tinta">
                              {parcela.hectareas} ha
                            </span>
                            <EstadoBadge estado={parcela.estado} tamano="sm" />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            {/* 4. DETALLE DE LA PARCELA SELECCIONADA (3 COLUMNAS) */}
            {elegida && (
              <section
                id="panel-parcela"
                role="tabpanel"
                aria-labelledby={`pestana-${elegida.parcelaId}`}
                className="rounded-tarjeta border border-borde bg-white p-5 shadow-xs sm:p-6"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-borde pb-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-marca">
                        Parcela seleccionada
                      </p>
                      <h2 className="text-xl font-bold text-tinta">{elegida.nombre}</h2>
                    </div>
                    <EstadoBadge estado={elegida.estado} tamano="md" />
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {esJefe && elegida.campanaActual ? (
                      <button
                        type="button"
                        onClick={() => setMostrarModalActividad(true)}
                        className="inline-flex min-h-11 items-center gap-1.5 rounded-control bg-marca px-4 text-sm font-semibold text-white hover:bg-marca-hover"
                      >
                        <Plus className="h-4 w-4 shrink-0" aria-hidden />
                        Registrar actividad
                      </button>
                    ) : (
                      <Link
                        href={`/panel/parcelas/${elegida.parcelaId}`}
                        className="inline-flex min-h-11 items-center gap-1.5 rounded-control bg-marca px-4 text-sm font-semibold text-white hover:bg-marca-hover"
                      >
                        <Plus className="h-4 w-4 shrink-0" aria-hidden />
                        Registrar actividad
                      </Link>
                    )}

                    <Link
                      href={`/panel/parcelas/${elegida.parcelaId}`}
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-control border border-borde bg-fondo-suave px-3.5 text-sm font-semibold text-tinta hover:bg-marca-suave hover:text-marca"
                    >
                      Ver detalle
                      <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
                    </Link>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
                  {/* COLUMNA 1: INFORMACIÓN GENERAL */}
                  <div className="space-y-3 rounded-tarjeta border border-borde bg-fondo-suave p-4">
                    <h3 className="text-sm font-bold text-tinta">Información general</h3>

                    <dl className="space-y-3 text-sm">
                      <div className="flex items-start gap-2.5">
                        <Ruler className="mt-0.5 h-4 w-4 shrink-0 text-marca" aria-hidden />
                        <div>
                          <dt className="text-xs text-tinta-suave">Superficie</dt>
                          <dd className="font-bold text-tinta">{elegida.hectareas} ha</dd>
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5">
                        <Sprout className="mt-0.5 h-4 w-4 shrink-0 text-marca" aria-hidden />
                        <div>
                          <dt className="text-xs text-tinta-suave">Cultivo</dt>
                          <dd className="font-bold text-tinta">
                            {elegida.cultivoActual ?? "Sin campaña activa"}
                          </dd>
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5">
                        <CalendarRange
                          className="mt-0.5 h-4 w-4 shrink-0 text-marca"
                          aria-hidden
                        />
                        <div>
                          <dt className="text-xs text-tinta-suave">Campaña</dt>
                          <dd className="font-bold text-tinta">
                            {elegida.campanaActual
                              ? `${elegida.campanaActual.temporada} (${
                                  ESTADO_CAMPANA_LABEL[elegida.campanaActual.estado]
                                })`
                              : "Sin campaña"}
                          </dd>
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5">
                        <Tag className="mt-0.5 h-4 w-4 shrink-0 text-marca" aria-hidden />
                        <div>
                          <dt className="text-xs text-tinta-suave">Variedad / semilla</dt>
                          <dd className="font-bold text-tinta">
                            {cargandoDetalle
                              ? "Consultando..."
                              : detalleActivo?.registroCosecha?.variedad?.trim() ||
                                "Sin especificar"}
                          </dd>
                        </div>
                      </div>
                    </dl>
                  </div>

                  {/* COLUMNA 2: ESTADO DE DATOS (Suelo, Labores, Clima) */}
                  <div className="space-y-3 rounded-tarjeta border border-borde bg-white p-4">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-bold text-tinta">Estado de datos</h3>
                      <span className="text-xs font-medium text-tinta-suave">
                        {elegida.areas.length - elegida.areasSinDatos} de {elegida.areas.length}{" "}
                        activas
                      </span>
                    </div>

                    <div className="space-y-3">
                      {elegida.areas.map((area) => {
                        const Icono = ICONO_AREA[area.id];
                        const totalInd = area.indicadores.length;
                        const pct =
                          totalInd > 0 ? Math.round((area.conDato / totalInd) * 100) : 0;
                        const soloRegistrada = areaSoloRegistrada(area);
                        const nombreCorto =
                          area.id === "CULTIVO" ? "Labores" : area.nombre;

                        return (
                          <Link
                            key={area.id}
                            href={`/panel/parcelas/${elegida.parcelaId}`}
                            className="block rounded-control border border-borde bg-fondo-suave p-3 transition-colors hover:border-marca/50"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-tinta">
                                <Icono
                                  className="h-4 w-4 text-marca"
                                  aria-hidden
                                />
                                {nombreCorto}
                              </span>

                              {soloRegistrada ? (
                                <ChipRegistrado texto="Datos registrados" />
                              ) : (
                                <EstadoBadge estado={area.estado} tamano="sm" />
                              )}
                            </div>

                            <div className="mt-2 flex items-center justify-between text-xs text-tinta-suave">
                              <span>
                                {area.conDato} de {totalInd} datos registrados
                              </span>
                              <span className="font-semibold text-tinta">{pct}%</span>
                            </div>

                            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white ring-1 ring-borde">
                              <div
                                className={`h-full rounded-full ${
                                  soloRegistrada
                                    ? "bg-marca"
                                    : COLOR_BARRA_AREA[area.estado]
                                }`}
                                style={{ width: `${area.conDato > 0 ? Math.max(8, pct) : 0}%` }}
                              />
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>

                  {/* COLUMNA 3: ESTIMACIÓN DE RENDIMIENTO */}
                  <div className="flex flex-col justify-between rounded-tarjeta border border-marca/30 bg-marca-suave/55 p-4">
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="flex items-center gap-1.5 text-sm font-bold text-tinta">
                          <LineChart className="h-4 w-4 text-marca" aria-hidden />
                          Estimación de rendimiento
                        </h3>
                        {bloqueModelo ? (
                          <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-bold text-marca ring-1 ring-marca/30">
                            {bloqueModelo.estado === "oficial"
                              ? `Modelo ${bloqueModelo.version_modelo ?? ""}`
                              : `Experimental ${bloqueModelo.version_modelo ?? ""}`}
                          </span>
                        ) : valorEstimadoTnHa !== null ? (
                          <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-bold text-tinta ring-1 ring-borde">
                            Línea base
                          </span>
                        ) : (
                          <EstadoBadge estado="SIN_DATOS" tamano="sm" />
                        )}
                      </div>

                      <div className="mt-4">
                        {cargandoDetalle ? (
                          <p className="text-sm text-tinta-suave">Calculando estimación...</p>
                        ) : valorEstimadoTnHa !== null ? (
                          <>
                            <p className="text-3xl font-extrabold tracking-tight text-tinta">
                              {valorEstimadoTnHa.toFixed(2)}{" "}
                              <span className="text-base font-bold text-tinta-suave">t/ha</span>
                            </p>
                            <p className="mt-1 text-xs font-semibold text-marca">
                              {produccionEstimadaTn !== null
                                ? `${produccionEstimadaTn.toFixed(2)} toneladas totales proyectadas`
                                : `${elegida.hectareas} ha registradas`}
                            </p>
                            <p className="mt-1 text-xs text-tinta-suave">
                              Referencia: {campanasReferencia}{" "}
                              {campanasReferencia === 1 ? "campaña histórica" : "campañas históricas"}
                            </p>
                          </>
                        ) : (
                          <p className="text-sm font-semibold text-tinta">
                            Estimación aún no disponible
                          </p>
                        )}
                      </div>

                      {mensajeContextualEstimacion && (
                        <div className="mt-4 rounded-control border border-borde bg-white/90 p-3 text-xs text-tinta-suave">
                          {mensajeContextualEstimacion}
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-2">
                      <Link
                        href={`/panel/parcelas/${elegida.parcelaId}?tab=estimacion`}
                        className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-control bg-white px-3 text-sm font-bold text-marca ring-1 ring-marca/30 hover:bg-marca hover:text-white"
                      >
                        Ver estimación completa
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                      </Link>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* 5. HISTORIAL Y PRÓXIMAS ACCIONES */}
            {elegida && (
              <section
                aria-label="Historial reciente y próximas acciones"
                className="grid grid-cols-1 gap-4 lg:grid-cols-2"
              >
                {/* Bloque 1: Último registro de labor */}
                <article className="flex flex-col justify-between rounded-tarjeta border border-borde bg-white p-5 shadow-xs">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="flex items-center gap-2 text-base font-bold text-tinta">
                        <History className="h-5 w-5 text-marca" aria-hidden />
                        Último registro de labor
                      </h2>
                      <span className="text-xs font-medium text-tinta-suave">
                        {elegida.nombre}
                      </span>
                    </div>

                    {cargandoDetalle ? (
                      <p className="mt-4 text-sm text-tinta-suave">Cargando última labor...</p>
                    ) : detalleActivo?.ultimaActividad ? (
                      <div className="mt-4 rounded-tarjeta border border-borde bg-fondo-suave p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="rounded-control bg-marca-suave px-2.5 py-1 text-xs font-bold text-marca">
                            {TIPO_ACTIVIDAD_LABEL[detalleActivo.ultimaActividad.tipo]}
                          </span>
                          <span className="text-xs font-semibold text-tinta-suave">
                            {formatearFecha(detalleActivo.ultimaActividad.fecha)}
                          </span>
                        </div>
                        <p className="mt-2 text-sm font-medium text-tinta">
                          {detalleActivo.ultimaActividad.descripcion}
                        </p>
                        <p className="mt-1 text-xs text-tinta-suave">
                          Total en la campaña: {detalleActivo.totalActividadesVigentes}{" "}
                          {detalleActivo.totalActividadesVigentes === 1
                            ? "labor registrada"
                            : "labores registradas"}
                        </p>
                      </div>
                    ) : elegida.ultimoRegistroLabor ? (
                      <div className="mt-4 rounded-tarjeta border border-borde bg-fondo-suave p-4 text-sm">
                        <p className="font-semibold text-tinta">
                          Última actividad: {formatearFecha(elegida.ultimoRegistroLabor)}
                        </p>
                        <p className="mt-1 text-xs text-tinta-suave">
                          Parcela: {elegida.nombre}
                        </p>
                      </div>
                    ) : (
                      <div className="mt-4 rounded-tarjeta border border-dashed border-sindatos-borde bg-fondo-suave p-4 text-sm text-tinta-suave">
                        <p className="font-medium text-tinta">
                          Sin labores registradas en {elegida.nombre}.
                        </p>
                        {resumen.ultimaCosecha && (
                          <p className="mt-1 text-xs">
                            Última cosecha en la finca:{" "}
                            <strong>{resumen.ultimaCosecha.parcelaNombre}</strong> (
                            {resumen.ultimaCosecha.rendimientoTnHa} t/ha ·{" "}
                            {formatearFecha(resumen.ultimaCosecha.fecha)})
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-borde pt-3 text-xs text-tinta-suave">
                    <span className="inline-flex items-center gap-1.5">
                      <Tractor className="h-4 w-4 text-marca" aria-hidden />
                      {resumen.campanasEnCurso}{" "}
                      {resumen.campanasEnCurso === 1
                        ? "campaña en curso"
                        : "campañas en curso"}{" "}
                      en la operación
                    </span>
                    <Link
                      href={`/panel/parcelas/${elegida.parcelaId}`}
                      className="inline-flex min-h-11 items-center font-semibold text-marca hover:underline"
                    >
                      Ir a bitácora
                    </Link>
                  </div>
                </article>

                {/* Bloque 2: Próximas acciones */}
                <article className="flex flex-col justify-between rounded-tarjeta border border-borde bg-white p-5 shadow-xs">
                  <div>
                    <h2 className="flex items-center gap-2 text-base font-bold text-tinta">
                      <ClipboardCheck className="h-5 w-5 text-marca" aria-hidden />
                      Próximas acciones
                    </h2>

                    {accionesPendientes.length > 0 ? (
                      <ul className="mt-3 space-y-2">
                        {accionesPendientes.slice(0, 3).map((accion) => (
                          <li
                            key={accion.texto}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-borde bg-fondo-suave px-3 py-2.5 text-xs"
                          >
                            <span className="font-medium text-tinta">{accion.texto}</span>
                            <Link
                              href={accion.href}
                              className="inline-flex min-h-11 shrink-0 items-center font-bold text-marca hover:underline"
                            >
                              {accion.accionEtiqueta} →
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="mt-3 rounded-control border border-marca/30 bg-marca-suave px-3.5 py-3 text-xs font-medium text-marca">
                        Los datos clave de {elegida.nombre} están completos.
                      </div>
                    )}

                    {resumen.proximasCosechas.length > 0 && (
                      <div className="mt-3 flex items-center justify-between gap-2 rounded-control border border-borde bg-white px-3 py-2 text-xs">
                        <span className="inline-flex items-center gap-1.5 text-tinta-suave">
                          <CalendarClock className="h-3.5 w-3.5 text-marca" aria-hidden />
                          Próxima cosecha:
                          <strong className="text-tinta">
                            {resumen.proximasCosechas[0].parcelaNombre} (
                            {resumen.proximasCosechas[0].cultivoNombre})
                          </strong>
                        </span>
                        <span className="font-semibold text-tinta">
                          {formatearFecha(resumen.proximasCosechas[0].fechaFin)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-2">
                    <Link
                      href={`/panel/parcelas/${elegida.parcelaId}`}
                      className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-control bg-marca px-4 text-sm font-semibold text-white hover:bg-marca-hover"
                    >
                      <SlidersHorizontal className="h-4 w-4 shrink-0" aria-hidden />
                      Ver detalle de la parcela
                    </Link>
                  </div>
                </article>
              </section>
            )}
          </>
        )}
      </div>

      {/* Modal rápido para registrar actividad sin salir del Dashboard */}
      {mostrarModalActividad && elegida && elegida.campanaActual && (
        <ActividadForm
          parcelaId={elegida.parcelaId}
          campanaId={elegida.campanaActual.id}
          hectareasParcela={elegida.hectareas}
          registroCosecha={detalleActivo?.registroCosecha ?? null}
          corrigiendo={null}
          onClose={() => setMostrarModalActividad(false)}
          onSaved={() => {
            setMostrarModalActividad(false);
            setVersionRecarga((v) => v + 1);
          }}
        />
      )}
    </div>
  );
}
