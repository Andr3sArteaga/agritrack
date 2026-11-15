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
import { EstadoVacio } from "@/components/estado/estado-vacio";
import type { HistoricoPublicoItem } from "@/lib/types";

export function RendimientoChart({ datos }: { datos: HistoricoPublicoItem[] }) {
  if (datos.length === 0) {
    return (
      <EstadoVacio mini titulo="Todavía no hay campañas anteriores">
        <p>Cuando se cosechen campañas, su rendimiento aparecerá aquí.</p>
      </EstadoVacio>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={datos} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E4EAE6" />
          <XAxis dataKey="temporada" tick={{ fontSize: 13, fill: "#68736D" }} />
          <YAxis
            tick={{ fontSize: 13, fill: "#68736D" }}
            unit=" t/ha"
            width={76}
          />
          <Tooltip
            formatter={(value) => [`${value} t/ha`, "Rendimiento"]}
          />
          <Line
            type="monotone"
            dataKey="rendimientoTnHa"
            stroke="#006B4F"
            strokeWidth={2.5}
            dot={{ r: 4, fill: "#00a859", stroke: "#004b36", strokeWidth: 2 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
