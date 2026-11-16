"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useState } from "react";

export interface ImagenVisorItem {
  src: string;
  alt: string;
  descripcion?: string | null;
  subtitulo?: string | null;
}

/**
 * Visor modal de imágenes estilo WhatsApp Web: fondo oscuro translúcido,
 * imagen centrada en alta resolución, cierre con Escape o clic fuera y navegación.
 */
export function VisorImagen({
  imagenes,
  indiceInicial = 0,
  onCerrar,
}: {
  imagenes: ImagenVisorItem[];
  indiceInicial?: number;
  onCerrar: () => void;
}) {
  const [indice, setIndice] = useState(
    Math.min(Math.max(0, indiceInicial), Math.max(0, imagenes.length - 1)),
  );
  const total = imagenes.length;

  useEffect(() => {
    function manejarTecla(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onCerrar();
      } else if (e.key === "ArrowRight" && total > 1) {
        setIndice((prev) => (prev + 1) % total);
      } else if (e.key === "ArrowLeft" && total > 1) {
        setIndice((prev) => (prev - 1 + total) % total);
      }
    }
    window.addEventListener("keydown", manejarTecla);
    return () => window.removeEventListener("keydown", manejarTecla);
  }, [onCerrar, total]);

  const actual = imagenes[indice];
  if (!actual) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={actual.descripcion || actual.alt}
      onClick={onCerrar}
      className="fixed inset-0 z-[1100] flex flex-col items-center justify-center bg-black/75 p-4 backdrop-blur-[2px] animate-in fade-in duration-150"
    >
      {/* Barra superior */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="mb-3 flex w-full max-w-5xl items-center justify-between gap-4 text-white"
      >
        <div className="min-w-0">
          {actual.descripcion && (
            <p className="truncate text-sm font-semibold text-white">
              {actual.descripcion}
            </p>
          )}
          {(actual.subtitulo || total > 1) && (
            <p className="text-xs text-white/75">
              {total > 1 ? `${indice + 1} de ${total}` : ""}
              {total > 1 && actual.subtitulo ? " · " : ""}
              {actual.subtitulo ?? ""}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar vista ampliada"
          title="Cerrar (Esc)"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
      </div>

      {/* Contenedor central de la imagen */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-[82dvh] max-w-[92vw] items-center justify-center"
      >
        {total > 1 && (
          <button
            type="button"
            onClick={() => setIndice((prev) => (prev - 1 + total) % total)}
            aria-label="Imagen anterior"
            className="absolute -left-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white shadow-lg transition-colors hover:bg-black/85 sm:-left-12"
          >
            <ChevronLeft className="h-6 w-6" aria-hidden />
          </button>
        )}

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={actual.src}
          alt={actual.alt}
          className="max-h-[82dvh] max-w-[92vw] rounded-2xl object-contain shadow-2xl"
        />

        {total > 1 && (
          <button
            type="button"
            onClick={() => setIndice((prev) => (prev + 1) % total)}
            aria-label="Siguiente imagen"
            className="absolute -right-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white shadow-lg transition-colors hover:bg-black/85 sm:-right-12"
          >
            <ChevronRight className="h-6 w-6" aria-hidden />
          </button>
        )}
      </div>
    </div>
  );
}
