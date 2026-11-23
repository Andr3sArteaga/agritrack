"use client";

import { useState } from "react";

export interface PasoCompra {
  numero: string;
  titulo: string;
  descripcion: string;
}

/** Angulo (grados, 0 = derecha, sentido horario) de cada numero sobre el borde del circulo. */
const ANGULOS = [215, 325, 90];

/**
 * Carrusel circular: empieza con la foto del equipo; al tocar un numero, el circulo se
 * agranda y muestra ese paso. Tocar el mismo numero (o "Ver al equipo") vuelve a la foto.
 */
export function CarruselPasos({
  pasos,
  foto,
  alt,
}: {
  pasos: PasoCompra[];
  foto: string;
  alt: string;
}) {
  const [activo, setActivo] = useState<number | null>(null);
  const paso = activo === null ? null : pasos[activo];

  return (
    <div className="relative flex flex-col items-center">
      <h3 className="text-center font-titulo text-3xl text-tinta sm:text-4xl">Cómo comprar en 3 pasos</h3>
      <p className="mt-1 text-center text-sm text-tinta-suave">Toca un número para ver cada paso.</p>

      <div
        className={`relative mt-12 transition-[width,height] duration-500 ease-out motion-reduce:transition-none ${
          paso ? "size-[300px] sm:size-[460px]" : "size-[260px] sm:size-[380px]"
        }`}
      >
        <div
          aria-live="polite"
          className="size-full overflow-hidden rounded-full border-8 border-superficie bg-superficie shadow-flotante ring-1 ring-borde"
        >
          {paso ? (
            <div
              key={activo}
              className="grid size-full animate-[aparecer_400ms_ease-out] place-items-center px-10 text-center motion-reduce:animate-none sm:px-16"
            >
              <div>
                <span className="font-titulo text-7xl leading-none text-marca sm:text-8xl">{paso.numero}</span>
                <p className="mt-3 text-xl font-semibold text-tinta sm:text-2xl">{paso.titulo}</p>
                <p className="mt-2 text-sm leading-relaxed text-tinta-suave sm:text-base">{paso.descripcion}</p>
              </div>
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={foto}
              alt={alt}
              className="size-full animate-[aparecer_400ms_ease-out] object-cover motion-reduce:animate-none"
            />
          )}
        </div>

        {pasos.map((p, i) => {
          const radianes = (ANGULOS[i] * Math.PI) / 180;
          const seleccionado = activo === i;
          return (
            <button
              key={p.numero}
              type="button"
              aria-pressed={seleccionado}
              aria-label={`Paso ${i + 1}: ${p.titulo}`}
              onClick={() => setActivo(seleccionado ? null : i)}
              style={{ left: `${50 + 50 * Math.cos(radianes)}%`, top: `${50 + 50 * Math.sin(radianes)}%` }}
              className={`absolute grid size-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full font-titulo text-2xl shadow-flotante transition-colors sm:size-16 sm:text-3xl ${
                seleccionado ? "bg-tinta text-white" : "bg-superficie text-tinta hover:bg-lima"
              }`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      {paso && (
        <button
          type="button"
          onClick={() => setActivo(null)}
          className="mt-10 inline-flex min-h-11 items-center rounded-full border border-borde bg-superficie px-5 text-sm font-semibold text-tinta hover:border-tinta"
        >
          Ver al equipo
        </button>
      )}
    </div>
  );
}
