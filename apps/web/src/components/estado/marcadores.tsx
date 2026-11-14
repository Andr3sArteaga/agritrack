import { ClipboardCheck, Hourglass } from "lucide-react";
import { TEXTOS } from "@/lib/textos";

/**
 * Marcadores "Pendiente": NO son estados. "Sin datos" dice que falta el dato;
 * "Pendiente" dice que falta una regla, una aprobacion o una pieza del sistema.
 * Violeta con borde de puntos para que no se confundan con los cuatro estados.
 */
type TipoPendiente = "REGLA" | "REVISION" | "DATOS";

const PREDETERMINADO: Record<TipoPendiente, { texto: string; corto: string }> = {
  REGLA: { texto: TEXTOS.REGLA_PENDIENTE.texto, corto: "Pendiente de regla" },
  REVISION: { texto: "Pendiente de revisión", corto: "Pendiente de revisión" },
  DATOS: { texto: "Pendiente de datos", corto: "Pendiente de datos" },
};

export function MarcadorPendiente({
  tipo,
  etiqueta,
  corto = false,
}: {
  tipo: TipoPendiente;
  /** Reemplaza el texto (ej. "% de superficie: pendiente"). */
  etiqueta?: string;
  /** Version corta para filas con poco espacio. */
  corto?: boolean;
}) {
  const Icono = tipo === "REGLA" ? ClipboardCheck : Hourglass;
  const texto = etiqueta ?? (corto ? PREDETERMINADO[tipo].corto : PREDETERMINADO[tipo].texto);
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-dotted border-pend-borde bg-pend-fondo px-2 py-0.5 text-sm font-bold text-pend-texto">
      <Icono size={14} className="shrink-0 text-pend-icono" aria-hidden />
      {texto}
    </span>
  );
}

/** Etiqueta de un texto nuevo que aun no aprobo el Responsable del equipo. */
export function EtiquetaRevision() {
  return (
    <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border-2 border-dotted border-pend-borde bg-pend-fondo px-2 py-0.5 text-sm font-bold text-pend-texto">
      <Hourglass size={14} className="shrink-0 text-pend-icono" aria-hidden />
      Texto pendiente de revisión
    </span>
  );
}
