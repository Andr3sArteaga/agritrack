"use client";

import { useState, type FormEvent } from "react";
import { api, apiErrorMessage } from "@/lib/api";
import { Modal } from "@/components/modal";
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
          <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Este gasto proviene de un insumo del catálogo: el monto y la
            categoría no se editan. Anúlalo y registra uno nuevo si es necesario.
          </p>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-stone-700">Categoría</label>
            <select
              value={categoria}
              disabled={montoBloqueado}
              onChange={(e) => setCategoria(e.target.value as CategoriaGasto)}
              className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm disabled:bg-stone-100"
            >
              {CATEGORIAS.map((c) => (
                <option key={c} value={c}>
                  {CATEGORIA_GASTO_LABEL[c]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700">Estado</label>
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value as EstadoGasto)}
              className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
            >
              {ESTADOS.map((s) => (
                <option key={s} value={s}>
                  {ESTADO_GASTO_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700">Descripción</label>
          <input
            required
            minLength={3}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-stone-700">Fecha</label>
            <input
              required
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700">Monto (Bs)</label>
            <input
              required
              type="number"
              step="0.01"
              min="0.01"
              value={monto}
              disabled={montoBloqueado}
              onChange={(e) => setMonto(e.target.value)}
              className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm disabled:bg-stone-100"
            />
          </div>
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
