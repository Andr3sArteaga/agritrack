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
import type { HistoricoPublicoItem } from "@/lib/types";

export function RendimientoChart({ datos }: { datos: HistoricoPublicoItem[] }) {
  if (datos.length === 0) {
    return (
      <p className="text-sm text-stone-500">
        Todavía no hay campañas anteriores registradas para esta parcela.
      </p>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={datos} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
          <XAxis dataKey="temporada" tick={{ fontSize: 12 }} />
          <YAxis
            tick={{ fontSize: 12 }}
            unit=" t/ha"
            width={70}
          />
          <Tooltip
            formatter={(value) => [`${value} t/ha`, "Rendimiento"]}
          />
          <Line
            type="monotone"
            dataKey="rendimientoTnHa"
            stroke="#047857"
            strokeWidth={2}
            dot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
