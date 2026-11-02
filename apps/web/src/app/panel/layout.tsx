"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
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
        <p className="text-stone-500">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <header className="flex items-center gap-3 border-b border-stone-200 bg-white px-4 py-3 md:hidden">
        <button
          onClick={() => setMenuAbierto(true)}
          aria-label="Abrir menú"
          title="Abrir menú"
          className="rounded-md p-1 text-stone-600 hover:bg-stone-100"
        >
          <Menu className="h-6 w-6" aria-hidden />
        </button>
        <span className="text-lg font-bold text-emerald-700">AgriTrack</span>
      </header>
      <Sidebar abierto={menuAbierto} onCerrar={() => setMenuAbierto(false)} />
      <main className="min-w-0 flex-1 overflow-y-auto bg-stone-50 px-4 py-6 md:px-8 md:py-8">
        {children}
      </main>
    </div>
  );
}
