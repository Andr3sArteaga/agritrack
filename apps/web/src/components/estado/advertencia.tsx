import { ClipboardCheck } from "lucide-react";
import type { TextoControlado } from "@/lib/textos";
import { ESTILO_ESTADO } from "./estado-badge";
import { EtiquetaRevision } from "./marcadores";

type TipoAdvertencia = "ATENCION" | "CRITICO" | "SIN_DATOS" | "PENDIENTE";

const ESTILO_PENDIENTE = {
  icono: ClipboardCheck,
  caja: "border-pend-borde bg-pend-fondo text-pend-texto",
  claseIcono: "text-pend-icono",
};

/**
 * Advertencia con color, icono y titulo. Si se le pasa el texto controlado y este
 * esta pendiente de revision, muestra la etiqueta "Texto pendiente de revisión".
 */
export function Advertencia({
  tipo,
  titulo,
  texto,
  rol = "note",
  children,
}: {
  tipo: TipoAdvertencia;
  titulo: string;
  texto?: TextoControlado;
  /** "alert" para mensajes que el lector de pantalla debe leer de inmediato (errores). */
  rol?: "note" | "alert";
  children?: React.ReactNode;
}) {
  const estilo = tipo === "PENDIENTE" ? ESTILO_PENDIENTE : ESTILO_ESTADO[tipo];
  // La franja izquierda (gruesa) siempre solida; el resto del borde marca el tipo.
  const punteado =
    tipo === "SIN_DATOS"
      ? "border-dashed [border-left-style:solid]"
      : tipo === "PENDIENTE"
        ? "border-dotted [border-left-style:solid]"
        : "";
  const Icono = estilo.icono;
  return (
    <div
      role={rol}
      className={`flex items-start gap-3 rounded-lg border-2 border-l-[10px] p-3 ${estilo.caja} ${punteado}`}
    >
      <Icono size={22} className={`mt-0.5 shrink-0 ${estilo.claseIcono}`} aria-hidden />
      <div>
        <p className="font-bold">{titulo}</p>
        {(texto || children) && <p className="mt-1 text-[15px]">{texto?.texto ?? children}</p>}
        {texto?.estado === "PENDIENTE_REVISION" && <EtiquetaRevision />}
      </div>
    </div>
  );
}
