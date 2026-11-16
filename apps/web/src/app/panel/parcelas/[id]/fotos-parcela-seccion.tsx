"use client";

import { Camera, Eye, EyeOff, ImagePlus, Loader2, Maximize2, Trash2 } from "lucide-react";
import { useEffect, useId, useState, type ChangeEvent } from "react";
import { VisorImagen } from "@/components/visor-imagen";
import { api, apiErrorMessage } from "@/lib/api";
import { formatearFecha } from "@/lib/format";
import type { FotoParcela } from "@/lib/types";

const MAX_FOTOS_PARCELA = 8;
const MAX_LADO_PX = 1280;

async function comprimirImagenADataUrl(archivo: File): Promise<string> {
  const bitmapUrl = URL.createObjectURL(archivo);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const elemento = new Image();
      elemento.onload = () => resolve(elemento);
      elemento.onerror = () => reject(new Error(`No se pudo leer "${archivo.name}"`));
      elemento.src = bitmapUrl;
    });

    const escala = Math.min(1, MAX_LADO_PX / Math.max(img.width, img.height));
    const ancho = Math.max(1, Math.round(img.width * escala));
    const alto = Math.max(1, Math.round(img.height * escala));

    const canvas = document.createElement("canvas");
    canvas.width = ancho;
    canvas.height = alto;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("El navegador no permite comprimir la imagen");
    ctx.drawImage(img, 0, 0, ancho, alto);

    const webp = canvas.toDataURL("image/webp", 0.78);
    if (webp.startsWith("data:image/webp")) {
      return webp;
    }
    return canvas.toDataURL("image/jpeg", 0.78);
  } finally {
    URL.revokeObjectURL(bitmapUrl);
  }
}

