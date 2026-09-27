"use client";

import { useState, type FormEvent } from "react";
import { api, apiErrorMessage } from "@/lib/api";
import { Modal } from "@/components/modal";
import { TIPO_CONTACTO_LABEL, type Contacto, type TipoContacto } from "@/lib/types";

const TIPOS: TipoContacto[] = [
  "COMPRADOR",
  "TRANSPORTISTA",
  "MAQUINARIA",
  "INSUMOS",
  "SERVICIOS",
  "OTRO",
];

export function ContactoForm({
  contacto,
  onClose,
  onSaved,
}: {
  contacto: Contacto | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [tipo, setTipo] = useState<TipoContacto>(contacto?.tipo ?? "COMPRADOR");
  const [nombre, setNombre] = useState(contacto?.nombre ?? "");
  const [empresa, setEmpresa] = useState(contacto?.empresa ?? "");
  const [telefono, setTelefono] = useState(contacto?.telefono ?? "");
  const [email, setEmail] = useState(contacto?.email ?? "");
  const [notas, setNotas] = useState(contacto?.notas ?? "");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    const payload = {
      tipo,
      nombre,
      empresa: empresa || undefined,
      telefono: telefono || undefined,
      email: email || undefined,
      notas: notas || undefined,
    };
    try {
      if (contacto) {
        await api.patch(`/contactos/${contacto.id}`, payload);
      } else {
        await api.post("/contactos", payload);
      }
      onSaved();
    } catch (err) {
      setError(apiErrorMessage(err, "No se pudo guardar el contacto"));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal titulo={contacto ? "Editar contacto" : "Nuevo contacto"} onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-stone-700">Tipo</label>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoContacto)}
            className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
          >
            {TIPOS.map((t) => (
              <option key={t} value={t}>
                {TIPO_CONTACTO_LABEL[t]}
              </option>
            ))}
          </select>
        </div>
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
          <label className="block text-sm font-medium text-stone-700">Empresa</label>
          <input
            value={empresa}
            onChange={(e) => setEmpresa(e.target.value)}
            className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-stone-700">Teléfono</label>
            <input
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700">Notas</label>
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            rows={2}
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
