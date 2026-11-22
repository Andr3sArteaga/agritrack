"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
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
import logoWhite from "@/assets/Logo_AgriTrack_white.png";
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

/**
 * Texto que se ve en el celular (cajon) y en pantallas grandes; en tamaño
 * mediano la barra queda solo con iconos y el texto sigue para lectores de pantalla.
 */
const TEXTO = "md:sr-only xl:not-sr-only";

/**
 * Barra lateral oscura. Celular: cajon que se abre con el boton de menu.
 * Tablet / laptop chica: solo iconos. Desde 1280 px: iconos con texto.
 */
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
  const nombre = `${usuario.nombre}${usuario.apellido ? ` ${usuario.apellido}` : ""}`;
  const enPerfil = pathname.startsWith("/panel/perfil");

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
        className={`fixed inset-y-0 left-0 z-[950] flex w-64 flex-col bg-tinta text-white transition-transform md:sticky md:top-0 md:z-auto md:h-dvh md:w-[76px] md:translate-x-0 xl:w-60 ${
          abierto ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-4 py-5 md:justify-center xl:justify-between xl:px-5">
          <Link
            href="/panel/dashboard"
            title="AgriTrack"
            className="flex items-center gap-2.5 rounded-control text-lg font-semibold tracking-tight"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-control bg-marca">
              <Image src={logoWhite} alt="" className="h-6 w-6 object-contain" priority />
            </span>
            <span className={TEXTO}>AgriTrack</span>
          </Link>
          <button
            onClick={onCerrar}
            aria-label="Cerrar menú"
            title="Cerrar menú"
            className="grid size-11 place-items-center rounded-control text-white/75 hover:bg-white/10 hover:text-white md:hidden"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <nav aria-label="Menú principal" className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
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
                className={`flex min-h-11 items-center gap-3 rounded-control px-3 text-base font-medium transition-colors md:justify-center xl:justify-start ${
                  activo
                    ? "bg-marca text-white"
                    : "text-white/75 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icono className="h-5 w-5 shrink-0" aria-hidden />
                <span className={TEXTO}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="space-y-1 border-t border-white/10 px-3 py-4">
          <Link
            href="/panel/perfil"
            onClick={onCerrar}
            title={`${nombre} · ${ROL_LABEL[usuario.rol]}. Ver o editar mi perfil`}
            aria-current={enPerfil ? "page" : undefined}
            className={`flex min-h-11 items-center gap-3 rounded-control px-2 py-1.5 transition-colors md:justify-center xl:justify-start ${
              enPerfil ? "bg-white/10" : "hover:bg-white/10"
            }`}
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white/15 text-white">
              <UserRound className="h-4 w-4" aria-hidden />
            </span>
            <span className={`min-w-0 ${TEXTO}`}>
              <span className="block truncate text-sm font-semibold text-white">{nombre}</span>
              <span className="block text-xs text-white/70">{ROL_LABEL[usuario.rol]}</span>
            </span>
          </Link>
          <button
            onClick={logout}
            title="Cerrar la sesión en este equipo"
            className="flex min-h-11 w-full items-center gap-3 rounded-control px-3 text-base font-medium text-white/75 transition-colors hover:bg-white/10 hover:text-white md:justify-center xl:justify-start"
          >
            <LogOut className="h-5 w-5 shrink-0" aria-hidden />
            <span className={TEXTO}>Cerrar sesión</span>
          </button>
        </div>
      </aside>
    </>
  );
}
