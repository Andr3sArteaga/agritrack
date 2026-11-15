import Link from "next/link";

const BASE =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md border-2 px-5 text-base font-bold";

const VARIANTES = {
  primario: "border-emerald-700 bg-emerald-700 text-white hover:bg-emerald-800",
  secundario: "border-emerald-700 bg-white text-emerald-800 hover:bg-emerald-50",
} as const;

/** Enlace con forma de boton: texto claro, alto minimo de 44 px. */
export function EnlaceBoton({
  href,
  variante = "primario",
  completo = false,
  children,
}: {
  href: string;
  variante?: keyof typeof VARIANTES;
  /** Ocupa todo el ancho disponible. */
  completo?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={`${BASE} ${VARIANTES[variante]} ${completo ? "w-full" : ""}`}>
      {children}
    </Link>
  );
}
