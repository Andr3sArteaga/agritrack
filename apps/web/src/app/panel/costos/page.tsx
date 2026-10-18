"use client";

import axios from "axios";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api, apiErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { calcularResumenCostos } from "@/lib/costos";
import { formatearBs, formatearFecha } from "@/lib/format";
import {
  CATEGORIA_GASTO_LABEL,
  ESTADO_CAMPANA_LABEL,
  ESTADO_GASTO_LABEL,
  type Campana,
  type Cultivo,
  type Gasto,
  type HistoricoItem,
  type Parcela,
  type Presupuesto,
} from "@/lib/types";
import { AnularGastoModal } from "./anular-gasto-modal";
import { GastoForm } from "./gasto-form";
import { PresupuestoForm } from "./presupuesto-form";

interface DetalleCampana {
  gastos: Gasto[];
  presupuesto: Presupuesto | null;
  hectareas: number;
  rendimientoTnHa: number | null;
}

export default function CostosPage() {
  const { usuario } = useAuth();
  const router = useRouter();

  const [campanas, setCampanas] = useState<Campana[]>([]);
  const [parcelas, setParcelas] = useState<Parcela[]>([]);
  const [cultivos, setCultivos] = useState<Cultivo[]>([]);
  const [campanaId, setCampanaId] = useState("");
  const [detalle, setDetalle] = useState<DetalleCampana | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formGasto, setFormGasto] = useState<{ gasto: Gasto | null } | null>(null);
  const [gastoAAnular, setGastoAAnular] = useState<Gasto | null>(null);
  const [formPresupuesto, setFormPresupuesto] = useState(false);

  useEffect(() => {
    if (usuario?.rol === "OPERATIVO") {
      router.replace("/panel/parcelas");
    }
  }, [usuario, router]);

  const cargarDetalle = useCallback(
    async (campana: Campana, parcelasDisponibles: Parcela[]) => {
      setCargando(true);
      setError(null);
      try {
        const [gastos, presupuesto, historico] = await Promise.all([
          api
            .get<Gasto[]>("/gastos", {
              params: { campanaId: campana.id, incluirAnulados: true },
            })
            .then((res) => res.data),
          api
            .get<Presupuesto>(`/presupuestos/campana/${campana.id}`)
            .then((res) => res.data)
            .catch((err: unknown) => {
              if (axios.isAxiosError(err) && err.response?.status === 404) {
                return null;
              }
              throw err;
            }),
          api
            .get<HistoricoItem[]>("/reportes/historico", {
              params: { parcelaId: campana.parcelaId },
            })
            .then((res) => res.data),
        ]);
        setDetalle({
          gastos,
          presupuesto,
          hectareas:
            parcelasDisponibles.find((p) => p.id === campana.parcelaId)
              ?.hectareas ?? 0,
          rendimientoTnHa:
            historico.find((h) => h.campanaId === campana.id)
              ?.rendimientoTnHa ?? null,
        });
      } catch (err) {
        setError(apiErrorMessage(err, "No se pudieron cargar los costos"));
      } finally {
        setCargando(false);
      }
    },
    [],
  );

  useEffect(() => {
    Promise.all([
      api.get<Campana[]>("/campanas"),
      api.get<Parcela[]>("/parcelas"),
      api.get<Cultivo[]>("/cultivos"),
    ])
      .then(([campanasRes, parcelasRes, cultivosRes]) => {
        const ordenadas = [...campanasRes.data].sort((a, b) =>
          b.fechaInicio.localeCompare(a.fechaInicio),
        );
        setCampanas(ordenadas);
        setParcelas(parcelasRes.data);
        setCultivos(cultivosRes.data);
        const inicial =
          ordenadas.find((c) => c.estado === "EN_CURSO") ?? ordenadas[0];
        if (inicial) {
          setCampanaId(inicial.id);
          return cargarDetalle(inicial, parcelasRes.data);
        }
        setCargando(false);
      })
      .catch((err) => {
        setError(apiErrorMessage(err, "No se pudieron cargar las campañas"));
        setCargando(false);
      });
  }, [cargarDetalle]);

  const campanaActual = campanas.find((c) => c.id === campanaId) ?? null;

  function seleccionarCampana(id: string) {
    setCampanaId(id);
    const campana = campanas.find((c) => c.id === id);
    if (campana) void cargarDetalle(campana, parcelas);
  }

  function recargar() {
    if (campanaActual) void cargarDetalle(campanaActual, parcelas);
  }

  function etiquetaCampana(campana: Campana): string {
    const parcela = parcelas.find((p) => p.id === campana.parcelaId)?.nombre;
    const cultivo = cultivos.find((c) => c.id === campana.cultivoId)?.nombre;
    return `${parcela ?? "Parcela"} · ${campana.temporada} · ${cultivo ?? "—"} (${ESTADO_CAMPANA_LABEL[campana.estado]})`;
  }

  const resumen = useMemo(
    () =>
      detalle
        ? calcularResumenCostos({
            gastos: detalle.gastos,
            presupuesto: detalle.presupuesto?.montoTotal ?? null,
            hectareas: detalle.hectareas,
            rendimientoTnHa: detalle.rendimientoTnHa,
          })
        : null,
    [detalle],
  );

  if (usuario?.rol === "OPERATIVO") return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Costos</h1>
        <p className="mt-1 text-stone-600">
          Gastos y presupuesto por campaña. Montos en bolivianos (Bs).
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700">Campaña</label>
        <select
          value={campanaId}
          onChange={(e) => seleccionarCampana(e.target.value)}
          disabled={campanas.length === 0}
          className="mt-1 w-full max-w-xl rounded-md border border-stone-300 bg-white px-3 py-2 text-sm"
        >
          {campanas.map((campana) => (
            <option key={campana.id} value={campana.id}>
              {etiquetaCampana(campana)}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {!error && campanas.length === 0 && !cargando && (
        <p className="text-sm text-stone-500">No hay campañas registradas.</p>
      )}
      {cargando && <p className="text-stone-500">Cargando...</p>}

      {!cargando && detalle && resumen && campanaActual && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Tarjeta etiqueta="Total gastado (pagado)" valor={formatearBs(resumen.gastado)} />
            <Tarjeta
              etiqueta="Total comprometido"
              valor={formatearBs(resumen.comprometido)}
              nota="Aparte; no entra en el gasto real"
            />
            <Tarjeta
              etiqueta="Presupuesto"
              valor={formatearBs(resumen.presupuesto)}
              nota={resumen.presupuesto === null ? "Sin presupuesto definido" : undefined}
              accion={
                <button
                  onClick={() => setFormPresupuesto(true)}
                  className="text-sm font-medium text-emerald-700 hover:text-emerald-800"
                >
                  {detalle.presupuesto ? "Cambiar" : "Definir"}
                </button>
              }
            />
            <Tarjeta
              etiqueta="Ahorro (presupuesto − gastado)"
              valor={formatearBs(resumen.ahorro)}
              tono={
                resumen.ahorro === null
                  ? undefined
                  : resumen.ahorro >= 0
                    ? "positivo"
                    : "negativo"
              }
              nota={
                resumen.ahorro !== null && resumen.ahorro < 0
                  ? "Se excedió el presupuesto"
                  : undefined
              }
            />
            <Tarjeta
              etiqueta="Costo por hectárea"
              valor={formatearBs(resumen.costoPorHa)}
              nota={`${detalle.hectareas} ha`}
            />
            <Tarjeta
              etiqueta="Costo por tonelada"
              valor={formatearBs(resumen.costoPorTonelada)}
              nota={
                resumen.costoPorTonelada === null
                  ? "Sin producción real registrada"
                  : undefined
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-stone-900">Gastos</h2>
            <button
              onClick={() => setFormGasto({ gasto: null })}
              className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              Registrar gasto
            </button>
          </div>

          {detalle.gastos.length === 0 ? (
            <p className="text-sm text-stone-500">Esta campaña todavía no tiene gastos.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
              <table className="w-full text-sm">
                <thead className="bg-stone-50 text-left text-stone-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Fecha</th>
                    <th className="px-4 py-3 font-medium">Categoría</th>
                    <th className="px-4 py-3 font-medium">Descripción</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                    <th className="px-4 py-3 text-right font-medium">Monto</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {detalle.gastos.map((gasto) => (
                    <tr key={gasto.id} className={gasto.anulado ? "bg-stone-50 text-stone-400" : ""}>
                      <td className="whitespace-nowrap px-4 py-3">{formatearFecha(gasto.fecha)}</td>
                      <td className="px-4 py-3">{CATEGORIA_GASTO_LABEL[gasto.categoria]}</td>
                      <td className="px-4 py-3">
                        <span className={gasto.anulado ? "line-through" : ""}>
                          {gasto.descripcion}
                        </span>
                        {gasto.anulado && (
                          <p className="text-xs italic text-red-500">
                            Motivo: {gasto.motivoAnulacion}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {gasto.anulado ? (
                          <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700">
                            Anulado
                          </span>
                        ) : (
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                              gasto.estado === "PAGADO"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {ESTADO_GASTO_LABEL[gasto.estado]}
                          </span>
                        )}
                      </td>
                      <td
                        className={`whitespace-nowrap px-4 py-3 text-right font-medium ${
                          gasto.anulado ? "line-through" : "text-stone-900"
                        }`}
                      >
                        {formatearBs(gasto.monto)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        {!gasto.anulado && (
                          <div className="flex justify-end gap-3">
                            <button
                              onClick={() => setFormGasto({ gasto })}
                              className="text-sm text-stone-600 hover:text-stone-900"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => setGastoAAnular(gasto)}
                              className="text-sm text-red-600 hover:text-red-800"
                            >
                              Anular
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

          {formGasto && (
            <GastoForm
              campanaId={campanaActual.id}
              gasto={formGasto.gasto}
              onClose={() => setFormGasto(null)}
              onSaved={() => {
                setFormGasto(null);
                recargar();
              }}
            />
          )}
          {gastoAAnular && (
            <AnularGastoModal
              gasto={gastoAAnular}
              onClose={() => setGastoAAnular(null)}
              onSaved={() => {
                setGastoAAnular(null);
                recargar();
              }}
            />
          )}
          {formPresupuesto && (
            <PresupuestoForm
              campanaId={campanaActual.id}
              presupuesto={detalle.presupuesto}
              onClose={() => setFormPresupuesto(false)}
              onSaved={() => {
                setFormPresupuesto(false);
                recargar();
              }}
            />
          )}
        </>
      )}
    </div>
  );
}

function Tarjeta({
  etiqueta,
  valor,
  nota,
  tono,
  accion,
}: {
  etiqueta: string;
  valor: string;
  nota?: string;
  tono?: "positivo" | "negativo";
  accion?: React.ReactNode;
}) {
  const colorValor =
    tono === "positivo"
      ? "text-emerald-700"
      : tono === "negativo"
        ? "text-red-600"
        : "text-stone-900";
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-stone-500">{etiqueta}</p>
        {accion}
      </div>
      <p className={`mt-1 text-2xl font-semibold ${colorValor}`}>{valor}</p>
      {nota && <p className="mt-1 text-xs text-stone-500">{nota}</p>}
    </div>
  );
}
