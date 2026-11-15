import { FlaskConical } from "lucide-react";
import { ETIQUETA_DEMO } from "@/lib/prediccion";

/** Etiqueta visible para todo dato de demostracion: nunca debe confundirse con un dato real. */
export function EtiquetaDemo({ texto = ETIQUETA_DEMO }: { texto?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-dotted border-pend-borde bg-pend-fondo px-2 py-0.5 text-sm font-bold text-pend-texto">
      <FlaskConical size={14} className="shrink-0 text-pend-icono" aria-hidden />
      {texto}
    </span>
  );
}

/** Filtro de las listas del panel. Apagado por defecto: los datos de demostracion no se ven. */
export function FiltroDemo({
  activo,
  onCambiar,
  cantidad,
}: {
  activo: boolean;
  onCambiar: (activo: boolean) => void;
  /** Cuantas parcelas de demostracion hay (si es 0 el filtro no se muestra). */
  cantidad: number;
}) {
  if (cantidad === 0) return null;
  return (
    <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-base text-stone-800">
      <input
        type="checkbox"
        checked={activo}
        onChange={(e) => onCambiar(e.target.checked)}
        className="h-5 w-5 accent-emerald-700"
      />
      Mostrar datos iniciales (V1)
      <span className="text-sm text-stone-600">({cantidad} parcelas)</span>
    </label>
  );
}
