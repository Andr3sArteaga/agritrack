"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api, apiErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatearFecha } from "@/lib/format";
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
import { ActividadForm } from "./actividad-form";

const ESTADOS: EstadoCampana[] = ["PLANIFICADA", "EN_CURSO", "COSECHADA"];

export default function ParcelaPrivadaDetallePage() {
  const params = useParams<{ id: string }>();
  const parcelaId = params.id;
  const { usuario } = useAuth();
  const esJefe = usuario?.rol === "JEFE";
  const puedeRegistrarActividad = usuario?.rol === "JEFE" || usuario?.rol === "OPERATIVO";

  const [parcela, setParcela] = useState<Parcela | null>(null);
  const [cultivos, setCultivos] = useState<Cultivo[]>([]);
  const [campanas, setCampanas] = useState<Campana[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [campanaAbierta, setCampanaAbierta] = useState<string | null>(null);
  const [actividades, setActividades] = useState<Actividad[]>([]);

  const [mostrarFormCampana, setMostrarFormCampana] = useState(false);
  const [mostrarFormActividad, setMostrarFormActividad] = useState(false);
  const [corrigiendo, setCorrigiendo] = useState<Actividad | null>(null);

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

  function toggleCampana(campanaId: string) {
    if (campanaAbierta === campanaId) {
      setCampanaAbierta(null);
      setActividades([]);
    } else {
      setCampanaAbierta(campanaId);
      cargarActividades(campanaId);
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

  return (
    <div className="space-y-6">
      <div>
        <Link href="/panel/parcelas" className="text-sm text-stone-500 hover:text-stone-700">
          ← Volver a parcelas
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-stone-900">{parcela.nombre}</h1>
        <p className="mt-1 text-stone-600">
          {parcela.hectareas} ha · {parcela.ubicacionTexto}
        </p>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-stone-900">Campañas</h2>
        {esJefe && (
          <button
            onClick={() => setMostrarFormCampana(true)}
            className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
          >
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
              className="flex w-full items-center justify-between px-5 py-4 text-left"
            >
              <div>
                <p className="font-medium text-stone-900">
                  {campana.temporada} · {cultivoNombre(campana.cultivoId)}
                </p>
                <p className="text-sm text-stone-500">
                  {formatearFecha(campana.fechaInicio)} – {formatearFecha(campana.fechaFin)}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  campana.estado === "EN_CURSO"
                    ? "bg-emerald-100 text-emerald-800"
                    : campana.estado === "COSECHADA"
                      ? "bg-stone-200 text-stone-700"
                      : "bg-amber-100 text-amber-800"
                }`}
              >
                {ESTADO_CAMPANA_LABEL[campana.estado]}
              </span>
            </button>

            {campanaAbierta === campana.id && (
              <div className="border-t border-stone-100 px-5 py-4">
                {esJefe && (
                  <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-stone-500">Cambiar estado:</span>
                    {ESTADOS.map((estado) => (
                      <button
                        key={estado}
                        disabled={estado === campana.estado}
                        onClick={() => cambiarEstado(campana, estado)}
                        className="rounded-md border border-stone-300 px-2.5 py-1 text-xs text-stone-700 hover:bg-stone-100 disabled:opacity-40"
                      >
                        {ESTADO_CAMPANA_LABEL[estado]}
                      </button>
                    ))}
                    <button
                      onClick={() => eliminarCampana(campana)}
                      className="ml-auto text-xs text-red-600 hover:text-red-800"
                    >
                      Eliminar campaña
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-stone-900">Actividades</h3>
                  {puedeRegistrarActividad && (
                    <button
                      onClick={() => {
                        setCorrigiendo(null);
                        setMostrarFormActividad(true);
                      }}
                      className="text-sm font-medium text-emerald-700 hover:text-emerald-800"
                    >
                      + Registrar actividad
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
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          #{actividad.secuencia} {TIPO_ACTIVIDAD_LABEL[actividad.tipo]} ·{" "}
                          {formatearFecha(actividad.fecha)}
                          {actividad.tipo === "COSECHA" && actividad.rendimientoTnHa !== null && (
                            <> · {actividad.rendimientoTnHa} t/ha</>
                          )}
                        </span>
                        {actividad.vigente && puedeRegistrarActividad && (
                          <button
                            onClick={() => {
                              setCorrigiendo(actividad);
                              setMostrarFormActividad(true);
                            }}
                            className="text-xs font-medium text-amber-700 hover:text-amber-900 no-underline"
                          >
                            Corregir
                          </button>
                        )}
                      </div>
                      <p className={actividad.vigente ? "text-stone-600" : ""}>
                        {actividad.descripcion}
                      </p>
                      {!actividad.vigente && (
                        <p className="text-xs italic text-stone-400">Reemplazada por una corrección</p>
                      )}
                      {actividad.correccionDeId && (
                        <p className="text-xs text-amber-700 no-underline">
                          Corrige a #{actividades.find((a) => a.id === actividad.correccionDeId)?.secuencia ?? "?"}
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
          campanaId={campanaAbierta}
          corrigiendo={corrigiendo}
          onClose={() => setMostrarFormActividad(false)}
          onSaved={() => {
            setMostrarFormActividad(false);
            cargarActividades(campanaAbierta);
            cargarCampanas();
          }}
        />
      )}
    </div>
  );
}
