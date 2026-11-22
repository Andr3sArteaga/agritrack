"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import logoBlack from "@/assets/Logo_AgriTrack_black.png";
import { useAuth } from "@/lib/auth-context";
import { Sidebar } from "./sidebar";

export default function PanelLayout({ children }: LayoutProps<"/panel">) {
  const { usuario, cargando } = useAuth();
  const router = useRouter();
  const [menuAbierto, setMenuAbierto] = useState(false);

  useEffect(() => {
    if (!cargando && !usuario) {
      router.replace("/login");
    }
  }, [cargando, usuario, router]);

  if (cargando || !usuario) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-tinta-suave">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <header className="sticky top-0 z-[800] flex items-center gap-2 border-b border-borde bg-superficie px-2 py-2 md:hidden">
        <button
          onClick={() => setMenuAbierto(true)}
          aria-label="Abrir menú"
          title="Abrir menú"
          className="grid size-11 place-items-center rounded-control text-tinta hover:bg-fondo"
        >
          <Menu className="h-6 w-6" aria-hidden />
        </button>
        <div className="flex items-center gap-2">
          <Image
            src={logoBlack}
            alt=""
            className="h-7 w-7 object-contain"
            priority
          />
          <span className="text-lg font-semibold text-marca">AgriTrack</span>
        </div>
      </header>
      <Sidebar abierto={menuAbierto} onCerrar={() => setMenuAbierto(false)} />
      <main className="min-w-0 flex-1 bg-fondo px-4 py-6 md:px-8 md:py-8">
        <div className="mx-auto w-full max-w-[1400px]">{children}</div>
      </main>
    </div>
  );
}
