import type { LucideIcon } from "lucide-react";

/** Titulo de pagina con icono y descripcion corta (mismo estilo en todo el panel). */
export function EncabezadoPagina({
  icono: Icono,
  titulo,
  descripcion,
}: {
  icono: LucideIcon;
  titulo: string;
  descripcion: string;
}) {
  return (
    <div>
      <h1 className="flex items-center gap-2 text-2xl font-bold text-stone-900">
        <Icono className="h-6 w-6 shrink-0 text-emerald-700" aria-hidden />
        {titulo}
      </h1>
      <p className="mt-1 text-stone-600">{descripcion}</p>
    </div>
  );
}
