"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import logoWhite from "@/assets/Logo_AgriTrack_white.png";

export function LandingNavbar() {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const pathname = usePathname();
  const enCatalogo = pathname.startsWith("/parcelas");

  return (
    <header className="sticky top-0 z-[900] border-b border-white/10 bg-marca-oscuro/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6 md:grid md:grid-cols-[1fr_auto_auto]">
        <Link
          href="/#inicio"
          className="flex w-fit items-center gap-2.5 rounded-full py-1 text-white"
        >
          <Image
            src={logoWhite}
            alt="Logo AgriTrack"
            className="h-9 w-9 object-contain"
            priority
          />
          <span className="text-lg font-bold tracking-tight">AgriTrack</span>
        </Link>

        <nav
          aria-label="Navegación principal"
          className="hidden items-center justify-end gap-6 text-sm font-semibold text-marca-suave/90 md:flex"
        >
          <Link
            href="/#inicio"
            className="transition-colors hover:text-white"
          >
            Inicio
          </Link>
          <Link
            href="/parcelas"
            className={`transition-colors hover:text-white ${enCatalogo ? "text-white underline decoration-marca-vivo decoration-2 underline-offset-8" : ""
              }`}
          >
            Catálogo
          </Link>
        </nav>

        <div className="flex items-center justify-end gap-2">
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-marca-vivo px-5 text-sm font-bold text-noche shadow-sm transition-colors hover:bg-marca-vivo/90"
          >
            Acceder
          </Link>

          <button
            type="button"
            onClick={() => setMenuAbierto((prev) => !prev)}
            aria-expanded={menuAbierto}
            aria-label={menuAbierto ? "Cerrar menú" : "Abrir menú"}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 text-white hover:bg-white/10 md:hidden"
          >
            {menuAbierto ? (
              <X className="h-5 w-5" aria-hidden />
            ) : (
              <Menu className="h-5 w-5" aria-hidden />
            )}
          </button>
        </div>
      </div>

      {menuAbierto && (
        <nav
          aria-label="Menú móvil"
          className="border-t border-white/10 bg-marca-noche px-4 py-3 md:hidden"
        >
          <div className="flex flex-col gap-1 text-sm font-semibold text-marca-suave">
            <Link
              href="/#inicio"
              onClick={() => setMenuAbierto(false)}
              className="flex min-h-11 items-center rounded-tarjeta px-3 hover:bg-white/10"
            >
              Inicio
            </Link>
            <Link
              href="/#parcelas-preventa"
              onClick={() => setMenuAbierto(false)}
              className="flex min-h-11 items-center rounded-tarjeta px-3 hover:bg-white/10"
            >
              Parcelas de preventa
            </Link>
            <Link
              href="/parcelas"
              onClick={() => setMenuAbierto(false)}
              className={`flex min-h-11 items-center rounded-tarjeta px-3 hover:bg-white/10 ${enCatalogo ? "bg-white/10 text-white" : ""
                }`}
            >
              Catálogo
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
