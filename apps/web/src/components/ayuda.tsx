import { CircleHelp } from "lucide-react";

/** Icono "?" con una explicacion breve (al pasar el cursor o enfocar con teclado). */
export function Ayuda({ texto }: { texto: string }) {
  return (
    <span
      tabIndex={0}
      role="note"
      title={texto}
      aria-label={texto}
      className="inline-flex shrink-0 cursor-help rounded-full text-stone-400 hover:text-stone-600 focus:text-stone-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
    >
      <CircleHelp className="h-4 w-4" aria-hidden />
    </span>
  );
}
