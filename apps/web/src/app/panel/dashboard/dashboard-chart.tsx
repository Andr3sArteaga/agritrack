"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { HistoricoItem } from "@/lib/types";

export function DashboardChart({ datos }: { datos: HistoricoItem[] }) {
  if (datos.length === 0) {
    return (
      <p className="text-sm text-stone-500">
        Todavía no hay cosechas registradas para graficar el histórico.
      </p>
    );
  }

  const puntos = datos.map((item) => ({
    etiqueta: `${item.parcelaNombre} · ${item.temporada}`,
    rendimientoTnHa: item.rendimientoTnHa,
  }));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={puntos} margin={{ top: 8, right: 16, left: 0, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
          <XAxis
            dataKey="etiqueta"
            tick={{ fontSize: 11 }}
            angle={-30}
            textAnchor="end"
            interval={0}
          />
          <YAxis tick={{ fontSize: 12 }} unit=" t/ha" width={70} />
          <Tooltip formatter={(value) => [`${value} t/ha`, "Rendimiento"]} />
          <Line
            type="monotone"
            dataKey="rendimientoTnHa"
            stroke="#047857"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
