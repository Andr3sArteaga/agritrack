"use client";

import { useState, type FormEvent } from "react";
import { api, apiErrorMessage } from "@/lib/api";
import { Modal } from "@/components/modal";
import { formatearBs } from "@/lib/format";
import type { Gasto } from "@/lib/types";

export function AnularGastoModal({
  gasto,
  onClose,
  onSaved,
}: {
  gasto: Gasto;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      await api.post(`/gastos/${gasto.id}/anular`, { motivo: motivo.trim() });
      onSaved();
    } catch (err) {
      setError(apiErrorMessage(err, "No se pudo anular el gasto"));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal titulo="Anular gasto" onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4">
        <p className="text-sm text-stone-600">
          Vas a anular <span className="font-medium">{gasto.descripcion}</span> (
          {formatearBs(gasto.monto)}). No se borra: queda marcado como anulado
          con su motivo y deja de contar en los totales.
        </p>
        <div>
          <label className="block text-sm font-medium text-stone-700">
            Motivo de la anulación
          </label>
          <textarea
            required
            minLength={5}
            rows={3}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
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
            disabled={guardando || motivo.trim().length < 5}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
          >
            {guardando ? "Anulando..." : "Anular gasto"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
