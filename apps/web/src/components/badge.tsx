import {
  Ban,
  CalendarClock,
  CircleCheck,
  CircleOff,
  Clock,
  Moon,
  Sprout,
  Wheat,
  type LucideIcon,
} from "lucide-react";
import {
  ESTADO_CAMPANA_LABEL,
  ESTADO_GASTO_LABEL,
  type EstadoCampana,
  type EstadoGasto,
} from "@/lib/types";

const TONOS = {
  verde: "bg-emerald-100 text-emerald-800",
  ambar: "bg-amber-100 text-amber-800",
  gris: "bg-stone-200 text-stone-700",
  rojo: "bg-red-100 text-red-800",
} as const;

export type TonoBadge = keyof typeof TONOS;

/** Etiqueta de estado: color + icono (no depende solo del color) + ayuda al pasar el cursor. */
export function Badge({
  tono,
  icono: Icono,
  ayuda,
  children,
}: {
  tono: TonoBadge;
  icono: LucideIcon;
  ayuda?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      title={ayuda}
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${TONOS[tono]}`}
    >
      <Icono className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {children}
    </span>
  );
}

const CAMPANA_BADGE: Record<
  EstadoCampana,
  { tono: TonoBadge; icono: LucideIcon; ayuda: string }
> = {
  PLANIFICADA: {
    tono: "ambar",
    icono: CalendarClock,
    ayuda: "La campaña está programada pero todavía no empezó",
  },
  EN_CURSO: {
    tono: "verde",
    icono: Sprout,
    ayuda: "La campaña se está ejecutando ahora",
  },
  COSECHADA: {
    tono: "gris",
    icono: Wheat,
    ayuda: "La campaña terminó y ya se cosechó",
  },
};

export function BadgeEstadoCampana({ estado }: { estado: EstadoCampana }) {
  const { tono, icono, ayuda } = CAMPANA_BADGE[estado];
  return (
    <Badge tono={tono} icono={icono} ayuda={ayuda}>
      {ESTADO_CAMPANA_LABEL[estado]}
    </Badge>
  );
}

/**
 * Estado de la parcela: inactiva (desactivada), en descanso (activa pero sin
 * campaña en curso ni planificada) o activa (con campaña vigente).
 */
export function BadgeEstadoParcela({
  activa,
  conCampanaVigente,
}: {
  activa: boolean;
  conCampanaVigente: boolean;
}) {
  if (!activa) {
    return (
      <Badge
        tono="gris"
        icono={CircleOff}
        ayuda="Parcela desactivada: no aparece en el mapa ni en la preventa"
      >
        Inactiva
      </Badge>
    );
  }
  if (!conCampanaVigente) {
    return (
      <Badge
        tono="ambar"
        icono={Moon}
        ayuda="Parcela activa sin campaña en curso ni planificada"
      >
        En descanso
      </Badge>
    );
  }
  return (
    <Badge
      tono="verde"
      icono={CircleCheck}
      ayuda="Parcela activa con una campaña en curso o planificada"
    >
      Activa
    </Badge>
  );
}

/** Estado de un gasto; un gasto anulado se muestra siempre como "Anulado". */
export function BadgeEstadoGasto({
  estado,
  anulado,
}: {
  estado: EstadoGasto;
  anulado: boolean;
}) {
  if (anulado) {
    return (
      <Badge tono="rojo" icono={Ban} ayuda="Anulado: queda registrado pero no cuenta en los totales">
        Anulado
      </Badge>
    );
  }
  if (estado === "PAGADO") {
    return (
      <Badge tono="verde" icono={CircleCheck} ayuda="Ya se pagó: cuenta como gasto real">
        {ESTADO_GASTO_LABEL[estado]}
      </Badge>
    );
  }
  return (
    <Badge tono="ambar" icono={Clock} ayuda="Todavía no se pagó: se muestra aparte del gasto real">
      {ESTADO_GASTO_LABEL[estado]}
    </Badge>
  );
}
