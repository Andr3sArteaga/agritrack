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
import { EncabezadoPagina } from "@/components/encabezado-pagina";
import { Advertencia } from "@/components/estado/advertencia";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CLASE_CAMPO } from "@/components/ui/field";
import { Tag } from "@/components/ui/tag";
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

const SinDato = () => <span className="text-sm text-sindatos-texto">Sin datos</span>;

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
          <Button
            onClick={() => setMostrarForm(true)}
            title="Agregar un contacto nuevo a la agenda"
            icono={Plus}
          >
            Nuevo contacto
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-0 flex-1 basis-60">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-tinta-suave"
            aria-hidden
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, empresa, teléfono o email..."
            aria-label="Buscar contactos"
            className={`${CLASE_CAMPO} pl-9`}
          />
        </div>
        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value as TipoContacto | "")}
          aria-label="Filtrar por tipo de contacto"
          className={`${CLASE_CAMPO} sm:w-auto`}
        >
          <option value="">Todos los tipos</option>
          {TIPOS.map((t) => (
            <option key={t} value={t}>
              {TIPO_CONTACTO_LABEL[t]}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <Advertencia tipo="CRITICO" titulo="No se pudieron cargar los contactos" rol="alert">
          {error}
        </Advertencia>
      )}
      {cargando ? (
        <p className="text-tinta-suave">Cargando...</p>
      ) : contactos.length === 0 ? (
        <Advertencia tipo="SIN_DATOS" titulo="Sin datos">
          No se encontraron contactos.
        </Advertencia>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-fondo-suave text-left text-tinta-suave">
              <tr>
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Empresa</th>
                <th className="px-4 py-3 font-medium">Contacto</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-fondo">
              {contactos.map((contacto) => (
                <tr key={contacto.id}>
                  <td className="px-4 py-3 font-medium text-tinta">{contacto.nombre}</td>
                  <td className="px-4 py-3">
                    <Tag icono={ICONO_TIPO[contacto.tipo]}>{TIPO_CONTACTO_LABEL[contacto.tipo]}</Tag>
                  </td>
                  <td className="px-4 py-3 text-tinta-suave">{contacto.empresa ?? <SinDato />}</td>
                  <td className="px-4 py-3 text-tinta-suave">
                    {[contacto.telefono, contacto.email].filter(Boolean).join(" · ") || <SinDato />}
                  </td>
                  <td className="px-4 py-1 text-right">
                    {puedeEditar && (
                      <button
                        onClick={() => setEditando(contacto)}
                        title="Editar los datos del contacto"
                        className="inline-flex min-h-11 items-center gap-1 text-sm text-tinta-suave hover:text-tinta"
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
        </Card>
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
