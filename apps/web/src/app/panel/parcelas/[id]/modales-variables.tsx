"use client";

import dynamic from "next/dynamic";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  CircleDashed,
  ClipboardList,
  CloudRain,
  Plus,
  SlidersHorizontal,
  Sprout,
  TestTubes,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Modal } from "@/components/modal";
import { formatearFecha } from "@/lib/format";
import type { RegistroCosechaCampana } from "@/lib/prediccion";
import {
  CONDICION_CLIMA_LABEL,
  type AnalisisSuelo,
  type Campana,
  type PoligonoGeoJson,
  type RegistroClima,
} from "@/lib/types";
import type {
  DimensionEstadoRegistro,
  EstadoRegistroItem,
  EvaluacionRegistroParcela,
} from "./estado-registro-parcela";

const ParcelaMiniMapa = dynamic(
  () => import("@/components/map/parcela-mini-mapa").then((m) => m.ParcelaMiniMapa),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-64 items-center justify-center rounded-control bg-fondo-suave text-sm text-tinta-suave">
        Cargando mapa de la parcela...
      </div>
    ),
  },
);

const ESTILO_ESTADO: Record<
  EstadoRegistroItem,
  {
    etiqueta: string;
    icono: LucideIcon;
    clases: string;
    iconoClase: string;
  }
> = {
  COMPLETO: {
    etiqueta: "Completo",
    icono: CheckCircle2,
    clases: "border-marca/40 bg-marca-suave text-marca",
    iconoClase: "text-marca",
  },
  INCOMPLETO: {
    etiqueta: "Incompleto",
    icono: AlertTriangle,
    clases: "border-atencion-icono/60 bg-atencion-fondo text-atencion-texto",
    iconoClase: "text-atencion-icono",
  },
  SIN_DATOS: {
    etiqueta: "Sin datos",
    icono: CircleDashed,
    clases: "border-dashed border-sindatos-borde bg-fondo text-tinta-suave",
    iconoClase: "text-tinta-suave",
  },
};