export function FotosParcelaSeccion({
  parcelaId,
  disponibleParaPreventa,
  puedeEditar,
}: {
  parcelaId: string;
  disponibleParaPreventa: boolean;
  puedeEditar: boolean;
}) {
  const inputId = useId();
  const [fotos, setFotos] = useState<FotoParcela[]>([]);
  const [cargando, setCargando] = useState(true);
  const [subiendo, setSubiendo] = useState(false);
  const [ocupandoId, setOcupandoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const [descripcionNueva, setDescripcionNueva] = useState("");
  const [visibleAlSubir, setVisibleAlSubir] = useState(true);
  const [indiceAmpliado, setIndiceAmpliado] = useState<number | null>(null);

  useEffect(() => {
    let cancelado = false;
    api
      .get<FotoParcela[]>(`/parcelas/${parcelaId}/fotos`)
      .then(({ data }) => {
        if (!cancelado) {
          setFotos(data);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelado) {
          setError(apiErrorMessage(err, "No se pudieron cargar las fotos de la parcela"));
        }
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });

    return () => {
      cancelado = true;
    };
  }, [parcelaId]);

  const totalPublicadas = fotos.filter((f) => f.visibleEnPreventa).length;
  const cupoRestante = Math.max(0, MAX_FOTOS_PARCELA - fotos.length);

  async function manejarArchivos(e: ChangeEvent<HTMLInputElement>) {
    const lista = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (lista.length === 0) return;

    setError(null);
    setAviso(null);

    if (cupoRestante <= 0) {
      setError(`Ya alcanzaste el máximo de ${MAX_FOTOS_PARCELA} fotos por parcela.`);
      return;
    }

    const seleccion = lista.slice(0, cupoRestante);
    const omitidas = lista.length - seleccion.length;

    setSubiendo(true);
    let subidas = 0;
    const nuevas: FotoParcela[] = [];

    try {
      for (const archivo of seleccion) {
        if (!archivo.type.startsWith("image/")) {
          setError(`"${archivo.name}" no es una imagen válida.`);
          continue;
        }
        const imagenData = await comprimirImagenADataUrl(archivo);
        const { data } = await api.post<FotoParcela>(`/parcelas/${parcelaId}/fotos`, {
          imagenData,
          descripcion: descripcionNueva.trim() || undefined,
          visibleEnPreventa: visibleAlSubir,
        });
        nuevas.push(data);
        subidas += 1;
      }

      if (nuevas.length > 0) {
        setFotos((prev) => [...nuevas.reverse(), ...prev]);
        setDescripcionNueva("");
      }

      if (omitidas > 0) {
        setAviso(
          `Se ${subidas === 1 ? "subió 1 foto" : `subieron ${subidas} fotos`}. ${omitidas} ${
            omitidas === 1 ? "archivo omitido" : "archivos omitidos"
          } por el límite de ${MAX_FOTOS_PARCELA} fotos por parcela.`,
        );
      }
    } catch (err) {
      setError(apiErrorMessage(err, "No se pudo subir una o más fotos"));
    } finally {
      setSubiendo(false);
    }
  }

  async function alternarPreventa(foto: FotoParcela) {
    setError(null);
    setAviso(null);
    setOcupandoId(foto.id);
    try {
      const { data } = await api.patch<FotoParcela>(
        `/parcelas/${parcelaId}/fotos/${foto.id}`,
        { visibleEnPreventa: !foto.visibleEnPreventa },
      );
      setFotos((prev) => prev.map((f) => (f.id === foto.id ? data : f)));
    } catch (err) {
      setError(apiErrorMessage(err, "No se pudo actualizar la visibilidad en preventa"));
    } finally {
      setOcupandoId(null);
    }
  }

  async function eliminar(foto: FotoParcela) {
    setError(null);
    setAviso(null);
    setOcupandoId(foto.id);
    try {
      await api.delete(`/parcelas/${parcelaId}/fotos/${foto.id}`);
      setFotos((prev) => prev.filter((f) => f.id !== foto.id));
      setIndiceAmpliado(null);
    } catch (err) {
      setError(apiErrorMessage(err, "No se pudo eliminar la foto"));
    } finally {
      setOcupandoId(null);
    }
  }

  return (
    <section
      aria-labelledby="heading-fotos-parcela"
      className="rounded-xl border border-[#E4EAE6] bg-white p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2
            id="heading-fotos-parcela"
            className="flex items-center gap-2 text-lg font-bold text-[#17211D]"
          >
            <Camera className="h-5 w-5 text-[#006B4F]" aria-hidden />
            Fotos de la parcela
          </h2>
          <p className="mt-0.5 text-sm text-[#68736D]">
            {fotos.length} / {MAX_FOTOS_PARCELA} fotos ·{" "}
            <strong className="text-[#17211D]">{totalPublicadas}</strong>{" "}
            {totalPublicadas === 1 ? "publicada en preventa" : "publicadas en preventa"}
          </p>
        </div>

        <span
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${
            disponibleParaPreventa
              ? "border-[#006B4F]/30 bg-[#E8F5EF] text-[#006B4F]"
              : "border-[#E4EAE6] bg-[#F8FAF9] text-[#68736D]"
          }`}
        >
          {disponibleParaPreventa
            ? "Preventa activa: fotos visibles al público"
            : "Preventa desactivada (activa en Editar parcela para publicar)"}
        </span>
      </div>

      {puedeEditar && (
        <div className="mt-4 rounded-xl border border-[#E4EAE6] bg-[#F8FAF9] p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1">
              <label
                htmlFor={`${inputId}-desc`}
                className="block text-xs font-semibold text-[#17211D]"
              >
                Descripción para las nuevas fotos (opcional)
              </label>
              <input
                id={`${inputId}-desc`}
                type="text"
                maxLength={160}
                value={descripcionNueva}
                onChange={(e) => setDescripcionNueva(e.target.value)}
                placeholder="Ej. Vista general del lote en floración"
                className="min-h-11 w-full rounded-lg border border-[#E4EAE6] bg-white px-3 text-sm text-[#17211D]"
              />
            </div>

            <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-[#E4EAE6] bg-white px-3 text-xs font-medium text-[#17211D]">
              <input
                type="checkbox"
                checked={visibleAlSubir}
                onChange={(e) => setVisibleAlSubir(e.target.checked)}
                className="h-4 w-4 accent-[#006B4F]"
              />
              Visible en preventa al subir
            </label>

            <div>
              <input
                id={inputId}
                type="file"
                accept="image/*"
                multiple
                disabled={subiendo || cupoRestante === 0}
                onChange={manejarArchivos}
                className="sr-only"
              />
              <label
                htmlFor={inputId}
                className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold text-white transition-colors ${
                  subiendo || cupoRestante === 0
                    ? "cursor-not-allowed bg-stone-400"
                    : "cursor-pointer bg-[#006B4F] hover:bg-[#00553E]"
                }`}
              >
                {subiendo ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <ImagePlus className="h-4 w-4" aria-hidden />
                )}
                {subiendo
                  ? "Comprimiendo y subiendo..."
                  : cupoRestante === 0
                    ? "Límite alcanzado"
                    : "Subir fotos"}
              </label>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-[#68736D]">
            Puedes seleccionar una o varias fotos a la vez. Se comprimen automáticamente antes de
            guardarse.
          </p>
        </div>
      )}

      {aviso && (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
          {aviso}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700"
        >
          {error}
        </p>
      )}

      {cargando ? (
        <p className="mt-4 text-sm text-[#68736D]">Cargando fotos...</p>
      ) : fotos.length === 0 ? (
        <div className="mt-4 rounded-xl border-2 border-dashed border-stone-300 bg-[#F8FAF9] p-6 text-center">
          <p className="text-sm font-semibold text-[#17211D]">
            Todavía no hay fotos cargadas para esta parcela.
          </p>
          <p className="mt-1 text-xs text-[#68736D]">
            Sube fotos de campo y elige cuáles pueden mostrarse en el catálogo público de preventa.
          </p>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {fotos.map((foto, index) => {
            const ocupada = ocupandoId === foto.id;
            return (
              <article
                key={foto.id}
                className="flex flex-col overflow-hidden rounded-xl border border-[#E4EAE6] bg-white shadow-xs"
              >
                <button
                  type="button"
                  onClick={() => setIndiceAmpliado(index)}
                  className="group relative h-44 w-full overflow-hidden bg-stone-100 text-left"
                  title="Expandir imagen"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={foto.imagenData}
                    alt={foto.descripcion || `Foto ${index + 1} de la parcela`}
                    className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                  />
                  <span
                    className={`absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold shadow-xs ${
                      foto.visibleEnPreventa
                        ? "bg-[#006B4F] text-white"
                        : "bg-stone-900/75 text-white"
                    }`}
                  >
                    {foto.visibleEnPreventa ? (
                      <Eye className="h-3 w-3" aria-hidden />
                    ) : (
                      <EyeOff className="h-3 w-3" aria-hidden />
                    )}
                    {foto.visibleEnPreventa ? "Publicada en preventa" : "Solo uso interno"}
                  </span>
                  <span
                    className="absolute right-2.5 top-2.5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-xs transition-colors group-hover:bg-black/80"
                    aria-hidden
                  >
                    <Maximize2 className="h-4 w-4" />
                  </span>
                </button>

                <div className="flex flex-1 flex-col justify-between gap-3 p-3.5">
                  <div>
                    <p className="text-sm font-medium text-[#17211D]">
                      {foto.descripcion || "Sin descripción"}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[#68736D]">
                      Subida el {formatearFecha(foto.createdAt)}
                    </p>
                  </div>

                  {puedeEditar && (
                    <div className="flex flex-wrap items-center gap-2 border-t border-[#E4EAE6] pt-2.5">
                      <button
                        type="button"
                        disabled={ocupada}
                        onClick={() => void alternarPreventa(foto)}
                        className={`inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
                          foto.visibleEnPreventa
                            ? "border-[#006B4F]/40 bg-[#E8F5EF] text-[#006B4F] hover:bg-[#006B4F] hover:text-white"
                            : "border-[#E4EAE6] bg-[#F8FAF9] text-[#17211D] hover:border-[#006B4F]/50"
                        }`}
                      >
                        {foto.visibleEnPreventa ? (
                          <>
                            <EyeOff className="h-3.5 w-3.5 shrink-0" aria-hidden />
                            Ocultar de preventa
                          </>
                        ) : (
                          <>
                            <Eye className="h-3.5 w-3.5 shrink-0" aria-hidden />
                            Publicar en preventa
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        disabled={ocupada}
                        onClick={() => void eliminar(foto)}
                        aria-label="Eliminar foto"
                        title="Eliminar foto"
                        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-red-200 bg-white px-2.5 text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </button>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {indiceAmpliado !== null && (
        <VisorImagen
          imagenes={fotos.map((f, idx) => ({
            src: f.imagenData,
            alt: f.descripcion || `Foto ${idx + 1} de la parcela`,
            descripcion: f.descripcion || "Foto de la parcela",
            subtitulo: `${
              f.visibleEnPreventa ? "Visible en catálogo público" : "Solo uso interno"
            } · Subida el ${formatearFecha(f.createdAt)}`,
          }))}
          indiceInicial={indiceAmpliado}
          onCerrar={() => setIndiceAmpliado(null)}
        />
      )}
    </section>
  );
}
