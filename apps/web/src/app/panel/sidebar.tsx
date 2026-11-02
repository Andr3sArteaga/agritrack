"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Contact,
  FileBarChart,
  LayoutDashboard,
  LogOut,
  MapPinned,
  UserRound,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { ROL_LABEL, type Rol } from "@/lib/types";

interface NavItem {
  href: string;
  label: string;
  ayuda: string;
  icono: LucideIcon;
  roles: Rol[];
}

const NAV_ITEMS: NavItem[] = [
  {
    href: "/panel/dashboard",
    label: "Dashboard",
    ayuda: "Resumen general: hectáreas, campañas y rendimientos",
    icono: LayoutDashboard,
    roles: ["JEFE", "CONTABILIDAD"],
  },
  {
    href: "/panel/parcelas",
    label: "Parcelas",
    ayuda: "Mapa y lista de parcelas, campañas y labores de campo",
    icono: MapPinned,
    roles: ["JEFE", "CONTABILIDAD", "OPERATIVO"],
  },
  {
    href: "/panel/costos",
    label: "Costos",
    ayuda: "Gastos y presupuesto de cada campaña",
    icono: Wallet,
    roles: ["JEFE", "CONTABILIDAD"],
  },
  {
    href: "/panel/reportes",
    label: "Reportes",
    ayuda: "Histórico de campañas y rendimientos",
    icono: FileBarChart,
    roles: ["JEFE", "CONTABILIDAD"],
  },
  {
    href: "/panel/contactos",
    label: "Contactos",
    ayuda: "Compradores, transportistas, proveedores y otros contactos",
    icono: Contact,
    roles: ["JEFE", "CONTABILIDAD", "OPERATIVO"],
  },
];

/** En pantallas chicas es un cajon que se abre con el boton de menu; desde `md` es fijo. */
export function Sidebar({
  abierto,
  onCerrar,
}: {
  abierto: boolean;
  onCerrar: () => void;
}) {
  const { usuario, logout } = useAuth();
  const pathname = usePathname();

  if (!usuario) return null;

  const items = NAV_ITEMS.filter((item) => item.roles.includes(usuario.rol));

  return (
    <>
      {abierto && (
        <div
          className="fixed inset-0 z-[900] bg-black/40 md:hidden"
          onClick={onCerrar}
          aria-hidden
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-[950] flex w-60 flex-col border-r border-stone-200 bg-white transition-transform md:static md:z-auto md:h-full md:translate-x-0 ${
          abierto ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-stone-200 px-6 py-5">
          <Link href="/panel/dashboard" className="text-lg font-bold text-emerald-700">
            AgriTrack
          </Link>
          <button
            onClick={onCerrar}
            aria-label="Cerrar menú"
            title="Cerrar menú"
            className="rounded-md p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600 md:hidden"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {items.map((item) => {
            const activo = pathname.startsWith(item.href);
            const Icono = item.icono;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.ayuda}
                onClick={onCerrar}
                aria-current={activo ? "page" : undefined}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium ${
                  activo
                    ? "bg-emerald-50 text-emerald-800"
                    : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                }`}
              >
                <Icono
                  className={`h-5 w-5 shrink-0 ${activo ? "text-emerald-700" : "text-stone-400"}`}
                  aria-hidden
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-stone-200 px-4 py-4">
          <div className="flex items-center gap-2">
            <UserRound className="h-5 w-5 shrink-0 text-stone-400" aria-hidden />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-stone-900">{usuario.nombre}</p>
              <p className="text-xs text-stone-500">{ROL_LABEL[usuario.rol]}</p>
            </div>
          </div>
          <button
            onClick={logout}
            title="Cerrar la sesión en este equipo"
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-md border border-stone-300 px-3 py-1.5 text-sm text-stone-700 hover:bg-stone-100"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  );
}
