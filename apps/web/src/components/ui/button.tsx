import Link from "next/link";
import type { LucideIcon } from "lucide-react";

const BASE =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-control px-4 text-base font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60";

const VARIANTES = {
  principal: "bg-marca text-white hover:bg-marca-hover",
  secundario: "border border-borde bg-superficie text-tinta hover:bg-fondo-suave",
  fantasma: "text-marca hover:bg-marca-suave",
  peligro: "bg-critico-borde text-white hover:bg-critico-texto",
} as const;

export type VarianteBoton = keyof typeof VARIANTES;

const clases = (variante: VarianteBoton, completo: boolean) =>
  `${BASE} ${VARIANTES[variante]} ${completo ? "w-full" : ""}`;

/** Boton con texto claro, alto minimo de 44 px y un icono opcional a la izquierda. */
export function Button({
  variante = "principal",
  icono: Icono,
  completo = false,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: VarianteBoton;
  icono?: LucideIcon;
  completo?: boolean;
}) {
  return (
    <button type="button" {...props} className={clases(variante, completo)}>
      {Icono && <Icono className="h-5 w-5 shrink-0" aria-hidden />}
      {children}
    </button>
  );
}

/** Enlace con forma de boton (misma apariencia que Button). */
export function LinkButton({
  href,
  variante = "principal",
  icono: Icono,
  completo = false,
  children,
}: {
  href: string;
  variante?: VarianteBoton;
  icono?: LucideIcon;
  completo?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={clases(variante, completo)}>
      {Icono && <Icono className="h-5 w-5 shrink-0" aria-hidden />}
      {children}
    </Link>
  );
}
