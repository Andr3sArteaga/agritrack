import type { LucideIcon } from "lucide-react";
import { Ayuda } from "@/components/ayuda";
import { Card } from "./card";

/**
 * Valor resumido (resumen, costos, reportes). Sin valor muestra "Sin datos",
 * nunca un cero inventado.
 */
export function StatCard({
  icono: Icono,
  etiqueta,
  valor,
  nota,
  ayuda,
  accion,
  tono,
}: {
  /** Colorea el valor: positivo (ej. ahorro) o negativo (ej. sobrecosto). */
  tono?: "positivo" | "negativo";
  icono: LucideIcon;
  etiqueta: string;
  /** null = no hay dato. */
  valor: string | number | null;
  nota?: string;
  ayuda?: string;
  accion?: React.ReactNode;
}) {
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-medium text-tinta-suave">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-marca-suave text-marca">
            <Icono className="h-4 w-4" aria-hidden />
          </span>
          {etiqueta}
          {ayuda && <Ayuda texto={ayuda} />}
        </p>
        {accion}
      </div>
      {valor === null ? (
        <p className="mt-3 text-lg font-semibold text-sindatos-texto">Sin datos</p>
      ) : (
        <p
          className={`mt-3 text-[28px] font-semibold leading-tight ${
            tono === "positivo" ? "text-marca" : tono === "negativo" ? "text-critico-borde" : "text-tinta"
          }`}
        >
          {valor}
        </p>
      )}
      {nota && <p className="mt-1 text-sm text-tinta-suave">{nota}</p>}
    </Card>
  );
}
