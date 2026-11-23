"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  CalendarRange,
  CircleCheck,
  Clock,
  Download,
  FileBarChart,
  FileSpreadsheet,
  FileText,
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
import axios from "axios";
import { Ayuda } from "@/components/ayuda";
import { BadgeEstadoCampana } from "@/components/badge";
import { EncabezadoPagina } from "@/components/encabezado-pagina";
import { Advertencia } from "@/components/estado/advertencia";
import { IconoActividad } from "@/components/icono-actividad";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CropChip } from "@/components/ui/crop-chip";
import { CLASE_CAMPO } from "@/components/ui/field";
import { StatCard } from "@/components/ui/stat-card";
import { Tag } from "@/components/ui/tag";
import { api, apiErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  aFechaInput,
  formatearBsONulo,
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

function nombreDesdeHeader(
  disposition: string | undefined,
  respaldo: string,
): string {
  if (!disposition) return respaldo;
  const match = /filename="?([^";]+)"?/i.exec(disposition);
  return match?.[1]?.trim() || respaldo;
}

async function extraerMensajeErrorDescarga(
  err: unknown,
  respaldo: string,
): Promise<string> {
  if (axios.isAxiosError(err) && err.response?.data instanceof Blob) {
    try {
      const texto = await err.response.data.text();
      const json = JSON.parse(texto) as { message?: string | string[] };
      if (Array.isArray(json.message)) return json.message.join(", ");
      if (typeof json.message === "string") return json.message;
    } catch {
      return respaldo;
    }
  }
  return apiErrorMessage(err, respaldo);
}

