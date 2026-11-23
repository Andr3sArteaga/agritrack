"use client";

import { useState, type FormEvent } from "react";
import { api, apiErrorMessage } from "@/lib/api";
import { AccionesModal, Modal } from "@/components/modal";
import { CLASE_CAMPO, Field } from "@/components/ui/field";
import {
  CATEGORIA_GASTO_LABEL,
  ESTADO_GASTO_LABEL,
  type CategoriaGasto,
  type EstadoGasto,
  type Gasto,
} from "@/lib/types";

const CATEGORIAS = Object.keys(CATEGORIA_GASTO_LABEL) as CategoriaGasto[];
const ESTADOS = Object.keys(ESTADO_GASTO_LABEL) as EstadoGasto[];

export function GastoForm({
  campanaId,
  gasto,
  onClose,
  onSaved,
}: {
  campanaId: string;
  gasto: Gasto | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  // Un gasto de insumo del catalogo no admite editar monto ni categoria.
  const montoBloqueado = gasto?.insumoId != null;

  const [categoria, setCategoria] = useState<CategoriaGasto>(
    gasto?.categoria ?? "OTROS",
  );
  const [descripcion, setDescripcion] = useState(gasto?.descripcion ?? "");
  const [fecha, setFecha] = useState(gasto?.fecha.slice(0, 10) ?? "");
  const [monto, setMonto] = useState(gasto?.monto.toString() ?? "");
  const [estado, setEstado] = useState<EstadoGasto>(gasto?.estado ?? "PAGADO");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      if (gasto) {
        await api.patch(`/gastos/${gasto.id}`, {
          descripcion,
          fecha,
          estado,
          ...(montoBloqueado ? {} : { categoria, monto: Number(monto) }),
        });
      } else {
        await api.post("/gastos", {
          campanaId,
          categoria,
          descripcion,
          fecha,
          estado,
          monto: Number(monto),
        });
      }
      onSaved();
    } catch (err) {
      setError(apiErrorMessage(err, "No se pudo guardar el gasto"));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal titulo={gasto ? "Editar gasto" : "Registrar gasto"} onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4">
        {montoBloqueado && (
          <p className="rounded-control bg-atencion-fondo px-3 py-2 text-sm text-atencion-texto">
            Este gasto proviene de un insumo del catálogo: el monto y la
            categoría no se editan. Anúlalo y registra uno nuevo si es necesario.
          </p>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field etiqueta="Categoría">
            {(props) => (
              <select
                {...props}
                value={categoria}
                disabled={montoBloqueado}
                onChange={(e) => setCategoria(e.target.value as CategoriaGasto)}
                className={`${CLASE_CAMPO} disabled:bg-fondo`}
              >
                {CATEGORIAS.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORIA_GASTO_LABEL[c]}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field etiqueta="Estado">
            {(props) => (
              <select
                {...props}
                value={estado}
                onChange={(e) => setEstado(e.target.value as EstadoGasto)}
                className={CLASE_CAMPO}
              >
                {ESTADOS.map((s) => (
                  <option key={s} value={s}>
                    {ESTADO_GASTO_LABEL[s]}
                  </option>
                ))}
              </select>
            )}
          </Field>
        </div>
        <Field etiqueta="Descripción">
          {(props) => (
            <input
              {...props}
              required
              minLength={3}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className={CLASE_CAMPO}
            />
          )}
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field etiqueta="Fecha">
            {(props) => (
              <input
                {...props}
                required
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className={CLASE_CAMPO}
              />
            )}
          </Field>
          <Field etiqueta="Monto (Bs)">
            {(props) => (
              <input
                {...props}
                required
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0.01"
                value={monto}
                disabled={montoBloqueado}
                onChange={(e) => setMonto(e.target.value)}
                className={`${CLASE_CAMPO} disabled:bg-fondo`}
              />
            )}
          </Field>
        </div>

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
