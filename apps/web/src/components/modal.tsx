"use client";

import { Ban, Check, X } from "lucide-react";
import { useEffect, useId } from "react";

/**
 * Modal base: altura maxima de 90% de la pantalla, encabezado fijo y cuerpo con
 * scroll interno. Los botones de accion van en <AccionesModal> al final del
 * formulario para quedar fijos abajo mientras el cuerpo se desplaza.
 */
export function Modal({
  titulo,
  onClose,
  children,
}: {
  titulo: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const tituloId = useId();

  useEffect(() => {
    const alPresionar = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", alPresionar);
    return () => window.removeEventListener("keydown", alPresionar);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-3 sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        className="flex max-h-[90dvh] w-full max-w-lg flex-col rounded-lg bg-white shadow-lg"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-stone-200 px-4 py-3 sm:px-6 sm:py-4">
          <h2 id={tituloId} className="text-lg font-semibold text-stone-900">
            {titulo}
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
            aria-label="Cerrar"
            title="Cerrar"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-4 sm:px-6">
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * Pie fijo del modal: queda pegado abajo del cuerpo con scroll. Se coloca como
 * ultimo hijo del <form>; el boton principal envia el formulario.
 */
export function AccionesModal({
  onCancelar,
  etiqueta,
  etiquetaGuardando = "Guardando...",
  guardando,
  deshabilitado = false,
  peligro = false,
}: {
  onCancelar: () => void;
  etiqueta: string;
  etiquetaGuardando?: string;
  guardando: boolean;
  deshabilitado?: boolean;
  peligro?: boolean;
}) {
  return (
    <div className="sticky bottom-0 -mx-4 mt-4 flex justify-end gap-2 border-t border-stone-200 bg-white px-4 py-3 sm:-mx-6 sm:px-6">
      <button
        type="button"
        onClick={onCancelar}
        className="rounded-md border border-stone-300 px-4 py-2 text-sm text-stone-700 hover:bg-stone-100"
      >
        Cancelar
      </button>
      <button
        type="submit"
        disabled={guardando || deshabilitado}
        className={`inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 ${
          peligro ? "bg-red-600 hover:bg-red-700" : "bg-emerald-700 hover:bg-emerald-800"
        }`}
      >
        {peligro ? (
          <Ban className="h-4 w-4" aria-hidden />
        ) : (
          <Check className="h-4 w-4" aria-hidden />
        )}
        {guardando ? etiquetaGuardando : etiqueta}
      </button>
    </div>
  );
}
