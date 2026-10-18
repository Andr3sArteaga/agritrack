"use client";

import { useState, type FormEvent } from "react";
import { api, apiErrorMessage } from "@/lib/api";
import { Modal } from "@/components/modal";
import type { Presupuesto } from "@/lib/types";

export function PresupuestoForm({
  campanaId,
  presupuesto,
  onClose,
  onSaved,
}: {
  campanaId: string;
  presupuesto: Presupuesto | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [montoTotal, setMontoTotal] = useState(
    presupuesto?.montoTotal.toString() ?? "",
  );
  const [notas, setNotas] = useState(presupuesto?.notas ?? "");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      await api.put(`/presupuestos/campana/${campanaId}`, {
        montoTotal: Number(montoTotal),
        notas: notas.trim() || undefined,
      });
      onSaved();
    } catch (err) {
      setError(apiErrorMessage(err, "No se pudo guardar el presupuesto"));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal
      titulo={presupuesto ? "Cambiar presupuesto" : "Definir presupuesto"}
      onClose={onClose}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-stone-700">
            Presupuesto total (Bs)
          </label>
          <input
            required
            type="number"
            step="0.01"
            min="0.01"
            value={montoTotal}
            onChange={(e) => setMontoTotal(e.target.value)}
            className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700">Notas (opcional)</label>
          <textarea
            rows={2}
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
          />
        </div>

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
