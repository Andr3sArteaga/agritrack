import {
  CircleCheck,
  CircleDashed,
  OctagonAlert,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { ETIQUETA_ESTADO, type EstadoIndicador } from "@/lib/estado";

/**
 * Estilo de cada estado. Se reconoce por color + icono + palabra; "Sin datos" ademas
 * lleva borde punteado para distinguirse en escala de grises.
 * Las clases estan completas (Tailwind no detecta nombres armados con texto).
 */
export const ESTILO_ESTADO: Record<
  EstadoIndicador,
  { icono: LucideIcon; caja: string; claseIcono: string; punteado: boolean }
> = {
  BIEN: {
    icono: CircleCheck,
    caja: "border-bien-borde bg-bien-fondo text-bien-texto",
    claseIcono: "text-bien-icono",
    punteado: false,
  },
  ATENCION: {
    icono: TriangleAlert,
    caja: "border-atencion-borde bg-atencion-fondo text-atencion-texto",
    claseIcono: "text-atencion-icono",
    punteado: false,
  },
  CRITICO: {
    icono: OctagonAlert,
    caja: "border-critico-borde bg-critico-fondo text-critico-texto",
    claseIcono: "text-critico-icono",
    punteado: false,
  },
  SIN_DATOS: {
    icono: CircleDashed,
    caja: "border-sindatos-borde bg-sindatos-fondo text-sindatos-texto",
    claseIcono: "text-sindatos-icono",
    punteado: true,
  },
};

const TAMANO = {
  sm: { caja: "px-2 py-0.5 text-sm", icono: 14 },
  md: { caja: "px-2.5 py-1 text-sm", icono: 16 },
  lg: { caja: "px-3.5 py-1.5 text-base", icono: 18 },
} as const;

export function EstadoBadge({
  estado,
  tamano = "md",
  rotulo,
}: {
  estado: EstadoIndicador;
  tamano?: keyof typeof TAMANO;
  /** Nombre de lo que se evalua (ej. "Suelo"): se muestra como "Suelo: Sin datos". */
  rotulo?: string;
}) {
  const estilo = ESTILO_ESTADO[estado];
  const medida = TAMANO[tamano];
  const Icono = estilo.icono;
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border-2 font-bold ${estilo.caja} ${
        estilo.punteado ? "border-dashed" : ""
      } ${medida.caja}`}
    >
      <Icono size={medida.icono} className={`shrink-0 ${estilo.claseIcono}`} aria-hidden />
      {rotulo ? `${rotulo}: ` : ""}
      {ETIQUETA_ESTADO[estado]}
    </span>
  );
}