export default function ReporteCampanaPage() {
  const { id } = useParams<{ id: string }>();
  const { usuario } = useAuth();
  const router = useRouter();

  const [reporte, setReporte] = useState<ReporteCampana | null>(null);
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [cargando, setCargando] = useState(true);
  const [exportando, setExportando] = useState<"pdf" | "excel" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorExportacion, setErrorExportacion] = useState<string | null>(null);

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
    setErrorExportacion(null);
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
    setErrorExportacion(null);
    void consultar({ desde: desde || undefined, hasta: hasta || undefined });
  }

  async function exportarArchivo(formato: "pdf" | "excel") {
    if (!reporte) return;
    setErrorExportacion(null);
    setError(null);

    const desdeActual = aFechaInput(reporte.periodo.desde);
    const hastaActual = aFechaInput(reporte.periodo.hasta);
    const inputsEditados = desde !== desdeActual || hasta !== hastaActual;

    if (desde && hasta && desde > hasta) {
      setError('La fecha "desde" no puede ser posterior a la fecha "hasta".');
      return;
    }

    const periodoExportar: PeriodoPedido = inputsEditados
      ? { desde: desde || undefined, hasta: hasta || undefined }
      : reporte.periodo.porDefecto
        ? {}
        : { desde: desdeActual, hasta: hastaActual };

    setExportando(formato);
    let urlObjeto: string | null = null;
    try {
      // Si el usuario edito fechas sin pulsar "Aplicar", actualizamos primero el reporte en pantalla
      // para que coincida exactamente con el archivo descargado.
      if (inputsEditados) {
        const actualizado = await pedirReporte(id, periodoExportar);
        mostrar(actualizado);
      }

      const respuesta = await api.get<Blob>(`/reportes/campanas/${id}/${formato}`, {
        params: periodoExportar,
        responseType: "blob",
      });

      const extension = formato === "pdf" ? "pdf" : "xlsx";
      const nombreArchivo = nombreDesdeHeader(
        respuesta.headers["content-disposition"],
        `reporte-campana-${id}.${extension}`,
      );

      urlObjeto = window.URL.createObjectURL(respuesta.data);
      const enlace = document.createElement("a");
      enlace.href = urlObjeto;
      enlace.download = nombreArchivo;
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
    } catch (err) {
      setErrorExportacion(
        await extraerMensajeErrorDescarga(
          err,
          `No se pudo exportar el reporte en ${formato === "pdf" ? "PDF" : "Excel"}.`,
        ),
      );
    } finally {
      if (urlObjeto) {
        window.URL.revokeObjectURL(urlObjeto);
      }
      setExportando(null);
    }
  }

  if (usuario?.rol === "OPERATIVO") return null;

  const desdeCargado = reporte ? aFechaInput(reporte.periodo.desde) : "";
  const hastaCargado = reporte ? aFechaInput(reporte.periodo.hasta) : "";
  const hayFiltroPendiente = Boolean(
    reporte && (desde !== desdeCargado || hasta !== hastaCargado),
  );

  return (
    <div className="space-y-6">
      <Link
        href="/panel/reportes"
        className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-tinta-suave hover:text-tinta"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Volver a reportes
      </Link>

      {!reporte ? (
        cargando ? (
          <p className="text-tinta-suave">Generando reporte...</p>
        ) : (
          <Advertencia tipo="CRITICO" titulo="No se pudo generar el reporte" rol="alert">
            {error ?? "Vuelve a intentarlo en unos minutos."}
          </Advertencia>
        )
      ) : (
        <>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <EncabezadoPagina
              icono={FileBarChart}
              titulo="Reporte de campaña"
              descripcion={`${reporte.parcela.nombre} · ${reporte.campana.temporada} · ${reporte.cultivo.nombre}`}
            />
            <div className="flex flex-wrap items-center gap-2">
              <BadgeEstadoCampana estado={reporte.campana.estado} />
              <Button
                variante="secundario"
                disabled={cargando || exportando !== null}
                onClick={() => void exportarArchivo("pdf")}
                icono={exportando === "pdf" ? Download : FileText}
              >
                {exportando === "pdf" ? "Generando PDF..." : "Exportar PDF"}
              </Button>
              <Button
                variante="secundario"
                disabled={cargando || exportando !== null}
                onClick={() => void exportarArchivo("excel")}
                icono={exportando === "excel" ? Download : FileSpreadsheet}
              >
                {exportando === "excel" ? "Generando Excel..." : "Exportar Excel"}
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-tarjeta border border-borde bg-fondo-suave px-4 py-2.5 text-sm text-tinta-suave">
            <span>
              <strong className="text-tinta">Alcance de exportación actual:</strong>{" "}
              {hayFiltroPendiente
                ? `Fechas seleccionadas (${desde || "inicio"} – ${hasta || "fin"})`
                : reporte.periodo.porDefecto
                  ? `Campaña completa (${formatearFecha(reporte.periodo.desde)} – ${formatearFecha(reporte.periodo.hasta)})`
                  : `Período filtrado (${formatearFecha(reporte.periodo.desde)} – ${formatearFecha(reporte.periodo.hasta)})`}
            </span>
            {errorExportacion && (
              <span role="alert" className="font-semibold text-critico-borde">
                {errorExportacion}
              </span>
            )}
          </div>

          <Card className="p-4 sm:p-5">
            <h2 className="flex items-center gap-2 font-semibold text-tinta">
              <CalendarRange className="h-5 w-5 text-marca" aria-hidden />
              Período del reporte
              <Ayuda texto="Las actividades y los gastos se filtran por este período. Sin cambiarlo, se usa la campaña completa." />
            </h2>

            <form onSubmit={aplicarPeriodo} className="mt-3 flex flex-wrap items-end gap-3">
              <label className="w-full text-sm font-semibold text-tinta sm:w-44">
                Desde
                <input
                  type="date"
                  value={desde}
                  onChange={(e) => setDesde(e.target.value)}
                  className={`${CLASE_CAMPO} mt-1.5 block font-normal`}
                />
              </label>
              <label className="w-full text-sm font-semibold text-tinta sm:w-44">
                Hasta
                <input
                  type="date"
                  value={hasta}
                  onChange={(e) => setHasta(e.target.value)}
                  className={`${CLASE_CAMPO} mt-1.5 block font-normal`}
                />
              </label>
              <Button
                type="submit"
                disabled={cargando}
                title="Volver a generar el reporte con este período"
                icono={Search}
              >
                {cargando ? "Generando..." : "Aplicar"}
              </Button>
              <Button
                variante="secundario"
                disabled={cargando || (reporte.periodo.porDefecto && !hayFiltroPendiente)}
                onClick={() => void consultar({})}
                title="Usar las fechas completas de la campaña"
                icono={RotateCcw}
              >
                Campaña completa
              </Button>
            </form>

            {error && (
              <div className="mt-3">
                <Advertencia tipo="CRITICO" titulo="Revisa el período" rol="alert">
                  {error}
                </Advertencia>
              </div>
            )}

            <dl className="mt-4 grid gap-x-6 gap-y-3 border-t border-borde pt-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-tinta-suave">Período consultado</dt>
                <dd className="mt-0.5 flex flex-wrap items-center gap-2 font-medium text-tinta">
                  {formatearFecha(reporte.periodo.desde)} – {formatearFecha(reporte.periodo.hasta)}
                  <Tag tono={reporte.periodo.porDefecto ? "marca" : "neutro"} icono={CalendarRange}>
                    {reporte.periodo.porDefecto ? "Campaña completa" : "Período personalizado"}
                  </Tag>
                </dd>
              </div>
              <div>
                <dt className="text-tinta-suave">Fecha de generación</dt>
                <dd className="mt-0.5 font-medium text-tinta">
                  {formatearFechaHora(reporte.generadoEn)}{" "}
                  <span className="font-normal text-tinta-suave">(hora de Bolivia)</span>
                </dd>
              </div>
            </dl>
          </Card>

          <Card className="p-4 sm:p-5">
            <h2 className="flex items-center gap-2 font-semibold text-tinta">
              <Sprout className="h-5 w-5 text-marca" aria-hidden />
              Datos de la campaña
            </h2>
            <dl className="mt-3 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
              <Dato etiqueta="Parcela">
                <Link
                  href={`/panel/parcelas/${reporte.parcela.id}`}
                  className="text-marca hover:underline"
                >
                  {reporte.parcela.nombre}
                </Link>
              </Dato>
              <Dato etiqueta="Superficie">{reporte.parcela.hectareas} ha</Dato>
              <Dato etiqueta="Ubicación">{reporte.parcela.ubicacionTexto}</Dato>
              <Dato etiqueta="Cultivo">
                <CropChip cultivo={reporte.cultivo.nombre} />
              </Dato>
              <Dato etiqueta="Temporada">{reporte.campana.temporada}</Dato>
              <Dato etiqueta="Fechas de la campaña">
                {formatearFecha(reporte.campana.fechaInicio)} –{" "}
                {reporte.campana.fechaFin ? formatearFecha(reporte.campana.fechaFin) : "sin fecha de fin"}
              </Dato>
            </dl>
          </Card>

          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-tinta">
              <Wallet className="h-5 w-5 text-marca" aria-hidden />
              Rendimiento y costos del período
            </h2>
            {!reporte.periodo.porDefecto && (
              <Advertencia tipo="ATENCION" titulo="Período parcial">
                Los gastos son solo los del período elegido; el presupuesto es el de toda la
                campaña, así que el ahorro compara el presupuesto completo con lo pagado en este
                período.
              </Advertencia>
            )}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <StatCard
                icono={Wheat}
                etiqueta="Rendimiento"
                valor={reporte.cosecha ? `${reporte.cosecha.rendimientoTnHa} t/ha` : null}
                nota={
                  reporte.cosecha
                    ? `Cosecha del ${formatearFecha(reporte.cosecha.fecha)}`
                    : "Sin cosecha con rendimiento en el período"
                }
                ayuda="Toneladas cosechadas por hectárea, según la cosecha registrada en el período."
              />
              <StatCard
                icono={CircleCheck}
                etiqueta="Total gastado (pagado)"
                valor={formatearBsONulo(reporte.costos.gastado)}
                ayuda="Gastos ya pagados en el período, sin contar los anulados."
              />
              <StatCard
                icono={Clock}
                etiqueta="Total comprometido"
                valor={formatearBsONulo(reporte.costos.comprometido)}
                nota="Aparte; no entra en el gasto real"
                ayuda="Gastos acordados en el período que todavía no se pagaron."
              />
              <StatCard
                icono={Wallet}
                etiqueta="Presupuesto"
                valor={formatearBsONulo(reporte.costos.presupuesto)}
                nota={
                  reporte.costos.presupuesto === null
                    ? "Sin presupuesto definido"
                    : "De toda la campaña"
                }
                ayuda="Monto total que se planificó gastar en la campaña."
              />
              <StatCard
                icono={PiggyBank}
                etiqueta="Ahorro"
                valor={formatearBsONulo(reporte.costos.ahorro)}
                tono={
                  reporte.costos.ahorro === null
                    ? undefined
                    : reporte.costos.ahorro >= 0
                      ? "positivo"
                      : "negativo"
                }
                ayuda="Presupuesto menos lo pagado. Si es negativo, se gastó más de lo planificado."
              />
              <StatCard
                icono={Ruler}
                etiqueta="Costo por hectárea"
                valor={formatearBsONulo(reporte.costos.costoPorHa)}
                nota={`${reporte.parcela.hectareas} ha`}
                ayuda="Gasto pagado dividido entre las hectáreas de la parcela."
              />
              <StatCard
                icono={Scale}
                etiqueta="Costo por tonelada"
                valor={formatearBsONulo(reporte.costos.costoPorTonelada)}
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
            <h2 className="flex items-center gap-2 text-lg font-semibold text-tinta">
              <ListChecks className="h-5 w-5 text-marca" aria-hidden />
              Actividades del período ({reporte.actividades.length})
              <Ayuda texto="Solo las vigentes: si una labor se corrigió, aparece la corrección y no el registro original." />
            </h2>
            {reporte.actividades.length === 0 ? (
              <Advertencia tipo="SIN_DATOS" titulo="Sin datos">
                No hay actividades registradas en este período.
              </Advertencia>
            ) : (
              <Card className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-fondo-suave text-left text-tinta-suave">
                    <tr>
                      <th className="px-4 py-3 font-medium">Fecha</th>
                      <th className="px-4 py-3 font-medium">Labor</th>
                      <th className="px-4 py-3 font-medium">Descripción</th>
                      <th className="px-4 py-3 font-medium">Responsable</th>
                      <th className="px-4 py-3 text-right font-medium">Rendimiento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-fondo">
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
                            <p className="text-xs text-tinta-suave">
                              {actividad.insumo}
                              {actividad.cantidad !== null &&
                                ` · ${actividad.cantidad} ${actividad.unidad ?? ""}`}
                            </p>
                          )}
                          {actividad.correccionDeId && (
                            <p className="text-xs text-atencion-icono">Corrección de un registro anterior</p>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-tinta-suave">
                          {actividad.responsableNombre}
                          {actividad.tercerizado && (
                            <span className="ml-1 text-xs text-tinta-suave">(tercerizado)</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-tinta">
                          {actividad.rendimientoTnHa !== null ? `${actividad.rendimientoTnHa} t/ha` : ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
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
      <dt className="text-tinta-suave">{etiqueta}</dt>
      <dd className="mt-0.5 font-medium text-tinta">{children}</dd>
    </div>
  );
}
