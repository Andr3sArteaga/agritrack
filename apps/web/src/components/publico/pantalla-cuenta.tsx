import Image from "next/image";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import logoWhite from "@/assets/Logo_AgriTrack_white.png";

/** Arcos y nubes del fondo (decorativos). */
const ARCOS = ["size-[640px]", "size-[960px]", "size-[1280px]"];
const NUBES = [
  "-left-24 bottom-[-6rem] h-72 w-[38rem]",
  "left-1/3 bottom-[-8rem] h-80 w-[44rem]",
  "-right-24 bottom-[-5rem] h-64 w-[36rem]",
];

/**
 * Pantallas de cuenta (ingresar, solicitar acceso, recuperar y restablecer contrasena):
 * cielo con arcos y nubes suaves, logo arriba a la izquierda y el contenido al centro.
 */
export function PantallaCuenta({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative isolate flex min-h-screen flex-col overflow-hidden bg-linear-to-b from-cielo-intenso via-cielo to-hueso text-tinta">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        {ARCOS.map((tamano) => (
          <span
            key={tamano}
            className={`absolute left-1/2 top-[38%] -translate-x-1/2 rounded-full border border-white/70 ${tamano}`}
          />
        ))}
        {NUBES.map((posicion) => (
          <span key={posicion} className={`absolute rounded-full bg-white/90 blur-3xl ${posicion}`} />
        ))}
      </div>

      <header className="px-4 pt-5 sm:px-8 sm:pt-7">
        <Link href="/" className="inline-flex min-h-11 items-center gap-2.5 text-tinta">
          <span className="grid size-10 place-items-center rounded-control bg-tinta">
            <Image src={logoWhite} alt="" className="h-6 w-6 object-contain" priority />
          </span>
          <span className="font-titulo text-[26px] leading-none">AgriTrack</span>
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">{children}</main>
    </div>
  );
}

/** Tarjeta semitransparente con icono, titulo con serifa y descripcion. */
export function TarjetaCuenta({
  icono: Icono,
  titulo,
  descripcion,
  ancho = "md",
  children,
}: {
  icono: LucideIcon;
  titulo: string;
  descripcion: string;
  ancho?: "md" | "lg";
  children: React.ReactNode;
}) {
  return (
    <div
      className={`relative w-full overflow-hidden rounded-[28px] border border-white/80 bg-white/65 p-7 shadow-flotante backdrop-blur-xl sm:p-9 ${
        ancho === "lg" ? "max-w-lg" : "max-w-md"
      }`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-linear-to-b from-cielo/70 to-transparent"
      />
      <div className="relative text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-superficie text-tinta shadow-tarjeta">
          <Icono className="h-6 w-6" aria-hidden />
        </span>
        <h1 className="mt-5 font-titulo text-4xl leading-tight text-tinta">{titulo}</h1>
        <p className="mx-auto mt-2 max-w-sm text-base text-tinta-suave">{descripcion}</p>
      </div>
      <div className="relative">{children}</div>
    </div>
  );
}
