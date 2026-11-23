import Link from "next/link";

/** Encabezado de la parte publica: marca a la izquierda y las acciones de cada pantalla a la derecha. */
export function EncabezadoPublico({
  ancho = "max-w-6xl",
  children,
}: {
  ancho?: "max-w-6xl" | "max-w-5xl";
  children?: React.ReactNode;
}) {
  return (
    <header className="border-b border-borde bg-superficie">
      <div className={`mx-auto flex ${ancho} flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6`}>
        <Link href="/" className="text-2xl font-bold text-marca">
          AgriTrack
        </Link>
        <nav className="flex flex-wrap items-center gap-2">{children}</nav>
      </div>
    </header>
  );
}
