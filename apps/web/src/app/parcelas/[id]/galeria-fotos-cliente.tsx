"use client";

import { Maximize2 } from "lucide-react";
import { useState } from "react";
import { VisorImagen } from "@/components/visor-imagen";
import { urlApi } from "@/lib/api";
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
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {fotos.map((foto, idx) => (
          <figure
            key={foto.id}
            className="group overflow-hidden rounded-tarjeta bg-superficie p-2 shadow-tarjeta"
          >
            <button
              type="button"
              onClick={() => setIndiceAmpliado(idx)}
              aria-label={`Expandir ${foto.descripcion || `foto ${idx + 1} de ${nombreParcela}`}`}
              title="Expandir imagen"
              className="relative block w-full overflow-hidden rounded-[16px_44px] text-left"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={urlApi(foto.url)}
                alt={foto.descripcion || `${nombreParcela} · foto ${idx + 1}`}
                className="h-52 w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              />
              <span
                className="absolute right-3 top-3 inline-flex size-11 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-xs transition-colors group-hover:bg-black/80"
                aria-hidden
              >
                <Maximize2 className="h-4 w-4" />
              </span>
            </button>
            {foto.descripcion && (
              <figcaption className="px-2 pb-1 pt-2.5 text-sm text-tinta-suave">
                {foto.descripcion}
              </figcaption>
            )}
          </figure>
        ))}
      </div>

      {indiceAmpliado !== null && (
        <VisorImagen
          imagenes={fotos.map((foto, idx) => ({
            src: urlApi(foto.url),
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
