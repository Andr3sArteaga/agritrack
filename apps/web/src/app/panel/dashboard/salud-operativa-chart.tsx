"use client";

import { Pie, PieChart, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { EstadoIndicador } from "@/lib/estado";

interface SegmentoEstado {
  estado: EstadoIndicador;
  nombre: string;
  cantidad: number;
  porcentaje: number;
  color: string;
}

const DEFINICION_ESTADOS: {
  estado: EstadoIndicador;
  nombre: string;
  color: string;
  puntoClase: string;
}[] = [
  {
    estado: "BIEN",
    nombre: "Buen estado",
    color: "var(--color-bien-borde)",
    puntoClase: "bg-bien-borde",
  },
  {
    estado: "ATENCION",
    nombre: "Atención",
    color: "var(--color-atencion-icono)",
    puntoClase: "bg-atencion-icono",
  },
  {
    estado: "CRITICO",
    nombre: "Crítico",
    color: "var(--color-critico-icono)",
    puntoClase: "bg-critico-borde",
  },
  {
    estado: "SIN_DATOS",
    nombre: "Sin datos",
    color: "var(--color-sindatos-icono)",
    puntoClase: "bg-sindatos-icono",
  },
];

export function SaludOperativaChart({
  conteo,
  hectareasTotales,
}: {
  conteo: Record<EstadoIndicador, number>;
  hectareasTotales: number;
}) {
  const total =
    conteo.BIEN + conteo.ATENCION + conteo.CRITICO + conteo.SIN_DATOS;

  const segmentos: SegmentoEstado[] = DEFINICION_ESTADOS.map((def) => {
    const cantidad = conteo[def.estado];
    return {
      estado: def.estado,
      nombre: def.nombre,
      cantidad,
      porcentaje: total > 0 ? Math.round((cantidad / total) * 1000) / 10 : 0,
      color: def.color,
    };
  });

  const datosGrafico = segmentos.filter((s) => s.cantidad > 0);

  return (
    <section
      aria-labelledby="salud-operativa-heading"
      className="flex h-full flex-col justify-between rounded-tarjeta border border-borde bg-white p-5 shadow-xs"
    >
      <div>
        <h2
          id="salud-operativa-heading"
          className="text-base font-bold text-tinta"
        >
          Salud Operativa Global
        </h2>
        <p className="mt-0.5 text-xs text-tinta-suave">
          Distribución de parcelas según su estado actual
        </p>
      </div>

      {total === 0 ? (
        <div className="my-6 rounded-tarjeta border border-dashed border-sindatos-borde bg-fondo-suave p-6 text-center text-xs text-tinta-suave">
          No hay parcelas que coincidan con los filtros seleccionados.
        </div>
      ) : (
        <div className="mt-3 flex flex-col items-center gap-4 sm:flex-row lg:flex-col xl:flex-row">
          <div className="relative h-44 w-44 shrink-0">
            <ResponsiveContainer width="100%" height="100%" minHeight={176}>
              <PieChart>
                <Pie
                  data={datosGrafico}
                  dataKey="cantidad"
                  nameKey="nombre"
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={76}
                  paddingAngle={datosGrafico.length > 1 ? 2 : 0}
                  stroke="var(--color-superficie)"
                  strokeWidth={2}
                >
                  {datosGrafico.map((entry) => (
                    <Cell key={entry.estado} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(valor, nombre) => [
                    `${valor} ${Number(valor) === 1 ? "parcela" : "parcelas"}`,
                    String(nombre),
                  ]}
                  contentStyle={{
                    borderRadius: "10px",
                    border: "1px solid var(--color-borde)",
                    fontSize: "12px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-2xl font-extrabold leading-none text-tinta">
                {total}
              </span>
              <span className="mt-1 text-xs font-medium text-tinta-suave">
                {total === 1 ? "parcela" : "parcelas"}
              </span>
            </div>
          </div>

          <ul className="w-full flex-1 space-y-2.5 text-xs">
            {DEFINICION_ESTADOS.map((def, idx) => {
              const seg = segmentos[idx];
              return (
                <li
                  key={def.estado}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="inline-flex items-center gap-2 font-medium text-tinta">
                    <span
                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${def.puntoClase}`}
                      aria-hidden
                    />
                    {def.nombre}
                  </span>
                  <span className="font-bold text-tinta">
                    {seg.cantidad}{" "}
                    <span className="font-normal text-tinta-suave">
                      ({seg.porcentaje}%)
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between border-t border-borde pt-3 text-xs">
        <span className="text-tinta-suave">Superficie filtrada</span>
        <span className="font-bold text-marca">
          {Math.round(hectareasTotales * 100) / 100} ha totales
        </span>
      </div>
    </section>
  );
}
