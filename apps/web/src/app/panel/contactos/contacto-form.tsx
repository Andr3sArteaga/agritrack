"use client";

import { useState, type FormEvent } from "react";
import { api, apiErrorMessage } from "@/lib/api";
import { AccionesModal, Modal } from "@/components/modal";
import { CLASE_CAMPO, Field } from "@/components/ui/field";
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
        <Field etiqueta="Tipo">
          {(props) => (
            <select
              {...props}
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoContacto)}
              className={CLASE_CAMPO}
            >
              {TIPOS.map((t) => (
                <option key={t} value={t}>
                  {TIPO_CONTACTO_LABEL[t]}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field etiqueta="Nombre">
          {(props) => (
            <input
              {...props}
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className={CLASE_CAMPO}
            />
          )}
        </Field>
        <Field etiqueta="Empresa" opcional>
          {(props) => (
            <input {...props} value={empresa} onChange={(e) => setEmpresa(e.target.value)} className={CLASE_CAMPO} />
          )}
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field etiqueta="Teléfono" opcional>
            {(props) => (
              <input
                {...props}
                type="tel"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                className={CLASE_CAMPO}
              />
            )}
          </Field>
          <Field etiqueta="Email" opcional>
            {(props) => (
              <input
                {...props}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={CLASE_CAMPO}
              />
            )}
          </Field>
        </div>
        <Field etiqueta="Notas" opcional>
          {(props) => (
            <textarea
              {...props}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={2}
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
