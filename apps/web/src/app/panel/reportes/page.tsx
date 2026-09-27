"use client";

import { useCallback, useEffect, useState } from "react";
import { api, apiErrorMessage } from "@/lib/api";
import { formatearFecha } from "@/lib/format";
import type {
  Cultivo,
  HistoricoItem,
  Parcela,
  ResultadoVerificacion,
} from "@/lib/types";

export default function ReportesPage() {
  const [tab, setTab] = useState<"historico" | "integridad">("historico");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Reportes</h1>
        <p className="mt-1 text-stone-600">
          Histórico de rendimiento e integridad de los registros
        </p>
      </div>

      <div className="flex gap-1 border-b border-stone-200">
        {(["historico", "integridad"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium ${
              tab === t
                ? "border-b-2 border-emerald-700 text-emerald-800"
                : "text-stone-500 hover:text-stone-800"
            }`}
          >
            {t === "historico" ? "Histórico de rendimiento" : "Integridad"}
          </button>
        ))}
      </div>

      {tab === "historico" ? <TabHistorico /> : <TabIntegridad />}
    </div>
  );
}

function TabHistorico() {
  const [parcelas, setParcelas] = useState<Parcela[]>([]);
  const [cultivos, setCultivos] = useState<Cultivo[]>([]);
  const [parcelaId, setParcelaId] = useState("");
  const [cultivoId, setCultivoId] = useState("");
  const [items, setItems] = useState<HistoricoItem[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    api.get<Parcela[]>("/parcelas").then((res) => setParcelas(res.data));
    api.get<Cultivo[]>("/cultivos").then((res) => setCultivos(res.data));
  }, []);

  const cargar = useCallback(() => {
    setCargando(true);
    api
      .get<HistoricoItem[]>("/reportes/historico", {
        params: {
          parcelaId: parcelaId || undefined,
          cultivoId: cultivoId || undefined,
        },
      })
      .then((res) => setItems(res.data))
      .finally(() => setCargando(false));
  }, [parcelaId, cultivoId]);

  useEffect(() => {
    // cargar() fija setCargando(true) de forma sincrona antes del fetch;
    // es el patron estandar de "fetch on mount" y no afecta la hidratacion.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar();
  }, [cargar]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <select
          value={parcelaId}
          onChange={(e) => setParcelaId(e.target.value)}
          className="rounded-md border border-stone-300 px-3 py-2 text-sm"
        >
          <option value="">Todas las parcelas</option>
          {parcelas.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </select>
        <select
          value={cultivoId}
          onChange={(e) => setCultivoId(e.target.value)}
          className="rounded-md border border-stone-300 px-3 py-2 text-sm"
        >
          <option value="">Todos los cultivos</option>
          {cultivos.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
      </div>

      {cargando ? (
        <p className="text-stone-500">Cargando...</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-stone-500">No hay cosechas registradas con estos filtros.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-left text-stone-500">
              <tr>
                <th className="px-4 py-3 font-medium">Parcela</th>
                <th className="px-4 py-3 font-medium">Cultivo</th>
                <th className="px-4 py-3 font-medium">Temporada</th>
                <th className="px-4 py-3 font-medium">Fecha cosecha</th>
                <th className="px-4 py-3 font-medium">Rendimiento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {items.map((item) => (
                <tr key={item.campanaId}>
                  <td className="px-4 py-3">{item.parcelaNombre}</td>
                  <td className="px-4 py-3">{item.cultivoNombre}</td>
                  <td className="px-4 py-3">{item.temporada}</td>
                  <td className="px-4 py-3">{formatearFecha(item.fecha)}</td>
                  <td className="px-4 py-3 font-medium text-emerald-700">
                    {item.rendimientoTnHa} t/ha
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function TabIntegridad() {
  const [resultado, setResultado] = useState<ResultadoVerificacion | null>(null);
  const [verificando, setVerificando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function verificar() {
    setVerificando(true);
    setError(null);
    try {
      const { data } = await api.get<ResultadoVerificacion>("/integridad/global");
      setResultado(data);
    } catch (err) {
      setError(apiErrorMessage(err, "No se pudo verificar la cadena de integridad"));
    } finally {
      setVerificando(false);
    }
  }

  return (
    <div className="rounded-lg border border-stone-200 bg-white p-6">
      <p className="text-stone-600">
        Recalcula el hash de cada actividad registrada en el sistema y valida
        que la cadena global no haya sido alterada.
      </p>
      <button
        onClick={verificar}
        disabled={verificando}
        className="mt-4 rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
      >
        {verificando ? "Verificando..." : "Ejecutar verificación global"}
      </button>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {resultado && (
        <div
          className={`mt-4 rounded-md p-4 text-sm ${
            resultado.valido ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"
          }`}
        >
          <p className="font-semibold">
            {resultado.valido
              ? "✓ La cadena de integridad es válida"
              : "✗ Se detectó una alteración en la cadena"}
          </p>
          <p className="mt-1">
            Actividades verificadas: {resultado.totalVerificadas}
          </p>
          {!resultado.valido && (
            <>
              <p className="mt-1">Actividad afectada: {resultado.actividadAlteradaId}</p>
              <p className="mt-1">Motivo: {resultado.motivo}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
