"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api, apiErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Campana, Cultivo, Parcela } from "@/lib/types";
import { ParcelaForm } from "./parcela-form";

const ParcelasMapa = dynamic(
  () => import("@/components/map/parcelas-mapa").then((m) => m.ParcelasMapa),
  { ssr: false, loading: () => <p className="text-sm text-stone-500">Cargando mapa...</p> },
);

function calcularCultivoActualPorParcela(
  campanas: Campana[],
  cultivos: Cultivo[],
): Record<string, string | null> {
  const nombreCultivo = new Map(cultivos.map((c) => [c.id, c.nombre]));
  const resultado: Record<string, string | null> = {};

  const porParcela = new Map<string, Campana[]>();
  for (const campana of campanas) {
    const lista = porParcela.get(campana.parcelaId) ?? [];
    lista.push(campana);
    porParcela.set(campana.parcelaId, lista);
  }

  for (const [parcelaId, lista] of porParcela) {
    const enCurso = lista.find((c) => c.estado === "EN_CURSO");
    const actual =
      enCurso ??
      lista
        .filter((c) => c.estado === "PLANIFICADA")
        .sort((a, b) => a.fechaInicio.localeCompare(b.fechaInicio))[0];
    resultado[parcelaId] = actual ? nombreCultivo.get(actual.cultivoId) ?? null : null;
  }

  return resultado;
}

export default function ParcelasPage() {
  const { usuario } = useAuth();
  const puedeEditar = usuario?.rol === "JEFE";

  const [parcelas, setParcelas] = useState<Parcela[]>([]);
  const [cultivoActualPorParcela, setCultivoActualPorParcela] = useState<
    Record<string, string | null>
  >({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editando, setEditando] = useState<Parcela | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);

  const cargar = useCallback(() => {
    setCargando(true);
    Promise.all([
      api.get<Parcela[]>("/parcelas"),
      api.get<Campana[]>("/campanas"),
      api.get<Cultivo[]>("/cultivos"),
    ])
      .then(([parcelasRes, campanasRes, cultivosRes]) => {
        setParcelas(parcelasRes.data);
        setCultivoActualPorParcela(
          calcularCultivoActualPorParcela(campanasRes.data, cultivosRes.data),
        );
      })
      .catch((err) => setError(apiErrorMessage(err, "No se pudieron cargar las parcelas")))
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => {
    // cargar() fija setCargando(true) de forma sincrona antes del fetch;
    // es el patron estandar de "fetch on mount" y no afecta la hidratacion.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar();
  }, [cargar]);

  async function toggleActiva(parcela: Parcela) {
    try {
      if (parcela.activa) {
        await api.delete(`/parcelas/${parcela.id}`);
      } else {
        await api.patch(`/parcelas/${parcela.id}`, { activa: true });
      }
      cargar();
    } catch (err) {
      alert(apiErrorMessage(err, "No se pudo actualizar la parcela"));
    }
  }

  async function togglePreventa(parcela: Parcela) {
    try {
      await api.patch(`/parcelas/${parcela.id}`, {
        disponibleParaPreventa: !parcela.disponibleParaPreventa,
      });
      cargar();
    } catch (err) {
      alert(apiErrorMessage(err, "No se pudo actualizar la preventa"));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Parcelas</h1>
          <p className="mt-1 text-stone-600">
            {puedeEditar
              ? "Gestiona las parcelas y su disponibilidad para preventa"
              : "Listado de parcelas"}
          </p>
        </div>
        {puedeEditar && (
          <button
            onClick={() => setMostrarForm(true)}
            className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            Nueva parcela
          </button>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {!cargando && parcelas.some((p) => p.poligono) && (
        <div className="overflow-hidden rounded-lg border border-stone-200">
          <ParcelasMapa
            parcelas={parcelas}
            cultivoActualPorParcela={cultivoActualPorParcela}
          />
        </div>
      )}
      {cargando ? (
        <p className="text-stone-500">Cargando...</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-left text-stone-500">
              <tr>
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Hectáreas</th>
                <th className="px-4 py-3 font-medium">Ubicación</th>
                <th className="px-4 py-3 font-medium">Preventa</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {parcelas.map((parcela) => (
                <tr key={parcela.id} className={!parcela.activa ? "opacity-50" : ""}>
                  <td className="px-4 py-3">
                    <Link
                      href={`/panel/parcelas/${parcela.id}`}
                      className="font-medium text-emerald-700 hover:underline"
                    >
                      {parcela.nombre}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{parcela.hectareas} ha</td>
                  <td className="px-4 py-3 text-stone-600">{parcela.ubicacionTexto}</td>
                  <td className="px-4 py-3">
                    {puedeEditar ? (
                      <button
                        onClick={() => togglePreventa(parcela)}
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          parcela.disponibleParaPreventa
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-stone-100 text-stone-600"
                        }`}
                      >
                        {parcela.disponibleParaPreventa ? "Sí" : "No"}
                      </button>
                    ) : parcela.disponibleParaPreventa ? (
                      "Sí"
                    ) : (
                      "No"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {parcela.activa ? (
                      <span className="text-emerald-700">Activa</span>
                    ) : (
                      <span className="text-stone-500">Desactivada</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {puedeEditar && (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditando(parcela)}
                          className="text-sm text-stone-600 hover:text-stone-900"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => toggleActiva(parcela)}
                          className="text-sm text-red-600 hover:text-red-800"
                        >
                          {parcela.activa ? "Desactivar" : "Reactivar"}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {mostrarForm && (
        <ParcelaForm
          parcela={null}
          onClose={() => setMostrarForm(false)}
          onSaved={() => {
            setMostrarForm(false);
            cargar();
          }}
        />
      )}
      {editando && (
        <ParcelaForm
          parcela={editando}
          onClose={() => setEditando(null)}
          onSaved={() => {
            setEditando(null);
            cargar();
          }}
        />
      )}
    </div>
  );
}
