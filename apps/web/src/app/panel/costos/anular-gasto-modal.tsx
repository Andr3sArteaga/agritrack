"use client";

import { useState, type FormEvent } from "react";
import { api, apiErrorMessage } from "@/lib/api";
import { AccionesModal, Modal } from "@/components/modal";
import { CLASE_CAMPO, Field } from "@/components/ui/field";
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
        <p className="text-sm text-tinta-suave">
          Vas a anular <span className="font-medium">{gasto.descripcion}</span> (
          {formatearBs(gasto.monto)}). No se borra: queda marcado como anulado
          con su motivo y deja de contar en los totales.
        </p>
        <Field etiqueta="Motivo de la anulación" ayuda="Al menos 5 letras.">
          {(props) => (
            <textarea
              {...props}
              required
              minLength={5}
              rows={3}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className={`${CLASE_CAMPO} py-2`}
            />
          )}
        </Field>

        {error && (
          <p role="alert" className="text-sm font-medium text-critico-borde">
            {error}
          </p>
        )}

        <AccionesModal onCancelar={onClose} etiqueta="Anular gasto" etiquetaGuardando="Anulando..." guardando={guardando} deshabilitado={motivo.trim().length < 5} peligro />
      </form>
    </Modal>
  );
}
