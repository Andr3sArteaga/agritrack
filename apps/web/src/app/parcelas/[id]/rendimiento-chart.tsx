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
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-borde)" />
          <XAxis dataKey="temporada" tick={{ fontSize: 13, fill: "var(--color-tinta-suave)" }} />
          <YAxis
            tick={{ fontSize: 13, fill: "var(--color-tinta-suave)" }}
            unit=" t/ha"
            width={76}
          />
          <Tooltip
            formatter={(value) => [`${value} t/ha`, "Rendimiento"]}
          />
          <Line
            type="monotone"
            dataKey="rendimientoTnHa"
            stroke="var(--color-marca)"
            strokeWidth={2.5}
            dot={{ r: 4, fill: "var(--color-marca-vivo)", stroke: "var(--color-marca-oscuro)", strokeWidth: 2 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
