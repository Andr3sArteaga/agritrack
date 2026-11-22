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
      <h1 className="flex items-center gap-2.5 text-[28px] font-semibold leading-tight text-tinta">
        <Icono className="h-7 w-7 shrink-0 text-marca" aria-hidden />
        {titulo}
      </h1>
      <p className="mt-1 text-base text-tinta-suave">{descripcion}</p>
    </div>
  );
}
