"use client";

import { useCallback, useEffect, useState } from "react";
import { api, apiErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { TIPO_CONTACTO_LABEL, type Contacto, type TipoContacto } from "@/lib/types";
import { ContactoForm } from "./contacto-form";

const TIPOS: TipoContacto[] = [
  "COMPRADOR",
  "TRANSPORTISTA",
  "MAQUINARIA",
  "INSUMOS",
  "SERVICIOS",
  "OTRO",
];

export default function ContactosPage() {
  const { usuario } = useAuth();
  const puedeEditar = usuario?.rol === "JEFE" || usuario?.rol === "CONTABILIDAD";

  const [contactos, setContactos] = useState<Contacto[]>([]);
  const [search, setSearch] = useState("");
  const [tipo, setTipo] = useState<TipoContacto | "">("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editando, setEditando] = useState<Contacto | null>(null);

  const cargar = useCallback(() => {
    setCargando(true);
    api
      .get<Contacto[]>("/contactos", {
        params: { search: search || undefined, tipo: tipo || undefined },
      })
      .then((res) => setContactos(res.data))
      .catch((err) => setError(apiErrorMessage(err, "No se pudieron cargar los contactos")))
      .finally(() => setCargando(false));
  }, [search, tipo]);

  useEffect(() => {
    const timeout = setTimeout(cargar, 300);
    return () => clearTimeout(timeout);
  }, [cargar]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Contactos</h1>
          <p className="mt-1 text-stone-600">Compradores, transportistas y proveedores</p>
        </div>
        {puedeEditar && (
          <button
            onClick={() => setMostrarForm(true)}
            className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            Nuevo contacto
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, empresa, teléfono o email..."
          className="flex-1 min-w-[240px] rounded-md border border-stone-300 px-3 py-2 text-sm"
        />
        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value as TipoContacto | "")}
          className="rounded-md border border-stone-300 px-3 py-2 text-sm"
        >
          <option value="">Todos los tipos</option>
          {TIPOS.map((t) => (
            <option key={t} value={t}>
              {TIPO_CONTACTO_LABEL[t]}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {cargando ? (
        <p className="text-stone-500">Cargando...</p>
      ) : contactos.length === 0 ? (
        <p className="text-sm text-stone-500">No se encontraron contactos.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-left text-stone-500">
              <tr>
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Empresa</th>
                <th className="px-4 py-3 font-medium">Contacto</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {contactos.map((contacto) => (
                <tr key={contacto.id}>
                  <td className="px-4 py-3 font-medium text-stone-900">{contacto.nombre}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-700">
                      {TIPO_CONTACTO_LABEL[contacto.tipo]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-stone-600">{contacto.empresa ?? "—"}</td>
                  <td className="px-4 py-3 text-stone-600">
                    {[contacto.telefono, contacto.email].filter(Boolean).join(" · ") || "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {puedeEditar && (
                      <button
                        onClick={() => setEditando(contacto)}
                        className="text-sm text-stone-600 hover:text-stone-900"
                      >
                        Editar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {mostrarForm && (
        <ContactoForm
          contacto={null}
          onClose={() => setMostrarForm(false)}
          onSaved={() => {
            setMostrarForm(false);
            cargar();
          }}
        />
      )}
      {editando && (
        <ContactoForm
          contacto={editando}
          onClose={() => setEditando(null)}
          onSaved={() => {
            setEditando(null);
            cargar();
          }}
        />
      )}
    </div>
  );
}
