"use client";

import {
  Cloud,
  CloudDrizzle,
  CloudHail,
  CloudRainWind,
  Snowflake,
  Sun,
  Wind,
  type LucideIcon,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { Advertencia } from "@/components/estado/advertencia";
import { AccionesModal, Modal } from "@/components/modal";
import { api, apiErrorMessage } from "@/lib/api";
import { ES_MODO_DEV } from "@/lib/prediccion";
import { CONDICION_CLIMA_LABEL, type CondicionClima } from "@/lib/types";

const hoy = (): string => new Date().toLocaleDateString("en-CA");

const OPCIONES: { condicion: CondicionClima; icono: LucideIcon }[] = [
  { condicion: "SOLEADO", icono: Sun },
  { condicion: "NUBLADO", icono: Cloud },
  { condicion: "LLUVIA_LIGERA", icono: CloudDrizzle },
  { condicion: "LLUVIA_FUERTE", icono: CloudRainWind },
  { condicion: "HELADA", icono: Snowflake },
  { condicion: "GRANIZO", icono: CloudHail },
  { condicion: "VIENTO_FUERTE", icono: Wind },
];

const esLluvia = (condicion: CondicionClima | null): boolean =>
  condicion === "LLUVIA_LIGERA" || condicion === "LLUVIA_FUERTE";

/** Anotar el clima de un dia: se elige como estuvo el dia tocando una opcion. */
export function ClimaForm({
  parcelaId,
  onClose,
  onSaved,
}: {
  parcelaId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [fecha, setFecha] = useState(hoy());
  const [condicion, setCondicion] = useState<CondicionClima | null>(null);
  const [lluviaMm, setLluviaMm] = useState("");
  const [notas, setNotas] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!condicion) return;
    setError(null);
    setGuardando(true);
    try {
      await api.post("/monitoreo/clima", {
        parcelaId,
        fecha,
        condicion,
        lluviaMm: esLluvia(condicion) && lluviaMm.trim() !== "" ? Number(lluviaMm) : undefined,
        notas: notas.trim() || undefined,
      });
      onSaved();
    } catch (err) {
      setError(apiErrorMessage(err, "No se pudo anotar el clima"));
    } finally {
      setGuardando(false);
    }
  }

  function autocompletarDev() {
    setFecha(hoy());
    setCondicion("LLUVIA_LIGERA");
    setLluviaMm("22");
    setNotas("Lluvia moderada registrada en pluviómetro (Modo Dev)");
  }

  return (
    <Modal titulo="Anotar clima" onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4">
        {ES_MODO_DEV && (
          <div className="rounded-lg border-2 border-dashed border-amber-500 bg-amber-50 p-3">
            <button
              type="button"
              onClick={autocompletarDev}
              className="min-h-11 rounded-md border-2 border-amber-700 bg-white px-3 text-xs font-bold text-amber-950 hover:bg-amber-100"
            >
              Modo Dev · Autocompletar datos de prueba
            </button>
          </div>
        )}

        <div>
          <label htmlFor="clima-fecha" className="block text-base font-bold text-stone-800">
            Día
          </label>
          <input
            id="clima-fecha"
            required
            type="date"
            max={hoy()}
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="mt-1 min-h-11 w-full rounded-md border-2 border-stone-400 px-3 text-base"
          />
          <p className="mt-1 text-sm text-stone-600">
            Si ese día ya estaba anotado, se reemplaza.
          </p>
        </div>

        <fieldset>
          <legend className="text-base font-bold text-stone-800">¿Cómo estuvo el día?</legend>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {OPCIONES.map(({ condicion: opcion, icono: Icono }) => {
              const elegida = condicion === opcion;
              return (
                <label
                  key={opcion}
                  className={`flex min-h-[72px] cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 p-2 text-center text-base font-bold has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-blue-700 ${
                    elegida
                      ? "border-emerald-700 bg-emerald-50 text-emerald-900"
                      : "border-stone-300 bg-white text-stone-800 hover:bg-stone-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="condicion"
                    value={opcion}
                    checked={elegida}
                    onChange={() => setCondicion(opcion)}
                    className="sr-only"
                  />
                  <Icono className="h-6 w-6" aria-hidden />
                  {CONDICION_CLIMA_LABEL[opcion]}
                </label>
              );
            })}
          </div>
        </fieldset>

        {esLluvia(condicion) && (
          <div>
            <label htmlFor="clima-mm" className="block text-base font-bold text-stone-800">
              Milímetros de lluvia{" "}
              <span className="font-normal text-stone-600">(opcional, si hay pluviómetro)</span>
            </label>
            <input
              id="clima-mm"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.1"
              placeholder="Ej. 35"
              value={lluviaMm}
              onChange={(e) => setLluviaMm(e.target.value)}
              className="mt-1 min-h-11 w-full rounded-md border-2 border-stone-400 px-3 text-base"
            />
          </div>
        )}

        <div>
          <label htmlFor="clima-notas" className="block text-base font-bold text-stone-800">
            Nota <span className="font-normal text-stone-600">(opcional)</span>
          </label>
          <input
            id="clima-notas"
            maxLength={500}
            placeholder="Ej. Llovió toda la tarde"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            className="mt-1 min-h-11 w-full rounded-md border-2 border-stone-400 px-3 text-base"
          />
        </div>

        {error && (
          <Advertencia tipo="CRITICO" titulo="No se pudo anotar" rol="alert">
            {error}
          </Advertencia>
        )}

        <AccionesModal
          onCancelar={onClose}
          etiqueta="Guardar clima"
          guardando={guardando}
          deshabilitado={!condicion}
        />
      </form>
    </Modal>
  );
}
