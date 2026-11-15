"use client";

import { useState, type FormEvent } from "react";
import { api, apiErrorMessage } from "@/lib/api";
import { ES_MODO_DEV } from "@/lib/prediccion";
import { AccionesModal, Modal } from "@/components/modal";
import type { Cultivo } from "@/lib/types";

export function CampanaForm({
  parcelaId,
  cultivos,
  onClose,
  onSaved,
}: {
  parcelaId: string;
  cultivos: Cultivo[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [cultivoId, setCultivoId] = useState(cultivos[0]?.id ?? "");
  const [temporada, setTemporada] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      await api.post("/campanas", {
        parcelaId,
        cultivoId,
        temporada,
        fechaInicio,
        fechaFin: fechaFin || undefined,
      });
      onSaved();
    } catch (err) {
      setError(apiErrorMessage(err, "No se pudo crear la campaña"));
    } finally {
      setGuardando(false);
    }
  }

  function autocompletarDev() {
    const preferido =
      cultivos.find((c) => c.nombre.toLowerCase().includes("soya")) ?? cultivos[0];
    if (preferido) setCultivoId(preferido.id);
    setTemporada("Verano 2026");
    setFechaInicio("2026-06-01");
    setFechaFin("2026-12-01");
  }

  return (
    <Modal titulo="Nueva campaña" onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4">
        {ES_MODO_DEV && (
          <div className="rounded-lg border-2 border-dashed border-amber-500 bg-amber-50 p-3">
            <button
              type="button"
              onClick={autocompletarDev}
              className="min-h-11 rounded-md border-2 border-amber-700 bg-white px-3 text-xs font-bold text-amber-950 hover:bg-amber-100"
            >
              Modo Dev · Autocompletar datos de prueba
            </button>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-stone-700">Cultivo</label>
          <select
            required
            value={cultivoId}
            onChange={(e) => setCultivoId(e.target.value)}
            className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
          >
            {cultivos.map((cultivo) => (
              <option key={cultivo.id} value={cultivo.id}>
                {cultivo.nombre}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700">Temporada</label>
          <input
            required
            placeholder="Verano 2026"
            value={temporada}
            onChange={(e) => setTemporada(e.target.value)}
            className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-stone-700">Fecha inicio</label>
            <input
              required
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700">
              Fecha fin (opcional)
            </label>
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <AccionesModal onCancelar={onClose} etiqueta="Crear campaña" guardando={guardando} />
      </form>
    </Modal>
  );
}
