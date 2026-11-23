"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, FileBarChart, ShieldCheck, TrendingUp } from "lucide-react";
import { Ayuda } from "@/components/ayuda";
import { EncabezadoPagina } from "@/components/encabezado-pagina";
import { Advertencia } from "@/components/estado/advertencia";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CropChip } from "@/components/ui/crop-chip";
import { CLASE_CAMPO, Field } from "@/components/ui/field";
import { api, apiErrorMessage } from "@/lib/api";
import { cargarIdsDemo } from "@/lib/prediccion";
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
      <EncabezadoPagina
        icono={FileBarChart}
        titulo="Reportes"
        descripcion="Histórico de rendimiento e integridad de los registros"
      />

      <div className="flex gap-1 border-b border-borde">
        {(["historico", "integridad"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            aria-pressed={tab === t}
            title={
              t === "historico"
                ? "Rendimiento (toneladas por hectárea) de las campañas ya cosechadas"
                : "Comprobar que los registros de labores no fueron alterados"
            }
            className={`-mb-px inline-flex min-h-11 items-center gap-1.5 border-b-2 px-4 py-2 text-sm font-medium ${
              tab === t
                ? "border-marca text-marca"
                : "border-transparent text-tinta-suave hover:text-tinta"
            }`}
          >
            {t === "historico" ? (
              <TrendingUp className="h-4 w-4" aria-hidden />
            ) : (
              <ShieldCheck className="h-4 w-4" aria-hidden />
            )}
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
    // Las parcelas de demostracion (enmascaradas) no entran en los reportes.
    Promise.all([api.get<Parcela[]>("/parcelas"), cargarIdsDemo()]).then(([res, idsDemo]) =>
      setParcelas(res.data.filter((p) => !idsDemo.has(p.id))),
    );
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
      <div className="grid gap-3 sm:max-w-xl sm:grid-cols-2">
        <Field etiqueta="Parcela">
          {(props) => (
            <select
              {...props}
              value={parcelaId}
              onChange={(e) => setParcelaId(e.target.value)}
              className={CLASE_CAMPO}
            >
              <option value="">Todas las parcelas</option>
              {parcelas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field etiqueta="Cultivo">
          {(props) => (
            <select
              {...props}
              value={cultivoId}
              onChange={(e) => setCultivoId(e.target.value)}
              className={CLASE_CAMPO}
            >
              <option value="">Todos los cultivos</option>
              {cultivos.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          )}
        </Field>
      </div>

      {cargando ? (
        <p className="text-tinta-suave">Cargando...</p>
      ) : items.length === 0 ? (
        <Advertencia tipo="SIN_DATOS" titulo="Sin datos">
          No hay cosechas registradas con estos filtros.
        </Advertencia>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-fondo-suave text-left text-tinta-suave">
              <tr>
                <th className="px-4 py-3 font-medium">Parcela</th>
                <th className="px-4 py-3 font-medium">Cultivo</th>
                <th className="px-4 py-3 font-medium">Temporada</th>
                <th className="px-4 py-3 font-medium">Fecha cosecha</th>
                <th className="px-4 py-3 font-medium">Rendimiento</th>
                <th className="px-4 py-3">
                  <span className="sr-only">Reporte</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-fondo">
              {items.map((item, idx) => (
                <tr key={`${item.campanaId}-${item.fecha}-${idx}`}>
                  <td className="px-4 py-3">{item.parcelaNombre}</td>
                  <td className="px-4 py-3">
                    <CropChip cultivo={item.cultivoNombre} />
                  </td>
                  <td className="px-4 py-3">{item.temporada}</td>
                  <td className="whitespace-nowrap px-4 py-3">{formatearFecha(item.fecha)}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-semibold text-tinta">
                    {item.rendimientoTnHa} t/ha
                  </td>
                  <td className="whitespace-nowrap px-4 py-1 text-right">
                    <Link
                      href={`/panel/reportes/campanas/${item.campanaId}`}
                      title="Ver el reporte completo de esta campaña"
                      className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-marca hover:text-marca-hover"
                    >
                      Ver reporte
                      <ArrowRight className="h-4 w-4" aria-hidden />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
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
    <Card className="space-y-4 p-5 sm:p-6">
      <p className="flex items-start gap-2 text-tinta-suave">
        <span>
          Recalcula el hash de cada actividad registrada en el sistema y valida
          que la cadena global no haya sido alterada.
        </span>
        <Ayuda texto="El hash es una huella digital de cada registro: si alguien cambia un dato guardado, la huella ya no coincide y se detecta." />
      </p>
      <Button onClick={verificar} disabled={verificando}>
        <ShieldCheck className="h-4 w-4" aria-hidden />
        {verificando ? "Verificando..." : "Ejecutar verificación global"}
      </Button>

      {error && (
        <Advertencia tipo="CRITICO" titulo="No se pudo verificar" rol="alert">
          {error}
        </Advertencia>
      )}

      {/* Cero registros no es "Bien": no hay nada que comprobar. */}
      {resultado &&
        (!resultado.valido ? (
          <Advertencia tipo="CRITICO" titulo="Crítico: se detectó una alteración en la cadena">
            Actividades revisadas: {resultado.totalVerificadas}. Actividad afectada:{" "}
            {resultado.actividadAlteradaId}. Motivo: {resultado.motivo}
          </Advertencia>
        ) : resultado.totalVerificadas === 0 ? (
          <Advertencia tipo="SIN_DATOS" titulo="Sin datos">
            Todavía no hay actividades registradas para verificar.
          </Advertencia>
        ) : (
          <Advertencia tipo="BIEN" titulo="Bien: la cadena de integridad es válida">
            Actividades verificadas: {resultado.totalVerificadas}
          </Advertencia>
        ))}
    </Card>
  );
}
