import { CalendarDays, UserRound } from "lucide-react";
import { IconoActividad } from "@/components/icono-actividad";
import { formatearFecha } from "@/lib/format";
import { TIPO_ACTIVIDAD_LABEL, type TipoActividad } from "@/lib/types";

/**
 * Fila de una actividad ya registrada, con el aspecto de "tarea" de la referencia.
 * No tiene estado (Sin empezar / En progreso): una actividad es algo que ya se hizo.
 */
export function ActivityItem({
  tipo,
  fecha,
  descripcion,
  responsable,
  etiquetas,
}: {
  tipo: TipoActividad;
  fecha: string;
  descripcion: string;
  responsable?: string | null;
  /** Chips extra (ej. "Corrección", insumo). */
  etiquetas?: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 rounded-control px-2 py-3 hover:bg-fondo-suave">
      <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-marca-suave text-marca">
        <IconoActividad tipo={tipo} className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <p className="text-base font-semibold text-tinta">{TIPO_ACTIVIDAD_LABEL[tipo]}</p>
          <p className="flex items-center gap-3 text-sm text-tinta-suave">
            {responsable && (
              <span className="inline-flex items-center gap-1">
                <UserRound className="h-4 w-4" aria-hidden />
                {responsable}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-4 w-4" aria-hidden />
              {formatearFecha(fecha)}
            </span>
          </p>
        </div>
        <p className="mt-0.5 line-clamp-2 text-sm text-tinta-suave">{descripcion}</p>
        {etiquetas && <div className="mt-2 flex flex-wrap gap-1.5">{etiquetas}</div>}
      </div>
    </div>
  );
}
