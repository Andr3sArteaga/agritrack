"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Contact,
  Ellipsis,
  Handshake,
  Package,
  Pencil,
  Plus,
  Search,
  Tractor,
  Truck,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/badge";
import { EncabezadoPagina } from "@/components/encabezado-pagina";
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

const ICONO_TIPO: Record<TipoContacto, LucideIcon> = {
  COMPRADOR: Handshake,
  TRANSPORTISTA: Truck,
  MAQUINARIA: Tractor,
  INSUMOS: Package,
  SERVICIOS: Wrench,
  OTRO: Ellipsis,
};

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <EncabezadoPagina
          icono={Contact}
          titulo="Contactos"
          descripcion="Compradores, transportistas y proveedores"
        />
        {puedeEditar && (
          <button
            onClick={() => setMostrarForm(true)}
            title="Agregar un contacto nuevo a la agenda"
            className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Nuevo contacto
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400"
            aria-hidden
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, empresa, teléfono o email..."
            aria-label="Buscar contactos"
            className="w-full rounded-md border border-stone-300 py-2 pl-9 pr-3 text-sm"
          />
        </div>
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
        <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
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
                    <Badge tono="gris" icono={ICONO_TIPO[contacto.tipo]}>
                      {TIPO_CONTACTO_LABEL[contacto.tipo]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-stone-600">{contacto.empresa ?? "—"}</td>
                  <td className="px-4 py-3 text-stone-600">
                    {[contacto.telefono, contacto.email].filter(Boolean).join(" · ") || "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {puedeEditar && (
                      <button
                        onClick={() => setEditando(contacto)}
                        title="Editar los datos del contacto"
                        className="inline-flex items-center gap-1 text-sm text-stone-600 hover:text-stone-900"
                      >
                        <Pencil className="h-4 w-4" aria-hidden />
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
