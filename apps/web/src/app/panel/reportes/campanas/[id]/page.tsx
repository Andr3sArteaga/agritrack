"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  CalendarRange,
  CircleCheck,
  Clock,
  FileBarChart,
  ListChecks,
  PiggyBank,
  RotateCcw,
  Ruler,
  Scale,
  Search,
  Sprout,
  Wallet,
  Wheat,
} from "lucide-react";
import { Ayuda } from "@/components/ayuda";
import { Badge, BadgeEstadoCampana } from "@/components/badge";
import { EncabezadoPagina } from "@/components/encabezado-pagina";
import { IconoActividad } from "@/components/icono-actividad";
import { TarjetaMetrica } from "@/components/tarjeta-metrica";
import { api, apiErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  aFechaInput,
  formatearBs,
  formatearFecha,
  formatearFechaHora,
} from "@/lib/format";
import { TIPO_ACTIVIDAD_LABEL, type ReporteCampana } from "@/lib/types";

interface PeriodoPedido {
  desde?: string;
  hasta?: string;
}

function pedirReporte(campanaId: string, periodo: PeriodoPedido) {
  return api
    .get<ReporteCampana>(`/reportes/campanas/${campanaId}`, { params: periodo })
    .then((res) => res.data);
}

export default function ReporteCampanaPage() {
  const { id } = useParams<{ id: string }>();
  const { usuario } = useAuth();
  const router = useRouter();

  const [reporte, setReporte] = useState<ReporteCampana | null>(null);
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (usuario?.rol === "OPERATIVO") {
      router.replace("/panel/parcelas");
    }
  }, [usuario, router]);

  // Muestra el reporte y deja en los campos el periodo que realmente se uso.
  const mostrar = useCallback((datos: ReporteCampana) => {
    setReporte(datos);
    setDesde(aFechaInput(datos.periodo.desde));
    setHasta(aFechaInput(datos.periodo.hasta));
  }, []);

  useEffect(() => {
    pedirReporte(id, {})
      .then(mostrar)
      .catch((err) => setError(apiErrorMessage(err, "No se pudo generar el reporte")))
      .finally(() => setCargando(false));
  }, [id, mostrar]);

  async function consultar(periodo: PeriodoPedido) {
    setCargando(true);
    setError(null);
    try {
      mostrar(await pedirReporte(id, periodo));
    } catch (err) {
      setError(apiErrorMessage(err, "No se pudo generar el reporte"));
    } finally {
      setCargando(false);
    }
  }

  function aplicarPeriodo(e: FormEvent) {
    e.preventDefault();
    if (desde && hasta && desde > hasta) {
      setError('La fecha "desde" no puede ser posterior a la fecha "hasta".');
      return;
    }
    void consultar({ desde: desde || undefined, hasta: hasta || undefined });
  }

  if (usuario?.rol === "OPERATIVO") return null;

  return (
    <div className="space-y-6">
      <Link
        href="/panel/reportes"
        className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Volver a reportes
      </Link>

      {!reporte ? (
        cargando ? (
          <p className="text-stone-500">Generando reporte...</p>
        ) : (
          <p className="text-red-600">{error ?? "No se pudo generar el reporte"}</p>
        )
      ) : (
        <>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <EncabezadoPagina
              icono={FileBarChart}
              titulo="Reporte de campaña"
              descripcion={`${reporte.parcela.nombre} · ${reporte.campana.temporada} · ${reporte.cultivo.nombre}`}
            />
            <BadgeEstadoCampana estado={reporte.campana.estado} />
          </div>

          <section className="rounded-lg border border-stone-200 bg-white p-4 sm:p-5">
            <h2 className="flex items-center gap-2 font-semibold text-stone-900">
              <CalendarRange className="h-5 w-5 text-emerald-700" aria-hidden />
              Período del reporte
              <Ayuda texto="Las actividades y los gastos se filtran por este período. Sin cambiarlo, se usa la campaña completa." />
            </h2>

            <form onSubmit={aplicarPeriodo} className="mt-3 flex flex-wrap items-end gap-3">
              <label className="text-sm text-stone-700">
                Desde
                <input
                  type="date"
                  value={desde}
                  onChange={(e) => setDesde(e.target.value)}
                  className="mt-1 block rounded-md border border-stone-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm text-stone-700">
                Hasta
                <input
                  type="date"
                  value={hasta}
                  onChange={(e) => setHasta(e.target.value)}
                  className="mt-1 block rounded-md border border-stone-300 px-3 py-2 text-sm"
                />
              </label>
              <button
                type="submit"
                disabled={cargando}
                title="Volver a generar el reporte con este período"
                className="inline-flex items-center gap-1.5 rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
              >
                <Search className="h-4 w-4" aria-hidden />
                {cargando ? "Generando..." : "Aplicar"}
              </button>
              <button
                type="button"
                disabled={cargando || reporte.periodo.porDefecto}
                onClick={() => void consultar({})}
                title="Usar las fechas completas de la campaña"
                className="inline-flex items-center gap-1.5 rounded-md border border-stone-300 px-4 py-2 text-sm text-stone-700 hover:bg-stone-100 disabled:opacity-50"
              >
                <RotateCcw className="h-4 w-4" aria-hidden />
                Campaña completa
              </button>
            </form>

            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

            <dl className="mt-4 grid gap-x-6 gap-y-3 border-t border-stone-100 pt-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-stone-500">Período consultado</dt>
                <dd className="mt-0.5 flex flex-wrap items-center gap-2 font-medium text-stone-900">
                  {formatearFecha(reporte.periodo.desde)} – {formatearFecha(reporte.periodo.hasta)}
                  <Badge
                    tono={reporte.periodo.porDefecto ? "verde" : "ambar"}
                    icono={CalendarRange}
                    ayuda={
                      reporte.periodo.porDefecto
                        ? "Abarca desde el inicio hasta el fin de la campaña"
                        : "Período elegido a mano: solo una parte de la campaña"
                    }
                  >
                    {reporte.periodo.porDefecto ? "Campaña completa" : "Período personalizado"}
                  </Badge>
                </dd>
              </div>
              <div>
                <dt className="text-stone-500">Fecha de generación</dt>
                <dd className="mt-0.5 font-medium text-stone-900">
                  {formatearFechaHora(reporte.generadoEn)}{" "}
                  <span className="font-normal text-stone-500">(hora de Bolivia)</span>
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-lg border border-stone-200 bg-white p-4 sm:p-5">
            <h2 className="flex items-center gap-2 font-semibold text-stone-900">
              <Sprout className="h-5 w-5 text-emerald-700" aria-hidden />
              Datos de la campaña
            </h2>
            <dl className="mt-3 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
              <Dato etiqueta="Parcela">
                <Link
                  href={`/panel/parcelas/${reporte.parcela.id}`}
                  className="text-emerald-700 hover:underline"
                >
                  {reporte.parcela.nombre}
                </Link>
              </Dato>
              <Dato etiqueta="Superficie">{reporte.parcela.hectareas} ha</Dato>
              <Dato etiqueta="Ubicación">{reporte.parcela.ubicacionTexto}</Dato>
              <Dato etiqueta="Cultivo">{reporte.cultivo.nombre}</Dato>
              <Dato etiqueta="Temporada">{reporte.campana.temporada}</Dato>
              <Dato etiqueta="Fechas de la campaña">
                {formatearFecha(reporte.campana.fechaInicio)} –{" "}
                {reporte.campana.fechaFin ? formatearFecha(reporte.campana.fechaFin) : "sin fecha de fin"}
              </Dato>
            </dl>
          </section>

          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-stone-900">
              <Wallet className="h-5 w-5 text-emerald-700" aria-hidden />
              Rendimiento y costos del período
            </h2>
            {!reporte.periodo.porDefecto && (
              <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Los gastos son solo los del período elegido; el presupuesto es el de toda la
                campaña, así que el ahorro compara el presupuesto completo con lo pagado en este
                período.
              </p>
            )}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <TarjetaMetrica
                icono={Wheat}
                etiqueta="Rendimiento"
                valor={reporte.cosecha ? `${reporte.cosecha.rendimientoTnHa} t/ha` : "—"}
                nota={
                  reporte.cosecha
                    ? `Cosecha del ${formatearFecha(reporte.cosecha.fecha)}`
                    : "Sin cosecha con rendimiento en el período"
                }
                ayuda="Toneladas cosechadas por hectárea, según la cosecha registrada en el período."
              />
              <TarjetaMetrica
                icono={CircleCheck}
                etiqueta="Total gastado (pagado)"
                valor={formatearBs(reporte.costos.gastado)}
                ayuda="Gastos ya pagados en el período, sin contar los anulados."
              />
              <TarjetaMetrica
                icono={Clock}
                etiqueta="Total comprometido"
                valor={formatearBs(reporte.costos.comprometido)}
                nota="Aparte; no entra en el gasto real"
                ayuda="Gastos acordados en el período que todavía no se pagaron."
              />
              <TarjetaMetrica
                icono={Wallet}
                etiqueta="Presupuesto"
                valor={formatearBs(reporte.costos.presupuesto)}
                nota={
                  reporte.costos.presupuesto === null
                    ? "Sin presupuesto definido"
                    : "De toda la campaña"
                }
                ayuda="Monto total que se planificó gastar en la campaña."
              />
              <TarjetaMetrica
                icono={PiggyBank}
                etiqueta="Ahorro"
                valor={formatearBs(reporte.costos.ahorro)}
                tono={
                  reporte.costos.ahorro === null
                    ? undefined
                    : reporte.costos.ahorro >= 0
                      ? "positivo"
                      : "negativo"
                }
                ayuda="Presupuesto menos lo pagado. Si es negativo, se gastó más de lo planificado."
              />
              <TarjetaMetrica
                icono={Ruler}
                etiqueta="Costo por hectárea"
                valor={formatearBs(reporte.costos.costoPorHa)}
                nota={`${reporte.parcela.hectareas} ha`}
                ayuda="Gasto pagado dividido entre las hectáreas de la parcela."
              />
              <TarjetaMetrica
                icono={Scale}
                etiqueta="Costo por tonelada"
                valor={formatearBs(reporte.costos.costoPorTonelada)}
                nota={
                  reporte.costos.costoPorTonelada === null
                    ? "Sin producción registrada en el período"
                    : undefined
                }
                ayuda="Gasto pagado dividido entre las toneladas cosechadas. Solo se calcula si hay cosecha."
              />
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-stone-900">
              <ListChecks className="h-5 w-5 text-emerald-700" aria-hidden />
              Actividades del período ({reporte.actividades.length})
              <Ayuda texto="Solo las vigentes: si una labor se corrigió, aparece la corrección y no el registro original." />
            </h2>
            {reporte.actividades.length === 0 ? (
              <p className="text-sm text-stone-500">No hay actividades registradas en este período.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
                <table className="w-full text-sm">
                  <thead className="bg-stone-50 text-left text-stone-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">Fecha</th>
                      <th className="px-4 py-3 font-medium">Labor</th>
                      <th className="px-4 py-3 font-medium">Descripción</th>
                      <th className="px-4 py-3 font-medium">Responsable</th>
                      <th className="px-4 py-3 text-right font-medium">Rendimiento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {reporte.actividades.map((actividad) => (
                      <tr key={actividad.id}>
                        <td className="whitespace-nowrap px-4 py-3">{formatearFecha(actividad.fecha)}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                            <IconoActividad tipo={actividad.tipo} />
                            {TIPO_ACTIVIDAD_LABEL[actividad.tipo]}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {actividad.descripcion}
                          {actividad.insumo && (
                            <p className="text-xs text-stone-500">
                              {actividad.insumo}
                              {actividad.cantidad !== null &&
                                ` · ${actividad.cantidad} ${actividad.unidad ?? ""}`}
                            </p>
                          )}
                          {actividad.correccionDeId && (
                            <p className="text-xs text-amber-700">Corrección de un registro anterior</p>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-stone-600">
                          {actividad.responsableNombre}
                          {actividad.tercerizado && (
                            <span className="ml-1 text-xs text-stone-400">(tercerizado)</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-emerald-700">
                          {actividad.rendimientoTnHa !== null ? `${actividad.rendimientoTnHa} t/ha` : ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function Dato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-stone-500">{etiqueta}</dt>
      <dd className="mt-0.5 font-medium text-stone-900">{children}</dd>
    </div>
  );
}
