"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  CalendarClock,
  LayoutDashboard,
  LineChart,
  Ruler,
  Sprout,
  Tractor,
  Wheat,
} from "lucide-react";
import { EncabezadoPagina } from "@/components/encabezado-pagina";
import { TarjetaMetrica } from "@/components/tarjeta-metrica";
import { api, apiErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatearFecha } from "@/lib/format";
import type { ResumenDashboard } from "@/lib/types";
import { DashboardChart } from "./dashboard-chart";

export default function DashboardPage() {
  const { usuario } = useAuth();
  const router = useRouter();
  const [resumen, setResumen] = useState<ResumenDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (usuario?.rol === "OPERATIVO") {
      router.replace("/panel/parcelas");
    }
  }, [usuario, router]);

  useEffect(() => {
    api
      .get<ResumenDashboard>("/reportes/dashboard")
      .then((res) => setResumen(res.data))
      .catch((err) => setError(apiErrorMessage(err, "No se pudo cargar el dashboard")));
  }, []);

  if (error) return <p className="text-red-600">{error}</p>;
  if (!resumen) return <p className="text-stone-500">Cargando dashboard...</p>;

  return (
    <div className="space-y-8">
      <EncabezadoPagina
        icono={LayoutDashboard}
        titulo="Dashboard"
        descripcion="Resumen general de la operación"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <TarjetaMetrica
          icono={Ruler}
          etiqueta="Hectáreas totales"
          valor={`${resumen.hectareasTotales} ha`}
          ayuda="Suma de la superficie de las parcelas activas."
        />
        <TarjetaMetrica
          icono={Tractor}
          etiqueta="Campañas en curso"
          valor={resumen.campanasEnCurso}
          ayuda="Campañas que se están ejecutando ahora (sembradas y sin cosechar)."
        />
        <TarjetaMetrica
          icono={Wheat}
          ayuda="Rendimiento de la cosecha más reciente, en toneladas por hectárea (t/ha)."
          etiqueta="Última cosecha"
          valor={
            resumen.ultimaCosecha
              ? `${resumen.ultimaCosecha.rendimientoTnHa} t/ha`
              : "Sin datos"
          }
          nota={
            resumen.ultimaCosecha
              ? `${resumen.ultimaCosecha.parcelaNombre} · ${formatearFecha(resumen.ultimaCosecha.fecha)}`
              : undefined
          }
        />
        <TarjetaMetrica
          icono={Sprout}
          ayuda="Estimación del rendimiento (t/ha) a partir del promedio de campañas anteriores. Es orientativa: mejora a medida que hay más historial."
          etiqueta="Predicción próxima campaña"
          valor={
            resumen.prediccionProximaCampana?.rendimientoEstimadoTnHa !== null &&
            resumen.prediccionProximaCampana !== null
              ? `${resumen.prediccionProximaCampana?.rendimientoEstimadoTnHa} t/ha`
              : "Sin datos"
          }
          nota={
            resumen.prediccionProximaCampana
              ? `${resumen.prediccionProximaCampana.parcelaNombre} · ${resumen.prediccionProximaCampana.cultivoNombre}`
              : undefined
          }
        />
      </div>

      <div className="rounded-lg border border-stone-200 bg-white p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-stone-900">
          <LineChart className="h-5 w-5 text-emerald-700" aria-hidden />
          Histórico de rendimiento
        </h2>
        <div className="mt-4">
          <DashboardChart datos={resumen.historicoRendimiento} />
        </div>
      </div>

      <div className="rounded-lg border border-stone-200 bg-white p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-stone-900">
          <CalendarClock className="h-5 w-5 text-emerald-700" aria-hidden />
          Próximas cosechas
        </h2>
        {resumen.proximasCosechas.length === 0 ? (
          <p className="mt-3 text-sm text-stone-500">
            No hay campañas en curso con fecha de finalización.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-stone-100">
            {resumen.proximasCosechas.map((cosecha) => (
              <li key={cosecha.campanaId} className="flex items-center justify-between py-2 text-sm">
                <span className="font-medium text-stone-900">
                  {cosecha.parcelaNombre} · {cosecha.cultivoNombre}
                </span>
                <span className="text-stone-500">{formatearFecha(cosecha.fechaFin)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
