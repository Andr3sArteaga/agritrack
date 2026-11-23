"use client";

import { useState, type FormEvent } from "react";
import { Advertencia } from "@/components/estado/advertencia";
import { AccionesModal, Modal } from "@/components/modal";
import { api, apiErrorMessage } from "@/lib/api";

const hoy = (): string => new Date().toLocaleDateString("en-CA");

/** Cada valor del analisis: como se llama, en que unidad va y un ejemplo. */
const CAMPOS = [
  { id: "ph", nombre: "Acidez (pH)", unidad: "de 0 a 14", ejemplo: "5.8", paso: "0.1", max: 14, grupo: "condicion" },
  { id: "nitrogeno", nombre: "Nitrógeno (N)", unidad: "ppm", ejemplo: "18", paso: "0.1", max: undefined, grupo: "nutriente" },
  { id: "fosforo", nombre: "Fósforo (P)", unidad: "ppm", ejemplo: "12", paso: "0.1", max: undefined, grupo: "nutriente" },
  { id: "potasio", nombre: "Potasio (K)", unidad: "ppm", ejemplo: "140", paso: "0.1", max: undefined, grupo: "nutriente" },
  { id: "materiaOrganica", nombre: "Materia orgánica", unidad: "%", ejemplo: "2.4", paso: "0.1", max: 100, grupo: "condicion" },
  { id: "humedad", nombre: "Humedad del suelo", unidad: "%", ejemplo: "22", paso: "0.1", max: 100, grupo: "condicion" },
] as const;

type CampoId = (typeof CAMPOS)[number]["id"];
type CampoSueloDef = (typeof CAMPOS)[number];
const CAMPOS_CONDICION = CAMPOS.filter((c) => c.grupo === "condicion");
const CAMPOS_NUTRIENTES = CAMPOS.filter((c) => c.grupo === "nutriente");

function GrupoCamposSuelo({
  titulo,
  campos,
  valores,
  onChange,
}: {
  titulo: string;
  campos: readonly CampoSueloDef[];
  valores: Record<CampoId, string>;
  onChange: (id: CampoId, valor: string) => void;
}) {
  return (
    <fieldset className="space-y-3 rounded-control border border-borde bg-fondo-suave/70 p-3.5">
      <legend className="px-1 text-sm font-bold text-tinta">{titulo}</legend>
      <div className="grid gap-3 sm:grid-cols-3">
        {campos.map((campo) => (
          <div key={campo.id}>
            <label htmlFor={`suelo-${campo.id}`} className="block text-sm font-bold text-tinta">
              {campo.nombre} <span className="font-normal text-tinta-suave">({campo.unidad})</span>
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
              onChange={(e) => onChange(campo.id, e.target.value)}
              className="mt-1 min-h-11 w-full rounded-control border-2 border-tinta-suave bg-white px-3 text-base"
            />
          </div>
        ))}
      </div>
    </fieldset>
  );
}

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
        <p className="text-base text-tinta-suave">
          Anota solo lo que tengas: los valores del informe del laboratorio, la humedad medida en
          el campo, o ambos. Lo demás déjalo vacío.
        </p>

        <div>
          <label htmlFor="suelo-fecha" className="block text-base font-bold text-tinta">
            Fecha de la medición
          </label>
          <input
            id="suelo-fecha"
            required
            type="date"
            max={hoy()}
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="mt-1 min-h-11 w-full rounded-control border-2 border-tinta-suave px-3 text-base"
          />
        </div>

        <GrupoCamposSuelo
          titulo="1. Condición física y acidez del suelo"
          campos={CAMPOS_CONDICION}
          valores={valores}
          onChange={(id, valor) => setValores((previo) => ({ ...previo, [id]: valor }))}
        />

        <GrupoCamposSuelo
          titulo="2. Macronutrientes del suelo (N-P-K)"
          campos={CAMPOS_NUTRIENTES}
          valores={valores}
          onChange={(id, valor) => setValores((previo) => ({ ...previo, [id]: valor }))}
        />

        <div>
          <label htmlFor="suelo-notas" className="block text-base font-bold text-tinta">
            Nota <span className="font-normal text-tinta-suave">(opcional)</span>
          </label>
          <input
            id="suelo-notas"
            maxLength={500}
            placeholder="Ej. Muestra tomada a 20 cm"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            className="mt-1 min-h-11 w-full rounded-control border-2 border-tinta-suave px-3 text-base"
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
