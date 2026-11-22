"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Advertencia } from "@/components/estado/advertencia";
import { PanelImpactoPrediccion } from "@/components/estado/panel-impacto-prediccion";
import { AccionesModal, Modal } from "@/components/modal";
import { api, apiErrorMessage } from "@/lib/api";
import { aFechaInput } from "@/lib/format";
import {
  type RegistroCosechaCampana,
  type ResultadoImpacto,
} from "@/lib/prediccion";
import type { Campana } from "@/lib/types";

const hoy = (): string => new Date().toLocaleDateString("en-CA");

export function RegistroCosechaForm({
  parcelaId,
  campana,
  hectareasParcela,
  registro,
  modo,
  onClose,
  onSaved,
}: {
  parcelaId: string;
  campana: Campana;
  hectareasParcela: number;
  registro: RegistroCosechaCampana | null;
  modo: "siembra" | "cosecha";
  onClose: () => void;
  onSaved: () => void;
}) {
  const [haSembradas, setHaSembradas] = useState(
    registro?.haSembradas?.toString() ?? hectareasParcela.toString(),
  );
  const [fechaSiembra, setFechaSiembra] = useState(
    registro?.fechaSiembra ? aFechaInput(registro.fechaSiembra) : "",
  );
  const [variedad, setVariedad] = useState(registro?.variedad ?? "");

  const [fechaCosecha, setFechaCosecha] = useState(
    registro?.fechaCosecha ? aFechaInput(registro.fechaCosecha) : hoy(),
  );
  const [haCosechadas, setHaCosechadas] = useState(
    registro?.haCosechadas?.toString() ?? registro?.haSembradas?.toString() ?? "",
  );
  const [toneladas, setToneladas] = useState(registro?.toneladas?.toString() ?? "");

  const [impacto, setImpacto] = useState<ResultadoImpacto | null>(null);
  const [cargandoImpacto, setCargandoImpacto] = useState(false);
  const [errorImpacto, setErrorImpacto] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (modo !== "siembra") return;
    let cancelado = false;
    const temporizador = setTimeout(() => {
      setCargandoImpacto(true);
      setErrorImpacto(null);
      const haNumero = haSembradas.trim() === "" ? 0 : Number(haSembradas);
      api
        .get<ResultadoImpacto>("/prediccion/impacto", {
          params: {
            lote: parcelaId,
            campana: campana.id,
            tipoActividad: "SIEMBRA",
            haSembradas: Number.isFinite(haNumero) ? haNumero : 0,
            fechaSiembra: fechaSiembra || "",
            variedad: variedad.trim(),
          },
        })
        .then((res) => {
          if (!cancelado) setImpacto(res.data);
        })
        .catch((err) => {
          if (!cancelado) {
            setErrorImpacto(
              apiErrorMessage(err, "No se pudo evaluar el impacto en el modelo."),
            );
          }
        })
        .finally(() => {
          if (!cancelado) setCargandoImpacto(false);
        });
    }, 200);

    return () => {
      cancelado = true;
      clearTimeout(temporizador);
    };
  }, [modo, parcelaId, campana.id, haSembradas, fechaSiembra, variedad]);

  const haNum = Number(haCosechadas);
  const tonNum = Number(toneladas);
  const rendimientoPreview =
    modo === "cosecha" &&
    haCosechadas.trim() !== "" &&
    toneladas.trim() !== "" &&
    Number.isFinite(haNum) &&
    Number.isFinite(tonNum) &&
    haNum > 0 &&
    tonNum >= 0
      ? Math.round((tonNum / haNum) * 100) / 100
      : null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      if (modo === "siembra") {
        await api.put(`/campanas/${campana.id}/registro-cosecha`, {
          haSembradas: Number(haSembradas),
          variedad: variedad.trim() || null,
          fechaSiembra: fechaSiembra || null,
        });
      } else {
        await api.put(`/campanas/${campana.id}/registro-cosecha`, {
          fechaCosecha,
          haCosechadas: Number(haCosechadas),
          toneladas: Number(toneladas),
        });
      }
      onSaved();
    } catch (err) {
      setError(apiErrorMessage(err, "No se pudieron guardar los datos de la campaña"));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal
      titulo={
        modo === "siembra"
          ? `Variables de siembra · ${campana.temporada}`
          : `Registrar cosecha · ${campana.temporada}`
      }
      onClose={onClose}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {modo === "siembra" ? (
          <>
            <fieldset className="space-y-3 rounded-control border-2 border-borde bg-fondo-suave/70 p-3.5">
              <legend className="px-1 text-sm font-bold text-tinta">
                Variables agronómicas de siembra (afectan al modelo IA)
              </legend>
              <p className="text-xs text-tinta-suave">
                Edita cualquiera de estas 3 variables para ver al instante si la producción estimada
                aumenta, se mantiene o disminuye.
              </p>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="reg-ha-sembradas"
                    className="block text-sm font-bold text-tinta"
                  >
                    1. Superficie sembrada <span className="font-normal text-tinta-suave">(ha)</span>
                  </label>
                  <input
                    id="reg-ha-sembradas"
                    required
                    type="number"
                    inputMode="decimal"
                    min="0.01"
                    step="0.01"
                    value={haSembradas}
                    onChange={(e) => setHaSembradas(e.target.value)}
                    className="mt-1 min-h-11 w-full rounded-control border-2 border-tinta-suave bg-white px-3 text-base"
                  />
                </div>
                <div>
                  <label
                    htmlFor="reg-fecha-siembra"
                    className="block text-sm font-bold text-tinta"
                  >
                    2. Fecha de siembra
                  </label>
                  <input
                    id="reg-fecha-siembra"
                    type="date"
                    max={hoy()}
                    value={fechaSiembra}
                    onChange={(e) => setFechaSiembra(e.target.value)}
                    className="mt-1 min-h-11 w-full rounded-control border-2 border-tinta-suave bg-white px-3 text-base"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="reg-variedad" className="block text-sm font-bold text-tinta">
                  3. Variedad o semilla
                </label>
                <input
                  id="reg-variedad"
                  maxLength={100}
                  placeholder="Ej. 6410 o MUNASQA"
                  value={variedad}
                  onChange={(e) => setVariedad(e.target.value)}
                  className="mt-1 min-h-11 w-full rounded-control border-2 border-tinta-suave bg-white px-3 text-base"
                />
                {impacto && impacto.variedadesConocidas.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="self-center text-xs text-tinta-suave">
                      Variedades del modelo:
                    </span>
                    {impacto.variedadesConocidas.map((opcion) => {
                      const activa = variedad.trim().toLowerCase() === opcion.toLowerCase();
                      return (
                        <button
                          key={opcion}
                          type="button"
                          onClick={() => setVariedad(opcion)}
                          className={`min-h-11 rounded-control border-2 px-3 text-xs font-bold ${
                            activa
                              ? "border-marca bg-marca-suave text-marca-hover"
                              : "border-borde bg-white text-tinta hover:bg-fondo-suave"
                          }`}
                        >
                          {opcion}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </fieldset>

            <PanelImpactoPrediccion
              impacto={impacto}
              cargando={cargandoImpacto}
              error={errorImpacto}
            />
          </>
        ) : (
          <>
            {!registro && (
              <Advertencia tipo="ATENCION" titulo="Falta registrar la siembra">
                Primero guarda los datos de siembra en &quot;Variables de siembra / Impacto&quot;
                para poder cargar la cosecha.
              </Advertencia>
            )}

            {registro && (
              <p className="rounded-control border border-borde bg-fondo-suave px-3 py-2 text-sm text-tinta-suave">
                Siembra registrada: <strong>{registro.haSembradas} ha</strong>
                {registro.variedad ? ` · Variedad ${registro.variedad}` : ""}
              </p>
            )}

            <div>
              <label
                htmlFor="reg-fecha-cosecha"
                className="block text-sm font-bold text-tinta"
              >
                Fecha de cosecha
              </label>
              <input
                id="reg-fecha-cosecha"
                required
                type="date"
                max={hoy()}
                value={fechaCosecha}
                onChange={(e) => setFechaCosecha(e.target.value)}
                className="mt-1 min-h-11 w-full rounded-control border-2 border-tinta-suave px-3 text-base"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="reg-ha-cosechadas"
                  className="block text-sm font-bold text-tinta"
                >
                  Hectáreas cosechadas
                </label>
                <input
                  id="reg-ha-cosechadas"
                  required
                  type="number"
                  inputMode="decimal"
                  min="0.01"
                  max={registro?.haSembradas}
                  step="0.01"
                  value={haCosechadas}
                  onChange={(e) => setHaCosechadas(e.target.value)}
                  className="mt-1 min-h-11 w-full rounded-control border-2 border-tinta-suave px-3 text-base"
                />
              </div>
              <div>
                <label htmlFor="reg-toneladas" className="block text-sm font-bold text-tinta">
                  Toneladas totales
                </label>
                <input
                  id="reg-toneladas"
                  required
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={toneladas}
                  onChange={(e) => setToneladas(e.target.value)}
                  className="mt-1 min-h-11 w-full rounded-control border-2 border-tinta-suave px-3 text-base"
                />
              </div>
            </div>

            {rendimientoPreview !== null && (
              <div className="rounded-control border-2 border-marca bg-marca-suave p-3 text-tinta">
                <p className="text-xs font-bold uppercase tracking-wide">
                  Rendimiento real calculado
                </p>
                <p className="text-xl font-bold">{rendimientoPreview.toFixed(2)} t/ha</p>
              </div>
            )}
          </>
        )}

        {error && (
          <Advertencia tipo="CRITICO" titulo="No se pudo guardar" rol="alert">
            {error}
          </Advertencia>
        )}

        <AccionesModal
          onCancelar={onClose}
          etiqueta={modo === "siembra" ? "Guardar siembra" : "Guardar cosecha"}
          guardando={guardando}
          deshabilitado={modo === "cosecha" && !registro}
        />
      </form>
    </Modal>
  );
}
