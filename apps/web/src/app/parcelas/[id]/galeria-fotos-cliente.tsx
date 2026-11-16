"use client";

import { Maximize2 } from "lucide-react";
import { useState } from "react";
import { VisorImagen } from "@/components/visor-imagen";
import type { FotoPublicaParcela } from "@/lib/types";

export function GaleriaFotosCliente({
  fotos,
  nombreParcela,
}: {
  fotos: FotoPublicaParcela[];
  nombreParcela: string;
}) {
  const [indiceAmpliado, setIndiceAmpliado] = useState<number | null>(null);

  return (
    <>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {fotos.map((foto, idx) => (
          <figure
            key={foto.id}
            className="group overflow-hidden rounded-2xl border border-[#E4EAE6] bg-[#f8faf9]"
          >
            <button
              type="button"
              onClick={() => setIndiceAmpliado(idx)}
              aria-label={`Expandir ${foto.descripcion || `foto ${idx + 1} de ${nombreParcela}`}`}
              title="Expandir imagen"
              className="relative block w-full overflow-hidden text-left"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={foto.imagenData}
                alt={foto.descripcion || `${nombreParcela} · foto ${idx + 1}`}
                className="h-52 w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              />
              <span
                className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-xs transition-colors group-hover:bg-black/80"
                aria-hidden
              >
                <Maximize2 className="h-4 w-4" />
              </span>
            </button>
            {foto.descripcion && (
              <figcaption className="border-t border-[#E4EAE6] px-3.5 py-2.5 text-xs font-medium text-[#68736D]">
                {foto.descripcion}
              </figcaption>
            )}
          </figure>
        ))}
      </div>

      {indiceAmpliado !== null && (
        <VisorImagen
          imagenes={fotos.map((foto, idx) => ({
            src: foto.imagenData,
            alt: foto.descripcion || `${nombreParcela} · foto ${idx + 1}`,
            descripcion: foto.descripcion || nombreParcela,
            subtitulo: nombreParcela,
          }))}
          indiceInicial={indiceAmpliado}
          onCerrar={() => setIndiceAmpliado(null)}
        />
      )}
    </>
  );
}
