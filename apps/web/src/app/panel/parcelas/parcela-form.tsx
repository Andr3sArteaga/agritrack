"use client";

import { useState, type FormEvent } from "react";
import { api, apiErrorMessage } from "@/lib/api";
import { Modal } from "@/components/modal";
import type { Parcela } from "@/lib/types";

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
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    const payload = {
      nombre,
      hectareas: Number(hectareas),
      ubicacionTexto,
      disponibleParaPreventa,
    };
    try {
      if (parcela) {
        await api.patch(`/parcelas/${parcela.id}`, payload);
      } else {
        await api.post("/parcelas", payload);
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
          <label className="block text-sm font-medium text-stone-700">Hectáreas</label>
          <input
            required
            type="number"
            step="0.01"
            min="0.01"
            value={hectareas}
            onChange={(e) => setHectareas(e.target.value)}
            className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
          />
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
