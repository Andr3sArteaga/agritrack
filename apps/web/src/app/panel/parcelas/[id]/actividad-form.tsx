"use client";

import { useState, type FormEvent } from "react";
import { api, apiErrorMessage } from "@/lib/api";
import { Modal } from "@/components/modal";
import { TIPO_ACTIVIDAD_LABEL, type Actividad, type TipoActividad } from "@/lib/types";

const TIPOS: TipoActividad[] = [
  "SIEMBRA",
  "FUMIGACION",
  "FERTILIZACION",
  "MEDICION_HUMEDAD_SUELO",
  "MEDICION_HUMEDAD_GRANO",
  "COSECHA",
];

export function ActividadForm({
  campanaId,
  corrigiendo,
  onClose,
  onSaved,
}: {
  campanaId: string;
  corrigiendo: Actividad | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [tipo, setTipo] = useState<TipoActividad>(corrigiendo?.tipo ?? "SIEMBRA");
  const [fecha, setFecha] = useState(corrigiendo?.fecha.slice(0, 10) ?? "");
  const [descripcion, setDescripcion] = useState(corrigiendo?.descripcion ?? "");
  const [insumo, setInsumo] = useState(corrigiendo?.insumo ?? "");
  const [cantidad, setCantidad] = useState(corrigiendo?.cantidad?.toString() ?? "");
  const [unidad, setUnidad] = useState(corrigiendo?.unidad ?? "");
  const [tercerizado, setTercerizado] = useState(corrigiendo?.tercerizado ?? false);
  const [maquinaria, setMaquinaria] = useState(corrigiendo?.maquinariaUtilizada ?? "");
  const [rendimientoTnHa, setRendimientoTnHa] = useState(
    corrigiendo?.rendimientoTnHa?.toString() ?? "",
  );
  const [motivoCorreccion, setMotivoCorreccion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      await api.post("/actividades", {
        campanaId,
        tipo,
        fecha,
        descripcion,
        insumo: insumo || undefined,
        cantidad: cantidad ? Number(cantidad) : undefined,
        unidad: unidad || undefined,
        tercerizado,
        maquinariaUtilizada: maquinaria || undefined,
        rendimientoTnHa:
          tipo === "COSECHA" && rendimientoTnHa ? Number(rendimientoTnHa) : undefined,
        correccionDeId: corrigiendo?.id,
        motivoCorreccion: corrigiendo ? motivoCorreccion : undefined,
      });
      onSaved();
    } catch (err) {
      setError(apiErrorMessage(err, "No se pudo registrar la actividad"));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal
      titulo={corrigiendo ? "Corregir actividad" : "Nueva actividad"}
      onClose={onClose}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {corrigiendo && (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Esta actividad no se edita ni se borra: se creará un nuevo registro
            que corrige a la actividad #{corrigiendo.secuencia}.
          </p>
        )}
        <div>
          <label className="block text-sm font-medium text-stone-700">Tipo</label>
          <select
            required
            disabled={!!corrigiendo}
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoActividad)}
            className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm disabled:bg-stone-100"
          >
            {TIPOS.map((t) => (
              <option key={t} value={t}>
                {TIPO_ACTIVIDAD_LABEL[t]}
              </option>
            ))}
          </select>
        </div>
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
          <label className="block text-sm font-medium text-stone-700">Descripción</label>
          <textarea
            required
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
          />
        </div>

        {tipo === "COSECHA" && (
          <div>
            <label className="block text-sm font-medium text-stone-700">
              Rendimiento (t/ha)
            </label>
            <input
              required
              type="number"
              step="0.01"
              min="0.01"
              value={rendimientoTnHa}
              onChange={(e) => setRendimientoTnHa(e.target.value)}
              className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-stone-700">
              Insumo (opcional)
            </label>
            <input
              value={insumo}
              onChange={(e) => setInsumo(e.target.value)}
              className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700">
              Unidad (opcional)
            </label>
            <input
              value={unidad}
              onChange={(e) => setUnidad(e.target.value)}
              placeholder="kg/ha, L/ha..."
              className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700">
            Cantidad (opcional)
          </label>
          <input
            type="number"
            step="0.01"
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
            className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700">
            Maquinaria utilizada (opcional)
          </label>
          <input
            value={maquinaria}
            onChange={(e) => setMaquinaria(e.target.value)}
            className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-stone-700">
          <input
            type="checkbox"
            checked={tercerizado}
            onChange={(e) => setTercerizado(e.target.checked)}
          />
          Trabajo tercerizado
        </label>

        {corrigiendo && (
          <div>
            <label className="block text-sm font-medium text-stone-700">
              Motivo de la corrección
            </label>
            <textarea
              required
              value={motivoCorreccion}
              onChange={(e) => setMotivoCorreccion(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
            />
          </div>
        )}

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
            {guardando ? "Guardando..." : "Registrar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
