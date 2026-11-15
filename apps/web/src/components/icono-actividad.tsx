import {
  Beaker,
  Droplets,
  FlaskConical,
  SprayCan,
  Sprout,
  Wheat,
  type LucideIcon,
} from "lucide-react";
import type { TipoActividad } from "@/lib/types";

const ICONO_ACTIVIDAD: Record<TipoActividad, LucideIcon> = {
  SIEMBRA: Sprout,
  FUMIGACION: SprayCan,
  FERTILIZACION: FlaskConical,
  MEDICION_HUMEDAD_SUELO: Droplets,
  MEDICION_HUMEDAD_GRANO: Beaker,
  COSECHA: Wheat,
};

export function IconoActividad({ tipo }: { tipo: TipoActividad }) {
  const Icono = ICONO_ACTIVIDAD[tipo];
  return <Icono className="h-4 w-4 shrink-0 text-stone-400" aria-hidden />;
}
