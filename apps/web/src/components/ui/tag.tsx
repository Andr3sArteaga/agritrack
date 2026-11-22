import type { LucideIcon } from "lucide-react";

const TONOS = {
  neutro: "border-borde bg-fondo-suave text-tinta",
  marca: "border-marca-suave bg-marca-suave text-marca",
} as const;

/**
 * Etiqueta que NO es un estado (ej. "En preventa", tipo de contacto).
 * Nunca usa los colores de Bien/Atencion/Critico: para eso esta EstadoBadge.
 */
export function Tag({
  tono = "neutro",
  icono: Icono,
  children,
}: {
  tono?: keyof typeof TONOS;
  icono?: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-sm font-medium ${TONOS[tono]}`}
    >
      {Icono && <Icono className="h-3.5 w-3.5 shrink-0" aria-hidden />}
      {children}
    </span>
  );
}
