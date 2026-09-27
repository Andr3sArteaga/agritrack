"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Dashboard</h1>
        <p className="mt-1 text-stone-600">Resumen general de la operación</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metrica etiqueta="Hectáreas totales" valor={`${resumen.hectareasTotales} ha`} />
        <Metrica etiqueta="Campañas en curso" valor={resumen.campanasEnCurso} />
        <Metrica
          etiqueta="Última cosecha"
          valor={
            resumen.ultimaCosecha
              ? `${resumen.ultimaCosecha.rendimientoTnHa} t/ha`
              : "Sin datos"
          }
          subtexto={
            resumen.ultimaCosecha
              ? `${resumen.ultimaCosecha.parcelaNombre} · ${formatearFecha(resumen.ultimaCosecha.fecha)}`
              : undefined
          }
        />
        <Metrica
          etiqueta="Predicción próxima campaña"
          valor={
            resumen.prediccionProximaCampana?.rendimientoEstimadoTnHa !== null &&
            resumen.prediccionProximaCampana !== null
              ? `${resumen.prediccionProximaCampana?.rendimientoEstimadoTnHa} t/ha`
              : "Sin datos"
          }
          subtexto={
            resumen.prediccionProximaCampana
              ? `${resumen.prediccionProximaCampana.parcelaNombre} · ${resumen.prediccionProximaCampana.cultivoNombre}`
              : undefined
          }
        />
      </div>

      <div className="rounded-lg border border-stone-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-stone-900">
          Histórico de rendimiento
        </h2>
        <div className="mt-4">
          <DashboardChart datos={resumen.historicoRendimiento} />
        </div>
      </div>

      <div className="rounded-lg border border-stone-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-stone-900">
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

function Metrica({
  etiqueta,
  valor,
  subtexto,
}: {
  etiqueta: string;
  valor: string | number;
  subtexto?: string;
}) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-5">
      <p className="text-sm text-stone-500">{etiqueta}</p>
      <p className="mt-1 text-2xl font-semibold text-stone-900">{valor}</p>
      {subtexto && <p className="mt-1 text-xs text-stone-500">{subtexto}</p>}
    </div>
  );
}
