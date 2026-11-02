import type { LucideIcon } from "lucide-react";
import { Ayuda } from "./ayuda";

/** Tarjeta de un valor resumido (dashboard, costos, reportes): icono, ayuda y nota opcional. */
export function TarjetaMetrica({
  icono: Icono,
  etiqueta,
  valor,
  nota,
  tono,
  accion,
  ayuda,
}: {
  icono: LucideIcon;
  etiqueta: string;
  valor: string | number;
  nota?: string;
  tono?: "positivo" | "negativo";
  accion?: React.ReactNode;
  ayuda: string;
}) {
  const colorValor =
    tono === "positivo"
      ? "text-emerald-700"
      : tono === "negativo"
        ? "text-red-600"
        : "text-stone-900";
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
        <p className="flex items-center gap-1.5 text-sm text-stone-500">
          <Icono className="h-4 w-4 shrink-0 text-stone-400" aria-hidden />
          {etiqueta}
          <Ayuda texto={ayuda} />
        </p>
        {accion}
      </div>
      <p className={`mt-1 text-2xl font-semibold ${colorValor}`}>{valor}</p>
      {nota && <p className="mt-1 text-xs text-stone-500">{nota}</p>}
    </div>
  );
}
