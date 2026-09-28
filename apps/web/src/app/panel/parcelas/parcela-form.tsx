"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, type FormEvent } from "react";
import { api, apiErrorMessage } from "@/lib/api";
import { Modal } from "@/components/modal";
import type { Parcela, PoligonoGeoJson } from "@/lib/types";

const PoligonoEditor = dynamic(
  () => import("@/components/map/poligono-editor").then((m) => m.PoligonoEditor),
  { ssr: false, loading: () => <p className="text-sm text-stone-500">Cargando mapa...</p> },
);

export function ParcelaForm({
  parcela,
  onClose,
  onSaved,
}: {
  parcela: Parcela | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [nombre, setNombre] = useState(parcela?.nombre ?? "");
  const [hectareas, setHectareas] = useState(parcela?.hectareas.toString() ?? "");
  const [ubicacionTexto, setUbicacionTexto] = useState(parcela?.ubicacionTexto ?? "");
  const [disponibleParaPreventa, setDisponibleParaPreventa] = useState(
    parcela?.disponibleParaPreventa ?? false,
  );
  const [poligono, setPoligono] = useState<PoligonoGeoJson | null>(
    parcela?.poligono ?? null,
  );
  const [poligonoTocado, setPoligonoTocado] = useState(false);
  const [otrasParcelas, setOtrasParcelas] = useState<Parcela[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    api
      .get<Parcela[]>("/parcelas")
      .then((res) =>
        setOtrasParcelas(res.data.filter((p) => p.id !== parcela?.id)),
      )
      .catch(() => setOtrasParcelas([]));
  }, [parcela?.id]);

  function onPoligonoChange(nuevo: PoligonoGeoJson | null, areaHa: number | null) {
    setPoligonoTocado(true);
    setPoligono(nuevo);
    if (areaHa !== null) {
      setHectareas(areaHa.toString());
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    const payload = {
      nombre,
      hectareas: Number(hectareas),
      ubicacionTexto,
      disponibleParaPreventa,
      ...(poligonoTocado ? { poligono } : {}),
    };
    try {
      const respuesta = parcela
        ? await api.patch<Parcela>(`/parcelas/${parcela.id}`, payload)
        : await api.post<Parcela>("/parcelas", payload);
      if (respuesta.data.advertencia) {
        alert(respuesta.data.advertencia);
      }
      onSaved();
    } catch (err) {
      setError(apiErrorMessage(err, "No se pudo guardar la parcela"));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal titulo={parcela ? "Editar parcela" : "Nueva parcela"} onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-stone-700">Nombre</label>
          <input
            required
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700">
            Contorno de la parcela
          </label>
          <p className="mt-1 text-xs text-stone-500">
            Dibuja el polígono haciendo clic en cada vértice. Puedes editar los
            vértices arrastrándolos o borrarlo y volver a dibujar.
          </p>
          <div className="mt-2">
            <PoligonoEditor
              valorInicial={poligono}
              otrasParcelas={otrasParcelas}
              onChange={onPoligonoChange}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700">
            Hectáreas {poligono && "(calculadas del polígono)"}
          </label>
          <input
            required
            type="number"
            step="0.01"
            min="0.01"
            readOnly={!!poligono}
            value={hectareas}
            onChange={(e) => setHectareas(e.target.value)}
            className={`mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm ${
              poligono ? "bg-stone-100 text-stone-600" : ""
            }`}
          />
          {poligono && (
            <p className="mt-1 text-xs font-medium text-emerald-700">
              Área calculada: {hectareas} ha
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700">Ubicación</label>
          <input
            required
            value={ubicacionTexto}
            onChange={(e) => setUbicacionTexto(e.target.value)}
            className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-stone-700">
          <input
            type="checkbox"
            checked={disponibleParaPreventa}
            onChange={(e) => setDisponibleParaPreventa(e.target.checked)}
          />
          Disponible para preventa
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-stone-300 px-4 py-2 text-sm text-stone-700 hover:bg-stone-100"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={guardando}
            className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
          >
            {guardando ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
