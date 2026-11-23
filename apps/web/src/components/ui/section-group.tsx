import { ChevronRight } from "lucide-react";

/**
 * Grupo que se expande y se colapsa (como "Fijadas / Sin empezar" de la referencia).
 * Usa <details>: funciona con teclado y sin JavaScript.
 */
export function SectionGroup({
  titulo,
  cantidad,
  abierto = true,
  acciones,
  children,
}: {
  /** Texto o un elemento (ej. un EstadoBadge cuando se agrupa por estado). */
  titulo: React.ReactNode;
  cantidad?: number;
  abierto?: boolean;
  /** Botones a la derecha del titulo. */
  acciones?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <details open={abierto} className="group border-b border-borde last:border-b-0">
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2.5 py-2 [&::-webkit-details-marker]:hidden">
        <ChevronRight
          className="h-4 w-4 shrink-0 text-tinta-suave transition-transform group-open:rotate-90"
          aria-hidden
        />
        <span className="text-base font-semibold text-tinta">{titulo}</span>
        {cantidad !== undefined && (
          <span className="rounded-full bg-fondo px-2 py-0.5 text-xs font-semibold text-tinta-suave">
            {cantidad}
          </span>
        )}
        {acciones && <span className="ml-auto flex items-center gap-1">{acciones}</span>}
      </summary>
      <div className="pb-3">{children}</div>
    </details>
  );
}
