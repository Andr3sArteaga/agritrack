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
  secuencia,
  reemplazada = false,
  etiquetas,
  acciones,
  nota,
}: {
  tipo: TipoActividad;
  fecha: string;
  descripcion: string;
  responsable?: string | null;
  /** Numero en la cadena de registros protegidos. */
  secuencia?: number;
  /** true = una correccion la reemplazo: se muestra tachada, pero sigue en el historial. */
  reemplazada?: boolean;
  /** Chips extra (ej. insumo, cantidad, rendimiento). */
  etiquetas?: React.ReactNode;
  /** Botones a la derecha (ej. "Corregir"). */
  acciones?: React.ReactNode;
  /** Linea final pequeña (ej. "Corrige a #12: motivo"). */
  nota?: React.ReactNode;
}) {
  return (
    <div
      className={`flex gap-3 rounded-control px-2 py-3 ${
        reemplazada ? "bg-fondo-suave opacity-70" : "hover:bg-fondo-suave"
      }`}
    >
      <span
        className={`mt-0.5 grid size-9 shrink-0 place-items-center rounded-full ${
          reemplazada ? "bg-fondo text-tinta-suave" : "bg-marca-suave text-marca"
        }`}
      >
        <IconoActividad tipo={tipo} className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
          <div className="min-w-0">
            <p className="flex flex-wrap items-baseline gap-x-2 text-base font-semibold text-tinta">
              {TIPO_ACTIVIDAD_LABEL[tipo]}
              {secuencia !== undefined && (
                <span className="text-sm font-normal text-tinta-suave">#{secuencia}</span>
              )}
              {reemplazada && (
                <span className="rounded-full bg-fondo px-2 py-0.5 text-xs font-medium text-tinta-suave">
                  Reemplazada por corrección
                </span>
              )}
            </p>
            <p className="mt-0.5 flex flex-wrap items-center gap-3 text-sm text-tinta-suave">
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-4 w-4" aria-hidden />
                {formatearFecha(fecha)}
              </span>
              {responsable && (
                <span className="inline-flex items-center gap-1">
                  <UserRound className="h-4 w-4" aria-hidden />
                  {responsable}
                </span>
              )}
            </p>
          </div>
        </div>
        <p className={`mt-1.5 text-sm ${reemplazada ? "text-tinta-suave line-through" : "text-tinta"}`}>
          {descripcion}
        </p>
        {etiquetas && <div className="mt-2 flex flex-wrap gap-1.5">{etiquetas}</div>}
        {nota && <p className="mt-2 text-sm font-medium text-atencion-texto">{nota}</p>}
        {/* Al final y no junto al titulo: en el celular no corta el texto de la actividad. */}
        {acciones && <div className="mt-2 flex flex-wrap justify-end gap-2">{acciones}</div>}
      </div>
    </div>
  );
}
