"use client";

import { useState, type FormEvent } from "react";
import { api, apiErrorMessage } from "@/lib/api";
import { AccionesModal, Modal } from "@/components/modal";
import { CLASE_CAMPO, Field } from "@/components/ui/field";
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
        <Field etiqueta="Presupuesto total (Bs)">
          {(props) => (
            <input
              {...props}
              required
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0.01"
              value={montoTotal}
              onChange={(e) => setMontoTotal(e.target.value)}
              className={CLASE_CAMPO}
            />
          )}
        </Field>
        <Field etiqueta="Notas" opcional>
          {(props) => (
            <textarea
              {...props}
              rows={2}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              className={`${CLASE_CAMPO} py-2`}
            />
          )}
        </Field>

        {error && (
          <p role="alert" className="text-sm font-medium text-critico-borde">
            {error}
          </p>
        )}

        <AccionesModal onCancelar={onClose} etiqueta="Guardar" guardando={guardando} />
      </form>
    </Modal>
  );
}
