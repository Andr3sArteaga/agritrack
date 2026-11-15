"use client";

import { useEffect, useState, type FormEvent } from "react";
import { PanelImpactoPrediccion } from "@/components/estado/panel-impacto-prediccion";
import { AccionesModal, Modal } from "@/components/modal";
import { api, apiErrorMessage } from "@/lib/api";
import { aFechaInput } from "@/lib/format";
import {
  ES_MODO_DEV,
  type EscenarioSiembraImpacto,
  type EscenariosImpacto,
  type RegistroCosechaCampana,
  type ResultadoImpacto,
} from "@/lib/prediccion";
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
  parcelaId,
  campanaId,
  hectareasParcela,
  registroCosecha = null,
  corrigiendo,
  onClose,
  onSaved,
}: {
  parcelaId: string;
  campanaId: string;
  hectareasParcela: number;
  registroCosecha?: RegistroCosechaCampana | null;
  corrigiendo: Actividad | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [tipo, setTipo] = useState<TipoActividad>(corrigiendo?.tipo ?? "SIEMBRA");
  const [fecha, setFecha] = useState(
    corrigiendo?.fecha.slice(0, 10) ??
      (registroCosecha?.fechaSiembra ? aFechaInput(registroCosecha.fechaSiembra) : ""),
  );
  const [descripcion, setDescripcion] = useState(corrigiendo?.descripcion ?? "");
  const [insumo, setInsumo] = useState(corrigiendo?.insumo ?? "");
  const [cantidad, setCantidad] = useState(corrigiendo?.cantidad?.toString() ?? "");
  const [unidad, setUnidad] = useState(corrigiendo?.unidad ?? "");
  const [tercerizado, setTercerizado] = useState(corrigiendo?.tercerizado ?? false);
  const [maquinaria, setMaquinaria] = useState(corrigiendo?.maquinariaUtilizada ?? "");
  const [rendimientoTnHa, setRendimientoTnHa] = useState(
    corrigiendo?.rendimientoTnHa?.toString() ?? "",
  );
  const [haSembradas, setHaSembradas] = useState(
    registroCosecha?.haSembradas?.toString() ?? hectareasParcela.toString(),
  );
  const [variedad, setVariedad] = useState(registroCosecha?.variedad ?? "");
  const [motivoCorreccion, setMotivoCorreccion] = useState("");

  const [impacto, setImpacto] = useState<ResultadoImpacto | null>(null);
  const [escenariosSiembra, setEscenariosSiembra] = useState<EscenariosImpacto | null>(null);
  const [cargandoImpacto, setCargandoImpacto] = useState(false);
  const [errorImpacto, setErrorImpacto] = useState<string | null>(null);

  const [actividadEnviada, setActividadEnviada] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    let cancelado = false;
    const temporizador = setTimeout(() => {
      setCargandoImpacto(true);
      setErrorImpacto(null);
      const haNum = haSembradas.trim() === "" ? 0 : Number(haSembradas);
      api
        .get<ResultadoImpacto>("/prediccion/impacto", {
          params:
            tipo === "SIEMBRA"
              ? {
                  lote: parcelaId,
                  campana: campanaId,
                  tipoActividad: tipo,
                  haSembradas: Number.isFinite(haNum) ? haNum : 0,
                  fechaSiembra: fecha || "",
                  variedad: variedad.trim(),
                }
              : {
                  lote: parcelaId,
                  campana: campanaId,
                  tipoActividad: tipo,
                },
        })
        .then((res) => {
          if (!cancelado) {
            setImpacto(res.data);
            if (
              res.data.escenarios &&
              (res.data.escenarios.positivo ||
                res.data.escenarios.neutro ||
                res.data.escenarios.negativo)
            ) {
              setEscenariosSiembra(res.data.escenarios);
            }
          }
        })
        .catch((err) => {
          if (!cancelado) {
            setErrorImpacto(
              apiErrorMessage(err, "No se pudo consultar el impacto en el modelo."),
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
  }, [parcelaId, campanaId, tipo, fecha, haSembradas, variedad]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const haNum = Number(haSembradas);
    if (
      tipo === "SIEMBRA" &&
      !corrigiendo &&
      haSembradas.trim() !== "" &&
      (!Number.isFinite(haNum) || haNum <= 0)
    ) {
      setError("Las hectáreas sembradas deben ser mayores a 0.");
      return;
    }

    setGuardando(true);
    try {
      if (!actividadEnviada) {
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
        setActividadEnviada(true);
      }

      if (tipo === "SIEMBRA" && !corrigiendo && Number.isFinite(haNum) && haNum > 0) {
        await api.put(`/campanas/${campanaId}/registro-cosecha`, {
          haSembradas: haNum,
          variedad: variedad.trim() || null,
          fechaSiembra: fecha || null,
        });
      }

      onSaved();
    } catch (err) {
      setError(apiErrorMessage(err, "No se pudo registrar la actividad"));
    } finally {
      setGuardando(false);
    }
  }

  function aplicarSiembraDev(
    escenario: EscenarioSiembraImpacto | null | undefined,
    modo: "positiva" | "neutra" | "negativa",
  ) {
    setTipo("SIEMBRA");
    if (escenario) {
      setHaSembradas(escenario.haSembradas.toString());
      setFecha(escenario.fechaSiembra || new Date().toLocaleDateString("en-CA"));
      setVariedad(escenario.variedad);
    } else if (modo === "neutra") {
      setHaSembradas(hectareasParcela.toString());
      setFecha("");
      setVariedad("");
    }
    setInsumo("Semilla certificada");
    setCantidad("60");
    setUnidad("kg/ha");
    setDescripcion(
      modo === "positiva"
        ? "Siembra en ventana óptima con semilla certificada"
        : modo === "negativa"
          ? "Siembra tardía fuera de ventana óptima"
          : "Siembra estándar con parámetros de referencia",
    );
  }

  function aplicarFumigacionDev() {
    setTipo("FUMIGACION");
    setFecha(new Date().toLocaleDateString("en-CA"));
    setDescripcion("Aplicación preventiva de control fitosanitario");
    setInsumo("Insecticida sistémico");
    setCantidad("1.5");
    setUnidad("L/ha");
  }

  return (
    <Modal
      titulo={corrigiendo ? "Corregir actividad" : "Nueva actividad"}
      onClose={onClose}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {ES_MODO_DEV && !corrigiendo && (
          <div className="rounded-lg border-2 border-dashed border-amber-500 bg-amber-50 p-3">
            <p className="text-xs font-bold text-amber-950">
              Modo Desarrollo · Relleno rápido de actividad e impacto
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!escenariosSiembra?.positivo}
                onClick={() => aplicarSiembraDev(escenariosSiembra?.positivo, "positiva")}
                className="min-h-11 rounded-md border-2 border-emerald-700 bg-white px-2.5 text-xs font-bold text-emerald-900 hover:bg-emerald-50 disabled:opacity-40"
              >
                ↑ Siembra Positiva
              </button>
              <button
                type="button"
                onClick={() => aplicarSiembraDev(escenariosSiembra?.neutro, "neutra")}
                className="min-h-11 rounded-md border-2 border-stone-500 bg-white px-2.5 text-xs font-bold text-stone-900 hover:bg-stone-100"
              >
                = Siembra Neutra
              </button>
              <button
                type="button"
                disabled={!escenariosSiembra?.negativo}
                onClick={() => aplicarSiembraDev(escenariosSiembra?.negativo, "negativa")}
                className="min-h-11 rounded-md border-2 border-red-700 bg-white px-2.5 text-xs font-bold text-red-900 hover:bg-red-50 disabled:opacity-40"
              >
                ↓ Siembra Negativa
              </button>
              <button
                type="button"
                onClick={aplicarFumigacionDev}
                className="min-h-11 rounded-md border-2 border-amber-700 bg-white px-2.5 text-xs font-bold text-amber-950 hover:bg-amber-100"
              >
                = Labor Post-Siembra (Fumigación · Impacto Neutro)
              </button>
            </div>
          </div>
        )}
        {corrigiendo && (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Esta actividad no se edita ni se borra: se creará un nuevo registro
            que corrige a la actividad #{corrigiendo.secuencia}.
          </p>
        )}
        <fieldset className="space-y-3 rounded-lg border border-stone-200 bg-stone-50/60 p-3.5">
          <legend className="px-1 text-sm font-bold text-stone-900">
            1. Datos principales de la labor
          </legend>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-bold text-stone-800">Tipo de actividad</label>
              <select
                required
                disabled={!!corrigiendo}
                value={tipo}
                onChange={(e) => setTipo(e.target.value as TipoActividad)}
                className="mt-1 min-h-11 w-full rounded-md border-2 border-stone-300 bg-white px-3 text-sm disabled:bg-stone-100"
              >
                {TIPOS.map((t) => (
                  <option key={t} value={t}>
                    {TIPO_ACTIVIDAD_LABEL[t]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-stone-800">Fecha</label>
              <input
                required
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="mt-1 min-h-11 w-full rounded-md border-2 border-stone-300 bg-white px-3 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-stone-800">Descripción</label>
            <textarea
              required
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-md border-2 border-stone-300 bg-white px-3 py-2 text-sm"
            />
          </div>
        </fieldset>

        {tipo === "SIEMBRA" && !corrigiendo && (
          <fieldset className="space-y-3 rounded-lg border-2 border-emerald-700/30 bg-emerald-50/40 p-3.5">
            <legend className="px-1 text-sm font-bold text-emerald-950">
              2. Variables agronómicas para el modelo IA (siembra)
            </legend>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="act-ha-sembradas"
                  className="block text-sm font-bold text-stone-800"
                >
                  Hectáreas sembradas
                </label>
                <input
                  id="act-ha-sembradas"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={haSembradas}
                  onChange={(e) => setHaSembradas(e.target.value)}
                  className="mt-1 min-h-11 w-full rounded-md border-2 border-stone-300 bg-white px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label
                  htmlFor="act-variedad"
                  className="block text-sm font-bold text-stone-800"
                >
                  Variedad o semilla
                </label>
                <input
                  id="act-variedad"
                  maxLength={100}
                  placeholder="Ej. 6410 o MUNASQA"
                  value={variedad}
                  onChange={(e) => setVariedad(e.target.value)}
                  className="mt-1 min-h-11 w-full rounded-md border-2 border-stone-300 bg-white px-3 py-2 text-sm"
                />
              </div>
            </div>
            {impacto && impacto.variedadesConocidas.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                <span className="self-center text-xs text-stone-600">Sugeridas:</span>
                {impacto.variedadesConocidas.map((opcion) => {
                  const activa = variedad.trim().toLowerCase() === opcion.toLowerCase();
                  return (
                    <button
                      key={opcion}
                      type="button"
                      onClick={() => setVariedad(opcion)}
                      className={`min-h-11 rounded-md border px-2.5 text-xs font-semibold ${
                        activa
                          ? "border-emerald-700 bg-emerald-50 text-emerald-900"
                          : "border-stone-300 bg-white text-stone-700 hover:bg-stone-100"
                      }`}
                    >
                      {opcion}
                    </button>
                  );
                })}
              </div>
            )}
          </fieldset>
        )}

        <PanelImpactoPrediccion
          impacto={impacto}
          cargando={cargandoImpacto}
          error={errorImpacto}
        />

        {tipo === "COSECHA" && (
          <div className="rounded-lg border-2 border-stone-300 bg-stone-50 p-3.5">
            <label className="block text-sm font-bold text-stone-800">
              Rendimiento cosechado (t/ha)
            </label>
            <input
              required
              type="number"
              step="0.01"
              min="0.01"
              value={rendimientoTnHa}
              onChange={(e) => setRendimientoTnHa(e.target.value)}
              className="mt-1 min-h-11 w-full rounded-md border-2 border-stone-300 bg-white px-3 py-2 text-sm"
            />
          </div>
        )}

        <fieldset className="space-y-3 rounded-lg border border-stone-200 bg-stone-50/40 p-3.5">
          <legend className="px-1 text-xs font-bold uppercase tracking-wide text-stone-700">
            Detalles de insumo y maquinaria (opcionales para bitácora)
          </legend>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-bold text-stone-700">Insumo</label>
              <input
                value={insumo}
                onChange={(e) => setInsumo(e.target.value)}
                className="mt-1 min-h-11 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-700">Cantidad</label>
              <input
                type="number"
                step="0.01"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                className="mt-1 min-h-11 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-700">Unidad</label>
              <input
                value={unidad}
                onChange={(e) => setUnidad(e.target.value)}
                placeholder="kg/ha, L/ha..."
                className="mt-1 min-h-11 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-stone-700">Maquinaria utilizada</label>
            <input
              value={maquinaria}
              onChange={(e) => setMaquinaria(e.target.value)}
              className="mt-1 min-h-11 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm"
            />
          </div>
          <label className="flex min-h-11 items-center gap-2 text-sm text-stone-700">
            <input
              type="checkbox"
              checked={tercerizado}
              onChange={(e) => setTercerizado(e.target.checked)}
            />
            Trabajo tercerizado
          </label>
        </fieldset>

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

        <AccionesModal onCancelar={onClose} etiqueta="Registrar" guardando={guardando} />
      </form>
    </Modal>
  );
}
