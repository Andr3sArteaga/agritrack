"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronRight,
  Contact,
  FileBarChart,
  LayoutDashboard,
  LogOut,
  MapPinned,
  UserCheck,
  UserRound,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import logoBlack from "@/assets/Logo_AgriTrack_black.png";
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
    label: "Resumen",
    ayuda: "Estado de las parcelas y resumen de la operación",
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
  {
    href: "/panel/solicitudes",
    label: "Solicitudes de acceso",
    ayuda: "Revisar y aprobar solicitudes de nuevos integrantes del equipo",
    icono: UserCheck,
    roles: ["JEFE"],
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
        className={`fixed inset-y-0 left-0 z-[950] flex w-60 flex-col border-r border-[#E4EAE6] bg-white transition-transform md:static md:z-auto md:h-full md:translate-x-0 ${
          abierto ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-[#E4EAE6] px-6 py-5">
          <Link
            href="/panel/dashboard"
            className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-[#006B4F]"
          >
            <Image
              src={logoBlack}
              alt="Logo AgriTrack"
              className="h-8 w-8 object-contain"
              priority
            />
            <span>AgriTrack</span>
          </Link>
          <button
            onClick={onCerrar}
            aria-label="Cerrar menú"
            title="Cerrar menú"
            className="rounded-md p-1 text-[#68736D] hover:bg-[#F8FAF9] hover:text-[#17211D] md:hidden"
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
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
                  activo
                    ? "bg-[#E8F5EF] text-[#006B4F]"
                    : "text-[#68736D] hover:bg-[#F8FAF9] hover:text-[#17211D]"
                }`}
              >
                <Icono
                  className={`h-5 w-5 shrink-0 ${activo ? "text-[#006B4F]" : "text-[#68736D]"}`}
                  aria-hidden
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-[#E4EAE6] px-4 py-4">
          <Link
            href="/panel/perfil"
            onClick={onCerrar}
            title="Ver o editar mi perfil"
            className="-mx-2 flex items-center justify-between gap-2 rounded-xl p-2 transition-colors hover:bg-[#F8FAF9]"
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E8F5EF] text-[#006B4F]">
                <UserRound className="h-4 w-4" aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#17211D]">
                  {usuario.nombre}
                  {usuario.apellido ? ` ${usuario.apellido}` : ""}
                </p>
                <p className="text-xs text-[#68736D]">{ROL_LABEL[usuario.rol]}</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-[#68736D]" aria-hidden />
          </Link>
          <button
            onClick={logout}
            title="Cerrar la sesión en este equipo"
            className="mt-3 flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-[#E4EAE6] bg-white px-3 py-1.5 text-sm font-medium text-[#17211D] hover:bg-[#F8FAF9]"
          >
            <LogOut className="h-4 w-4 text-[#68736D]" aria-hidden />
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  );
}