export function BadgeEstadoRegistro({
  estado,
  tamano = "sm",
}: {
  estado: EstadoRegistroItem;
  tamano?: "sm" | "md";
}) {
  const cfg = ESTILO_ESTADO[estado];
  const Icono = cfg.icono;
  const padding = tamano === "md" ? "px-3 py-1 text-sm" : "px-2.5 py-0.5 text-xs";
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border font-bold ${cfg.clases} ${padding}`}
    >
      <Icono className={`h-3.5 w-3.5 shrink-0 ${cfg.iconoClase}`} aria-hidden />
      {cfg.etiqueta}
    </span>
  );
}

export function ModalHistorialSuelo({
  suelo,
  evaluacion,
  puedeEditar,
  onRegistrarSuelo,
  onClose,
}: {
  suelo: AnalisisSuelo[];
  evaluacion: EvaluacionRegistroParcela;
  puedeEditar: boolean;
  onRegistrarSuelo: () => void;
  onClose: () => void;
}) {
  return (
    <Modal titulo="Suelo · Análisis e indicadores registrados" ancho="3xl" onClose={onClose}>
      <div className="space-y-5 pb-6">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-tarjeta border border-borde bg-fondo-suave p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-control bg-marca-suave text-marca">
              <TestTubes className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <p className="text-sm font-bold text-tinta">
                Cobertura actual: {evaluacion.sueloConDato} de 6 indicadores
              </p>
              <p className="text-xs text-tinta-suave">
                {suelo.length} {suelo.length === 1 ? "análisis registrado" : "análisis registrados"}{" "}
                en esta parcela
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <BadgeEstadoRegistro estado={evaluacion.estadoSuelo} tamano="md" />
            {puedeEditar && (
              <button
                type="button"
                onClick={onRegistrarSuelo}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-control bg-marca px-4 text-sm font-semibold text-white hover:bg-marca-hover"
              >
                <Plus className="h-4 w-4" aria-hidden />
                Registrar análisis de suelo
              </button>
            )}
          </div>
        </div>

        {/* Estado actual de los 6 indicadores */}
        <div>
          <h3 className="text-sm font-bold text-tinta">Últimos valores por indicador</h3>
          <div className="mt-2 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            {evaluacion.indicadoresSuelo.map((ind) => (
              <div
                key={ind.campo}
                className={`rounded-control border p-3 ${
                  ind.valor !== null
                    ? "border-borde bg-white"
                    : "border-dashed border-sindatos-borde bg-fondo-suave"
                }`}
              >
                <p className="text-xs font-medium text-tinta-suave">{ind.etiqueta}</p>
                <p className="mt-1 text-lg font-bold text-tinta">
                  {ind.valor !== null ? `${ind.valor} ${ind.unidad}`.trim() : "Sin dato"}
                </p>
                <p className="mt-0.5 text-xs text-tinta-suave">
                  {ind.fecha ? `Medido: ${formatearFecha(ind.fecha)}` : "Pendiente de carga"}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Historial cronológico de análisis */}
        <div>
          <h3 className="text-sm font-bold text-tinta">Historial de análisis</h3>
          {suelo.length === 0 ? (
            <div className="mt-2 rounded-tarjeta border border-dashed border-sindatos-borde bg-fondo-suave p-5 text-center">
              <p className="text-sm font-medium text-tinta">
                Todavía no hay análisis de suelo registrados.
              </p>
              <p className="mt-1 text-xs text-tinta-suave">
                Registra un análisis de laboratorio o humedad medida en campo para dar seguimiento a
                la parcela.
              </p>
            </div>
          ) : (
            <div className="mt-2 space-y-2.5">
              {suelo.map((item) => (
                <div
                  key={item.id}
                  className="rounded-tarjeta border border-borde bg-white p-3.5 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 font-bold text-tinta">
                      <Calendar className="h-4 w-4 text-marca" aria-hidden />
                      {formatearFecha(item.fecha)}
                    </span>
                    <span className="text-xs text-tinta-suave">
                      {[
                        item.ph !== null ? `pH ${item.ph}` : null,
                        item.materiaOrganica !== null ? `MO ${item.materiaOrganica}%` : null,
                        item.humedad !== null ? `Hum. ${item.humedad}%` : null,
                        item.nitrogeno !== null ? `N ${item.nitrogeno} ppm` : null,
                        item.fosforo !== null ? `P ${item.fosforo} ppm` : null,
                        item.potasio !== null ? `K ${item.potasio} ppm` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </div>
                  {item.notas && (
                    <p className="mt-1.5 text-xs text-tinta-suave">Nota: {item.notas}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

export function ModalHistorialClima({
  clima,
  evaluacion,
  puedeEditar,
  onRegistrarClima,
  onClose,
}: {
  clima: RegistroClima[];
  evaluacion: EvaluacionRegistroParcela;
  puedeEditar: boolean;
  onRegistrarClima: () => void;
  onClose: () => void;
}) {
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  const filtrados = useMemo(
    () =>
      clima.filter((item) => {
        const f = item.fecha.slice(0, 10);
        if (desde && f < desde) return false;
        if (hasta && f > hasta) return false;
        return true;
      }),
    [clima, desde, hasta],
  );

  return (
    <Modal titulo="Clima · Mediciones climáticas y precipitación" ancho="3xl" onClose={onClose}>
      <div className="space-y-5 pb-6">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-tarjeta border border-borde bg-fondo-suave p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-control bg-marca-suave text-marca">
              <CloudRain className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <p className="text-sm font-bold text-tinta">
                {evaluacion.clima30d.length} registros en los últimos 30 días
              </p>
              <p className="text-xs text-tinta-suave">
                Lluvia acumulada (30d): {evaluacion.lluvia30dMm} mm · Eventos adversos:{" "}
                {evaluacion.eventosAdversos30d}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <BadgeEstadoRegistro estado={evaluacion.estadoClima} tamano="md" />
            {puedeEditar && (
              <button
                type="button"
                onClick={onRegistrarClima}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-control bg-marca px-4 text-sm font-semibold text-white hover:bg-marca-hover"
              >
                <Plus className="h-4 w-4" aria-hidden />
                Registrar clima
              </button>
            )}
          </div>
        </div>

        {/* Filtro por fechas */}
        {clima.length > 0 && (
          <div className="grid grid-cols-1 gap-3 rounded-tarjeta border border-borde bg-white p-3.5 sm:grid-cols-3">
            <div>
              <label htmlFor="clima-filtro-desde" className="block text-xs font-bold text-tinta-suave">
                Desde
              </label>
              <input
                id="clima-filtro-desde"
                type="date"
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
                className="mt-1 min-h-11 w-full rounded-control border border-borde px-3 text-sm"
              />
            </div>
            <div>
              <label htmlFor="clima-filtro-hasta" className="block text-xs font-bold text-tinta-suave">
                Hasta
              </label>
              <input
                id="clima-filtro-hasta"
                type="date"
                value={hasta}
                onChange={(e) => setHasta(e.target.value)}
                className="mt-1 min-h-11 w-full rounded-control border border-borde px-3 text-sm"
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => {
                  setDesde("");
                  setHasta("");
                }}
                disabled={!desde && !hasta}
                className="min-h-11 w-full rounded-control border border-borde px-3 text-sm font-semibold text-tinta hover:bg-fondo-suave disabled:opacity-40"
              >
                Limpiar filtro ({filtrados.length} de {clima.length})
              </button>
            </div>
          </div>
        )}

        {/* Tabla compacta */}
        {filtrados.length === 0 ? (
          <div className="rounded-tarjeta border border-dashed border-sindatos-borde bg-fondo-suave p-5 text-center">
            <p className="text-sm font-medium text-tinta">
              {clima.length === 0
                ? "Todavía no se registraron condiciones climáticas."
                : "No hay registros climáticos en el rango de fechas seleccionado."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-tarjeta border border-borde">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-borde bg-fondo-suave text-xs font-bold uppercase text-tinta-suave">
                <tr>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Condición</th>
                  <th className="px-4 py-3">Lluvia (mm)</th>
                  <th className="px-4 py-3">Notas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borde bg-white">
                {filtrados.map((item) => (
                  <tr key={item.id}>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-tinta">
                      {formatearFecha(item.fecha)}
                    </td>
                    <td className="px-4 py-3 text-tinta">
                      {CONDICION_CLIMA_LABEL[item.condicion]}
                    </td>
                    <td className="px-4 py-3 text-tinta">
                      {item.lluviaMm !== null ? `${item.lluviaMm} mm` : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-tinta-suave">
                      {item.notas || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Modal>
  );
}

export function ModalManejoCultivo({
  campana,
  registro,
  evaluacion,
  puedeEditar,
  onEditarSiembra,
  onRegistrarCosecha,
  onClose,
}: {
  campana: Campana | null;
  registro: RegistroCosechaCampana | null;
  evaluacion: EvaluacionRegistroParcela;
  puedeEditar: boolean;
  onEditarSiembra: () => void;
  onRegistrarCosecha: () => void;
  onClose: () => void;
}) {
  const rendimientoReal =
    registro &&
    registro.toneladas !== null &&
    registro.haCosechadas !== null &&
    registro.haCosechadas > 0
      ? Math.round((registro.toneladas / registro.haCosechadas) * 100) / 100
      : null;

  return (
    <Modal
      titulo={`Manejo del cultivo${campana ? ` · ${campana.temporada}` : ""}`}
      ancho="2xl"
      onClose={onClose}
    >
      <div className="space-y-5 pb-6">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-tarjeta border border-borde bg-fondo-suave p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-control bg-marca-suave text-marca">
              <Sprout className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <p className="text-sm font-bold text-tinta">
                Variables del modelo predictivo y cierre de campaña
              </p>
              <p className="text-xs text-tinta-suave">
                {evaluacion.manejoConDato}/3 variables de establecimiento registradas
              </p>
            </div>
          </div>
          <BadgeEstadoRegistro estado={evaluacion.estadoManejo} tamano="md" />
        </div>

        {!campana ? (
          <div className="rounded-tarjeta border border-dashed border-sindatos-borde bg-fondo-suave p-5 text-center text-sm text-tinta-suave">
            Esta parcela aún no tiene una campaña activa seleccionada para configurar el manejo del
            cultivo.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-tarjeta border border-borde bg-white p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-tinta">
                    Establecimiento / Pre-siembra (Modelo IA)
                  </h3>
                </div>
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between gap-2 border-b border-borde pb-1.5">
                    <dt className="text-tinta-suave">Superficie sembrada</dt>
                    <dd className="font-semibold text-tinta">
                      {registro && registro.haSembradas > 0 ? `${registro.haSembradas} ha` : "Sin dato"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2 border-b border-borde pb-1.5">
                    <dt className="text-tinta-suave">Fecha de siembra</dt>
                    <dd className="font-semibold text-tinta">
                      {registro?.fechaSiembra ? formatearFecha(registro.fechaSiembra) : "Sin dato"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-tinta-suave">Variedad / semilla</dt>
                    <dd className="font-semibold text-tinta">
                      {registro?.variedad?.trim() || "Sin dato"}
                    </dd>
                  </div>
                </dl>
                {puedeEditar && (
                  <button
                    type="button"
                    onClick={onEditarSiembra}
                    className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-control bg-marca px-4 text-sm font-semibold text-white hover:bg-marca-hover"
                  >
                    <SlidersHorizontal className="h-4 w-4" aria-hidden />
                    Editar variables de siembra
                  </button>
                )}
              </div>

              <div className="rounded-tarjeta border border-borde bg-white p-4">
                <h3 className="text-sm font-bold text-tinta">Resultados de cosecha</h3>
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between gap-2 border-b border-borde pb-1.5">
                    <dt className="text-tinta-suave">Fecha de cosecha</dt>
                    <dd className="font-semibold text-tinta">
                      {registro?.fechaCosecha ? formatearFecha(registro.fechaCosecha) : "Pendiente"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2 border-b border-borde pb-1.5">
                    <dt className="text-tinta-suave">Superficie cosechada</dt>
                    <dd className="font-semibold text-tinta">
                      {registro?.haCosechadas !== null && registro?.haCosechadas !== undefined
                        ? `${registro.haCosechadas} ha`
                        : "Pendiente"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2 border-b border-borde pb-1.5">
                    <dt className="text-tinta-suave">Toneladas cosechadas</dt>
                    <dd className="font-semibold text-tinta">
                      {registro?.toneladas !== null && registro?.toneladas !== undefined
                        ? `${registro.toneladas} t`
                        : "Pendiente"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-tinta-suave">Rendimiento real</dt>
                    <dd className="font-bold text-marca">
                      {rendimientoReal !== null ? `${rendimientoReal.toFixed(2)} t/ha` : "Pendiente"}
                    </dd>
                  </div>
                </dl>
                {puedeEditar && (
                  <button
                    type="button"
                    onClick={onRegistrarCosecha}
                    className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-control border border-marca bg-white px-4 text-sm font-semibold text-marca hover:bg-marca-suave"
                  >
                    Registrar / Editar cosecha
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

export function ModalObservaciones({
  evaluacion,
  puedeEditar,
  hasCampanaActiva,
  onAgregarNotaSuelo,
  onAgregarNotaClima,
  onAgregarActividad,
  onClose,
}: {
  evaluacion: EvaluacionRegistroParcela;
  puedeEditar: boolean;
  hasCampanaActiva: boolean;
  onAgregarNotaSuelo: () => void;
  onAgregarNotaClima: () => void;
  onAgregarActividad: () => void;
  onClose: () => void;
}) {
  const [filtroOrigen, setFiltroOrigen] = useState<"Todos" | "Suelo" | "Clima" | "Actividad">(
    "Todos",
  );

  const lista = useMemo(
    () =>
      filtroOrigen === "Todos"
        ? evaluacion.observaciones
        : evaluacion.observaciones.filter((o) => o.origen === filtroOrigen),
    [evaluacion.observaciones, filtroOrigen],
  );

  return (
    <Modal titulo="Observaciones y notas de campo" ancho="3xl" onClose={onClose}>
      <div className="space-y-4 pb-6">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-tarjeta border border-borde bg-fondo-suave p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-control bg-marca-suave text-marca">
              <ClipboardList className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <p className="text-sm font-bold text-tinta">
                {evaluacion.observaciones.length}{" "}
                {evaluacion.observaciones.length === 1
                  ? "observación registrada"
                  : "observaciones registradas"}
              </p>
              <p className="text-xs text-tinta-suave">
                Consolidado automático de notas en suelo, clima y bitácora de labores.
              </p>
            </div>
          </div>

          {puedeEditar && (
            <div className="flex flex-wrap gap-2">
              {hasCampanaActiva && (
                <button
                  type="button"
                  onClick={onAgregarActividad}
                  className="inline-flex min-h-11 items-center gap-1 rounded-control bg-marca px-3 text-sm font-semibold text-white hover:bg-marca-hover"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden />
                  Nota en labor
                </button>
              )}
              <button
                type="button"
                onClick={onAgregarNotaSuelo}
                className="inline-flex min-h-11 items-center gap-1 rounded-control border border-borde bg-white px-3 text-sm font-semibold text-tinta hover:bg-fondo-suave"
              >
                + Nota suelo
              </button>
              <button
                type="button"
                onClick={onAgregarNotaClima}
                className="inline-flex min-h-11 items-center gap-1 rounded-control border border-borde bg-white px-3 text-sm font-semibold text-tinta hover:bg-fondo-suave"
              >
                + Nota clima
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {(["Todos", "Actividad", "Suelo", "Clima"] as const).map((origen) => {
            const activo = filtroOrigen === origen;
            return (
              <button
                key={origen}
                type="button"
                onClick={() => setFiltroOrigen(origen)}
                className={`min-h-11 rounded-control border px-3 text-xs font-semibold ${
                  activo
                    ? "border-marca bg-marca-suave text-marca"
                    : "border-borde bg-white text-tinta-suave hover:text-tinta"
                }`}
              >
                {origen}
              </button>
            );
          })}
        </div>

        {lista.length === 0 ? (
          <div className="rounded-tarjeta border border-dashed border-sindatos-borde bg-fondo-suave p-5 text-center text-sm text-tinta-suave">
            No hay observaciones registradas bajo este filtro.
          </div>
        ) : (
          <ul className="space-y-2.5">
            {lista.map((obs) => (
              <li
                key={obs.id}
                className="rounded-tarjeta border border-borde bg-white p-3.5 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded-control bg-marca-suave px-2 py-0.5 text-xs font-bold text-marca">
                      {obs.origen}
                    </span>
                    <span className="font-semibold text-tinta">{obs.titulo}</span>
                  </div>
                  <span className="text-xs text-tinta-suave">{formatearFecha(obs.fecha)}</span>
                </div>
                <p className="mt-1.5 text-sm text-tinta-suave">{obs.detalle}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}

export function ModalDetalleCompletitud({
  evaluacion,
  puedeEditar,
  esJefe,
  onAccionDimension,
  onClose,
}: {
  evaluacion: EvaluacionRegistroParcela;
  puedeEditar: boolean;
  esJefe: boolean;
  onAccionDimension: (id: DimensionEstadoRegistro["id"]) => void;
  onClose: () => void;
}) {
  return (
    <Modal titulo="Estado del registro · ¿Qué falta completar?" ancho="2xl" onClose={onClose}>
      <div className="space-y-4 pb-6">
        <p className="text-sm text-tinta-suave">
          Este resumen verifica la disponibilidad real de datos agrícolas de la parcela antes de
          interpretar la estimación de rendimiento.
        </p>

        <div className="space-y-3">
          {evaluacion.dimensiones.map((dim) => {
            const puedeEjecutar =
              dim.id === "general" ? esJefe : puedeEditar;
            return (
              <div
                key={dim.id}
                className={`rounded-tarjeta border p-4 ${
                  dim.estado === "SIN_DATOS"
                    ? "border-dashed border-sindatos-borde bg-fondo-suave"
                    : "border-borde bg-white"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-tinta">{dim.nombre}</h3>
                    <p className="text-xs text-tinta-suave">{dim.resumen}</p>
                  </div>
                  <BadgeEstadoRegistro estado={dim.estado} tamano="sm" />
                </div>

                {dim.faltantes.length > 0 ? (
                  <div className="mt-3 flex flex-wrap items-end justify-between gap-3 border-t border-borde pt-3">
                    <ul className="list-disc space-y-1 pl-4 text-xs text-tinta-suave">
                      {dim.faltantes.map((f) => (
                        <li key={f}>{f}</li>
                      ))}
                    </ul>
                    {puedeEjecutar && dim.accionLabel && (
                      <button
                        type="button"
                        onClick={() => onAccionDimension(dim.id)}
                        className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-control bg-marca px-3.5 text-sm font-semibold text-white hover:bg-marca-hover"
                      >
                        {dim.accionLabel}
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="mt-2 text-xs font-medium text-marca">
                    Todos los datos esperados en esta categoría están registrados.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}

export function ModalMapaParcela({
  nombre,
  poligono,
  onClose,
}: {
  nombre: string;
  poligono: PoligonoGeoJson;
  onClose: () => void;
}) {
  return (
    <Modal titulo={`Ubicación geográfica · ${nombre}`} ancho="3xl" onClose={onClose}>
      <div className="space-y-3 pb-6">
        <ParcelaMiniMapa poligono={poligono} />
      </div>
    </Modal>
  );
}
