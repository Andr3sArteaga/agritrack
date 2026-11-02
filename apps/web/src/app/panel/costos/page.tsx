"use client";

import axios from "axios";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Ban,
  CircleCheck,
  Clock,
  Pencil,
  PiggyBank,
  Plus,
  Receipt,
  Ruler,
  Scale,
  Wallet,
} from "lucide-react";
import { BadgeEstadoGasto } from "@/components/badge";
import { EncabezadoPagina } from "@/components/encabezado-pagina";
import { TarjetaMetrica } from "@/components/tarjeta-metrica";
import { api, apiErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { calcularResumenCostos } from "@/lib/costos";
import { formatearBs, formatearFecha } from "@/lib/format";
import {
  CATEGORIA_GASTO_LABEL,
  ESTADO_CAMPANA_LABEL,
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
      <EncabezadoPagina
        icono={Wallet}
        titulo="Costos"
        descripcion="Gastos y presupuesto por campaña. Montos en bolivianos (Bs)."
      />

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
            <TarjetaMetrica
              icono={CircleCheck}
              etiqueta="Total gastado (pagado)"
              valor={formatearBs(resumen.gastado)}
              ayuda="Suma de los gastos ya pagados, sin contar los anulados. Es el gasto real de la campaña."
            />
            <TarjetaMetrica
              icono={Clock}
              etiqueta="Total comprometido"
              valor={formatearBs(resumen.comprometido)}
              nota="Aparte; no entra en el gasto real"
              ayuda="Gastos acordados que todavía no se pagaron. No se restan del presupuesto hasta que se paguen."
            />
            <TarjetaMetrica
              icono={Wallet}
              etiqueta="Presupuesto"
              valor={formatearBs(resumen.presupuesto)}
              nota={resumen.presupuesto === null ? "Sin presupuesto definido" : undefined}
              ayuda="Monto total que se planificó gastar en esta campaña."
              accion={
                <button
                  onClick={() => setFormPresupuesto(true)}
                  title={
                    detalle.presupuesto
                      ? "Cambiar el presupuesto de la campaña"
                      : "Definir el presupuesto de la campaña"
                  }
                  className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700 hover:text-emerald-800"
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden />
                  {detalle.presupuesto ? "Cambiar" : "Definir"}
                </button>
              }
            />
            <TarjetaMetrica
              icono={PiggyBank}
              ayuda="Lo que sobró del presupuesto: presupuesto menos lo ya pagado. Si es negativo, se gastó más de lo planificado."
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
            <TarjetaMetrica
              icono={Ruler}
              etiqueta="Costo por hectárea"
              valor={formatearBs(resumen.costoPorHa)}
              nota={`${detalle.hectareas} ha`}
              ayuda="Gasto real dividido entre las hectáreas de la parcela."
            />
            <TarjetaMetrica
              icono={Scale}
              ayuda="Gasto real dividido entre las toneladas cosechadas. Solo se calcula cuando ya hay producción registrada."
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
            <h2 className="flex items-center gap-2 text-lg font-semibold text-stone-900">
              <Receipt className="h-5 w-5 text-emerald-700" aria-hidden />
              Gastos
            </h2>
            <button
              onClick={() => setFormGasto({ gasto: null })}
              title="Registrar un gasto nuevo en esta campaña"
              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              <Plus className="h-4 w-4" aria-hidden />
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
                        <BadgeEstadoGasto estado={gasto.estado} anulado={gasto.anulado} />
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
                              title="Editar descripción, fecha, estado o monto del gasto"
                              className="inline-flex items-center gap-1 text-sm text-stone-600 hover:text-stone-900"
                            >
                              <Pencil className="h-4 w-4" aria-hidden />
                              Editar
                            </button>
                            <button
                              onClick={() => setGastoAAnular(gasto)}
                              title="Anular el gasto (no se borra: queda con su motivo)"
                              className="inline-flex items-center gap-1 text-sm text-red-600 hover:text-red-800"
                            >
                              <Ban className="h-4 w-4" aria-hidden />
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
