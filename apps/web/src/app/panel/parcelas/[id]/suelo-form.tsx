"use client";

import { useState, type FormEvent } from "react";
import { Advertencia } from "@/components/estado/advertencia";
import { AccionesModal, Modal } from "@/components/modal";
import { api, apiErrorMessage } from "@/lib/api";

const hoy = (): string => new Date().toLocaleDateString("en-CA");

/** Cada valor del analisis: como se llama, en que unidad va y un ejemplo. */
const CAMPOS = [
  { id: "ph", nombre: "Acidez (pH)", unidad: "de 0 a 14", ejemplo: "5.8", paso: "0.1", max: 14 },
  { id: "nitrogeno", nombre: "Nitrógeno", unidad: "ppm", ejemplo: "18", paso: "0.1", max: undefined },
  { id: "fosforo", nombre: "Fósforo", unidad: "ppm", ejemplo: "12", paso: "0.1", max: undefined },
  { id: "potasio", nombre: "Potasio", unidad: "ppm", ejemplo: "140", paso: "0.1", max: undefined },
  { id: "materiaOrganica", nombre: "Materia orgánica", unidad: "%", ejemplo: "2.4", paso: "0.1", max: 100 },
  { id: "humedad", nombre: "Humedad del suelo", unidad: "%", ejemplo: "22", paso: "0.1", max: 100 },
] as const;

type CampoId = (typeof CAMPOS)[number]["id"];

/** Carga de un analisis de suelo: se copian los valores del informe del laboratorio. */
export function SueloForm({
  parcelaId,
  onClose,
  onSaved,
}: {
  parcelaId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [fecha, setFecha] = useState(hoy());
  const [valores, setValores] = useState<Record<CampoId, string>>({
    ph: "",
    nitrogeno: "",
    fosforo: "",
    potasio: "",
    materiaOrganica: "",
    humedad: "",
  });
  const [notas, setNotas] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const hayAlgunValor = Object.values(valores).some((valor) => valor.trim() !== "");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      const numeros = Object.fromEntries(
        CAMPOS.filter((campo) => valores[campo.id].trim() !== "").map((campo) => [
          campo.id,
          Number(valores[campo.id]),
        ]),
      );
      await api.post("/monitoreo/suelo", {
        parcelaId,
        fecha,
        ...numeros,
        notas: notas.trim() || undefined,
      });
      onSaved();
    } catch (err) {
      setError(apiErrorMessage(err, "No se pudieron guardar los datos"));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal titulo="Agregar datos de suelo" onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4">
        <p className="text-base text-stone-700">
          Anota solo lo que tengas: los valores del informe del laboratorio, la humedad medida en
          el campo, o ambos. Lo demás déjalo vacío.
        </p>

        <div>
          <label htmlFor="suelo-fecha" className="block text-base font-bold text-stone-800">
            Fecha de la medición
          </label>
          <input
            id="suelo-fecha"
            required
            type="date"
            max={hoy()}
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="mt-1 min-h-11 w-full rounded-md border-2 border-stone-400 px-3 text-base"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {CAMPOS.map((campo) => (
            <div key={campo.id}>
              <label htmlFor={`suelo-${campo.id}`} className="block text-base font-bold text-stone-800">
                {campo.nombre} <span className="font-normal text-stone-600">({campo.unidad})</span>
              </label>
              <input
                id={`suelo-${campo.id}`}
                type="number"
                inputMode="decimal"
                min="0"
                max={campo.max}
                step={campo.paso}
                placeholder={`Ej. ${campo.ejemplo}`}
                value={valores[campo.id]}
                onChange={(e) => setValores((previo) => ({ ...previo, [campo.id]: e.target.value }))}
                className="mt-1 min-h-11 w-full rounded-md border-2 border-stone-400 px-3 text-base"
              />
            </div>
          ))}
        </div>

        <div>
          <label htmlFor="suelo-notas" className="block text-base font-bold text-stone-800">
            Nota <span className="font-normal text-stone-600">(opcional)</span>
          </label>
          <input
            id="suelo-notas"
            maxLength={500}
            placeholder="Ej. Muestra tomada a 20 cm"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            className="mt-1 min-h-11 w-full rounded-md border-2 border-stone-400 px-3 text-base"
          />
        </div>

        {error && (
          <Advertencia tipo="CRITICO" titulo="No se pudo guardar" rol="alert">
            {error}
          </Advertencia>
        )}

        <AccionesModal
          onCancelar={onClose}
          etiqueta="Guardar datos"
          guardando={guardando}
          deshabilitado={!hayAlgunValor}
        />
      </form>
    </Modal>
  );
}
