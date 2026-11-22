"use client";

import { MoreVertical, type LucideIcon } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

export interface AccionMenu {
  etiqueta: string;
  icono?: LucideIcon;
  onClick: () => void;
  peligro?: boolean;
}

/**
 * Menu "⋯" de una fila. Se abre con clic o teclado y se cierra con Esc o al
 * hacer clic afuera. Solo debe ofrecer acciones que ya existen.
 */
export function ActionMenu({ acciones, etiqueta = "Más acciones" }: { acciones: AccionMenu[]; etiqueta?: string }) {
  const [abierto, setAbierto] = useState(false);
  const contenedor = useRef<HTMLDivElement>(null);
  const boton = useRef<HTMLButtonElement>(null);
  const idMenu = useId();

  useEffect(() => {
    if (!abierto) return;
    const cerrarAfuera = (e: MouseEvent) => {
      if (!contenedor.current?.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener("mousedown", cerrarAfuera);
    return () => document.removeEventListener("mousedown", cerrarAfuera);
  }, [abierto]);

  return (
    <div
      ref={contenedor}
      className="relative"
      // Esc cierra solo el menu (no el panel o el modal que lo contiene) y devuelve el foco al boton.
      // React escucha en el document, igual que esos paneles: hace falta stopImmediatePropagation.
      onKeyDown={(e) => {
        if (e.key === "Escape" && abierto) {
          e.stopPropagation();
          e.nativeEvent.stopImmediatePropagation();
          setAbierto(false);
          boton.current?.focus();
        }
      }}
    >
      <button
        ref={boton}
        type="button"
        aria-label={etiqueta}
        title={etiqueta}
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-controls={idMenu}
        onClick={() => setAbierto((v) => !v)}
        className="grid size-11 place-items-center rounded-control text-tinta-suave hover:bg-fondo"
      >
        <MoreVertical className="h-5 w-5" aria-hidden />
      </button>
      {abierto && (
        <ul
          id={idMenu}
          role="menu"
          className="absolute right-0 z-20 mt-1 min-w-52 rounded-control border border-borde bg-superficie py-1 shadow-flotante"
        >
          {acciones.map(({ etiqueta: texto, icono: Icono, onClick, peligro }) => (
            <li key={texto} role="none">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setAbierto(false);
                  onClick();
                }}
                className={`flex min-h-11 w-full items-center gap-2.5 px-3.5 text-left text-base hover:bg-fondo ${
                  peligro ? "text-critico-borde" : "text-tinta"
                }`}
              >
                {Icono && <Icono className="h-4 w-4 shrink-0" aria-hidden />}
                {texto}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
