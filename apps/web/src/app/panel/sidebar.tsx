"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ROL_LABEL, type Rol } from "@/lib/types";

interface NavItem {
  href: string;
  label: string;
  roles: Rol[];
}

const NAV_ITEMS: NavItem[] = [
  { href: "/panel/dashboard", label: "Dashboard", roles: ["JEFE", "CONTABILIDAD"] },
  { href: "/panel/parcelas", label: "Parcelas", roles: ["JEFE", "CONTABILIDAD", "OPERATIVO"] },
  { href: "/panel/reportes", label: "Reportes", roles: ["JEFE", "CONTABILIDAD"] },
  { href: "/panel/contactos", label: "Contactos", roles: ["JEFE", "CONTABILIDAD", "OPERATIVO"] },
];

export function Sidebar() {
  const { usuario, logout } = useAuth();
  const pathname = usePathname();

  if (!usuario) return null;

  const items = NAV_ITEMS.filter((item) => item.roles.includes(usuario.rol));

  return (
    <aside className="flex h-full w-60 flex-col border-r border-stone-200 bg-white">
      <div className="border-b border-stone-200 px-6 py-5">
        <Link href="/panel/dashboard" className="text-lg font-bold text-emerald-700">
          AgriTrack
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {items.map((item) => {
          const activo = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-md px-3 py-2 text-sm font-medium ${
                activo
                  ? "bg-emerald-50 text-emerald-800"
                  : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-stone-200 px-4 py-4">
        <p className="text-sm font-medium text-stone-900">{usuario.nombre}</p>
        <p className="text-xs text-stone-500">{ROL_LABEL[usuario.rol]}</p>
        <button
          onClick={logout}
          className="mt-3 w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm text-stone-700 hover:bg-stone-100"
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
