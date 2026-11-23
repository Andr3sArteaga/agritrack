"use client";

import { useEffect, useState, type FormEvent } from "react";
import { PanelImpactoPrediccion } from "@/components/estado/panel-impacto-prediccion";
import { AccionesModal, Modal } from "@/components/modal";
import { api, apiErrorMessage } from "@/lib/api";
import { aFechaInput } from "@/lib/format";
import {
  type RegistroCosechaCampana,
  type ResultadoImpacto,
} from "@/lib/prediccion";
import { TIPO_ACTIVIDAD_LABEL, type Actividad, type TipoActividad } from "@/lib/types";

const TIPOS: TipoActividad[] = [
  "SIEMBRA",
  "FERTILIZACION",
  "FUMIGACION",
  "MEDICION_HUMEDAD_SUELO",
  "MEDICION_HUMEDAD_GRANO",
  "COSECHA",
];

interface ConfigCamposPorTipo {
  seccionDetalle: string;
  labelInsumo: string;
  placeholderInsumo: string;
  labelCantidad: string;
  placeholderCantidad: string;
  labelUnidad: string;
  placeholderUnidad: string;
  labelMaquinaria: string;
  placeholderMaquinaria: string;
  ayudaDescripcion: string;
}

const CONFIG_CAMPOS_TIPO: Record<TipoActividad, ConfigCamposPorTipo> = {
  SIEMBRA: {
    seccionDetalle: "Detalles de semilla, densidad y maquinaria (opcional)",
    labelInsumo: "Semilla / tratamiento",
    placeholderInsumo: "Ej. Semilla certificada inoculada",
    labelCantidad: "Densidad / cantidad",
    placeholderCantidad: "Ej. 60",
    labelUnidad: "Unidad",
    placeholderUnidad: "kg/ha, bolsas...",
    labelMaquinaria: "Sembradora / tractor",
    placeholderMaquinaria: "Ej. Sembradora 12 surcos",
    ayudaDescripcion: "Ej. Siembra directa con distancia entre surcos de 45 cm",
  },
  FERTILIZACION: {
    seccionDetalle: "Fertilizante aplicado, dosis y equipo",
    labelInsumo: "Fertilizante aplicado",
    placeholderInsumo: "Ej. Urea / NPK 18-46-0",
    labelCantidad: "Dosis / cantidad",
    placeholderCantidad: "Ej. 120",
    labelUnidad: "Unidad",
    placeholderUnidad: "kg/ha, L/ha...",
    labelMaquinaria: "Fertilizadora / tractor",
    placeholderMaquinaria: "Ej. Fertilizadora centrífuga",
    ayudaDescripcion: "Ej. Aplicación de cobertura según análisis de suelo",
  },
  FUMIGACION: {
    seccionDetalle: "Producto fitosanitario, dosis y pulverización",
    labelInsumo: "Producto fitosanitario",
    placeholderInsumo: "Ej. Fungicida preventivo / Herbicida",
    labelCantidad: "Dosis aplicada",
    placeholderCantidad: "Ej. 1.5",
    labelUnidad: "Unidad",
    placeholderUnidad: "L/ha, cc/ha...",
    labelMaquinaria: "Pulverizadora / equipo",
    placeholderMaquinaria: "Ej. Pulverizador autopropulsado",
    ayudaDescripcion: "Ej. Control preventivo en estadio vegetativo temprano",
  },
  MEDICION_HUMEDAD_SUELO: {
    seccionDetalle: "Medición de humedad del suelo en campo",
    labelInsumo: "Profundidad o sector (opcional)",
    placeholderInsumo: "Ej. Perfil 0–20 cm",
    labelCantidad: "Humedad medida",
    placeholderCantidad: "Ej. 24.5",
    labelUnidad: "Unidad",
    placeholderUnidad: "%",
    labelMaquinaria: "Instrumento / sonda",
    placeholderMaquinaria: "Ej. Sonda TDR / Tensiómetro",
    ayudaDescripcion: "Ej. Muestreo promedio de 5 puntos del lote",
  },
  MEDICION_HUMEDAD_GRANO: {
    seccionDetalle: "Medición de humedad del grano",
    labelInsumo: "Muestra / sector (opcional)",
    placeholderInsumo: "Ej. Muestreo previo a cosecha",
    labelCantidad: "Humedad medida",
    placeholderCantidad: "Ej. 13.5",
    labelUnidad: "Unidad",
    placeholderUnidad: "%",
    labelMaquinaria: "Higrómetro / medidor",
    placeholderMaquinaria: "Ej. Medidor portátil de humedad",
    ayudaDescripcion: "Ej. Verificación de humedad óptima para inicio de cosecha",
  },
  COSECHA: {
    seccionDetalle: "Cosechadora y detalle operativo (opcional)",
    labelInsumo: "Destino / acopio (opcional)",
    placeholderInsumo: "Ej. Silo norte / Entrega directa",
    labelCantidad: "Volumen referencial (opcional)",
    placeholderCantidad: "Ej. 160",
    labelUnidad: "Unidad",
    placeholderUnidad: "t, kg...",
    labelMaquinaria: "Cosechadora / maquinaria",
    placeholderMaquinaria: "Ej. Cosechadora axial + tolva",
    ayudaDescripcion: "Ej. Cosecha completa del lote con grano limpio",
  },
};

export function ActividadForm({
  parcelaId,
  campanaId,
  hectareasParcela,
  registroCosecha = null,
  corrigiendo,
  tipoInicial = "SIEMBRA",
  onClose,
  onSaved,
}: {
  parcelaId: string;
  campanaId: string;
  hectareasParcela: number;
  registroCosecha?: RegistroCosechaCampana | null;
  corrigiendo: Actividad | null;
  tipoInicial?: TipoActividad;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [tipo, setTipo] = useState<TipoActividad>(corrigiendo?.tipo ?? tipoInicial);
  const [fecha, setFecha] = useState(
    corrigiendo?.fecha.slice(0, 10) ??
      (tipoInicial === "SIEMBRA" && registroCosecha?.fechaSiembra
        ? aFechaInput(registroCosecha.fechaSiembra)
        : new Date().toLocaleDateString("en-CA")),
  );
  const [descripcion, setDescripcion] = useState(corrigiendo?.descripcion ?? "");
  const [insumo, setInsumo] = useState(corrigiendo?.insumo ?? "");
  const [cantidad, setCantidad] = useState(corrigiendo?.cantidad?.toString() ?? "");
  const [unidad, setUnidad] = useState(
    corrigiendo?.unidad ??
      (tipoInicial === "MEDICION_HUMEDAD_SUELO" || tipoInicial === "MEDICION_HUMEDAD_GRANO"
        ? "%"
        : ""),
  );
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
  const [cargandoImpacto, setCargandoImpacto] = useState(false);
  const [errorImpacto, setErrorImpacto] = useState<string | null>(null);

  const [actividadEnviada, setActividadEnviada] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const configCampos = CONFIG_CAMPOS_TIPO[tipo];

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

  function alCambiarTipo(nuevoTipo: TipoActividad) {
    setTipo(nuevoTipo);
    const esMedicion =
      nuevoTipo === "MEDICION_HUMEDAD_SUELO" || nuevoTipo === "MEDICION_HUMEDAD_GRANO";
    if (esMedicion && unidad.trim() === "") {
      setUnidad("%");
    } else if (!esMedicion && unidad === "%") {
      setUnidad("");
    }
  }

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
          insumo: insumo.trim() || undefined,
          cantidad: cantidad ? Number(cantidad) : undefined,
          unidad: unidad.trim() || undefined,
          tercerizado,
          maquinariaUtilizada: maquinaria.trim() || undefined,
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

      if (tipo === "COSECHA" && !corrigiendo && rendimientoTnHa.trim() !== "") {
        const rindeNum = Number(rendimientoTnHa);
        const haBase = registroCosecha?.haSembradas ?? hectareasParcela;
        if (Number.isFinite(rindeNum) && rindeNum >= 0 && haBase > 0) {
          try {
            await api.put(`/campanas/${campanaId}/registro-cosecha`, {
              ...(registroCosecha ? {} : { haSembradas: haBase }),
              fechaCosecha: fecha,
              haCosechadas: haBase,
              toneladas: Math.round(haBase * rindeNum * 100) / 100,
            });
          } catch {
            // La actividad ya quedó registrada; si el cierre de cosecha requiere ajuste se edita en Manejo.
          }
        }
      }

      onSaved();
    } catch (err) {
      setError(apiErrorMessage(err, "No se pudo registrar la actividad"));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal
      titulo={corrigiendo ? "Corregir actividad" : "Registrar actividad agrícola"}
      ancho="2xl"
      onClose={onClose}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {corrigiendo && (
          <p className="rounded-control border border-atencion-borde/40 bg-atencion-fondo px-3 py-2 text-sm text-atencion-texto">
            El historial es inmutable: se creará un nuevo registro que corrige a la actividad #
            {corrigiendo.secuencia}.
          </p>
        )}

        <fieldset className="space-y-3 rounded-tarjeta border border-borde bg-fondo-suave p-4">
          <legend className="px-1 text-sm font-bold text-tinta">
            1. Tipo de actividad y fecha
          </legend>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="act-tipo" className="block text-sm font-bold text-tinta">
                Tipo de actividad
              </label>
              <select
                id="act-tipo"
                required
                disabled={!!corrigiendo}
                value={tipo}
                onChange={(e) => alCambiarTipo(e.target.value as TipoActividad)}
                className="mt-1 min-h-11 w-full rounded-control border border-borde bg-white px-3 text-sm text-tinta disabled:bg-fondo"
              >
                {TIPOS.map((t) => (
                  <option key={t} value={t}>
                    {TIPO_ACTIVIDAD_LABEL[t]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="act-fecha" className="block text-sm font-bold text-tinta">
                Fecha de realización
              </label>
              <input
                id="act-fecha"
                required
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="mt-1 min-h-11 w-full rounded-control border border-borde bg-white px-3 text-sm text-tinta"
              />
            </div>
          </div>
          <div>
            <label htmlFor="act-descripcion" className="block text-sm font-bold text-tinta">
              Descripción de la labor / observación
            </label>
            <textarea
              id="act-descripcion"
              required
              placeholder={configCampos.ayudaDescripcion}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-control border border-borde bg-white px-3 py-2 text-sm text-tinta"
            />
          </div>
        </fieldset>

        {tipo === "SIEMBRA" && !corrigiendo && (
          <fieldset className="space-y-3 rounded-tarjeta border border-marca/30 bg-marca-suave/60 p-4">
            <legend className="px-1 text-sm font-bold text-marca">
              2. Variables agronómicas que alimentan al modelo predictivo
            </legend>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="act-ha-sembradas"
                  className="block text-sm font-bold text-tinta"
                >
                  Superficie sembrada (ha)
                </label>
                <input
                  id="act-ha-sembradas"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={haSembradas}
                  onChange={(e) => setHaSembradas(e.target.value)}
                  className="mt-1 min-h-11 w-full rounded-control border border-borde bg-white px-3 py-2 text-sm text-tinta"
                />
              </div>
              <div>
                <label htmlFor="act-variedad" className="block text-sm font-bold text-tinta">
                  Variedad o semilla
                </label>
                <input
                  id="act-variedad"
                  maxLength={100}
                  placeholder="Ej. 6410 o MUNASQA"
                  value={variedad}
                  onChange={(e) => setVariedad(e.target.value)}
                  className="mt-1 min-h-11 w-full rounded-control border border-borde bg-white px-3 py-2 text-sm text-tinta"
                />
              </div>
            </div>
            {impacto && impacto.variedadesConocidas.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                <span className="self-center text-xs font-medium text-tinta-suave">
                  Variedades conocidas:
                </span>
                {impacto.variedadesConocidas.map((opcion) => {
                  const activa = variedad.trim().toLowerCase() === opcion.toLowerCase();
                  return (
                    <button
                      key={opcion}
                      type="button"
                      onClick={() => setVariedad(opcion)}
                      className={`min-h-11 rounded-control border px-2.5 text-xs font-semibold ${
                        activa
                          ? "border-marca bg-marca text-white"
                          : "border-borde bg-white text-tinta hover:bg-marca-suave"
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

        {tipo === "COSECHA" && (
          <div className="rounded-tarjeta border border-marca/30 bg-marca-suave/50 p-4">
            <label htmlFor="act-rendimiento" className="block text-sm font-bold text-tinta">
              Rendimiento cosechado (t/ha)
            </label>
            <input
              id="act-rendimiento"
              required
              type="number"
              step="0.01"
              min="0.01"
              placeholder="Ej. 3.40"
              value={rendimientoTnHa}
              onChange={(e) => setRendimientoTnHa(e.target.value)}
              className="mt-1 min-h-11 w-full rounded-control border border-borde bg-white px-3 py-2 text-sm text-tinta"
            />
          </div>
        )}

        <PanelImpactoPrediccion
          impacto={impacto}
          cargando={cargandoImpacto}
          error={errorImpacto}
        />

        <fieldset className="space-y-3 rounded-tarjeta border border-borde bg-white p-4">
          <legend className="px-1 text-xs font-bold uppercase tracking-wide text-tinta-suave">
            {configCampos.seccionDetalle}
          </legend>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor="act-insumo" className="block text-xs font-bold text-tinta">
                {configCampos.labelInsumo}
              </label>
              <input
                id="act-insumo"
                placeholder={configCampos.placeholderInsumo}
                value={insumo}
                onChange={(e) => setInsumo(e.target.value)}
                className="mt-1 min-h-11 w-full rounded-control border border-borde bg-white px-3 py-2 text-sm text-tinta"
              />
            </div>
            <div>
              <label htmlFor="act-cantidad" className="block text-xs font-bold text-tinta">
                {configCampos.labelCantidad}
              </label>
              <input
                id="act-cantidad"
                type="number"
                step="0.01"
                placeholder={configCampos.placeholderCantidad}
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                className="mt-1 min-h-11 w-full rounded-control border border-borde bg-white px-3 py-2 text-sm text-tinta"
              />
            </div>
            <div>
              <label htmlFor="act-unidad" className="block text-xs font-bold text-tinta">
                {configCampos.labelUnidad}
              </label>
              <input
                id="act-unidad"
                placeholder={configCampos.placeholderUnidad}
                value={unidad}
                onChange={(e) => setUnidad(e.target.value)}
                className="mt-1 min-h-11 w-full rounded-control border border-borde bg-white px-3 py-2 text-sm text-tinta"
              />
            </div>
          </div>
          <div>
            <label htmlFor="act-maquinaria" className="block text-xs font-bold text-tinta">
              {configCampos.labelMaquinaria}
            </label>
            <input
              id="act-maquinaria"
              placeholder={configCampos.placeholderMaquinaria}
              value={maquinaria}
              onChange={(e) => setMaquinaria(e.target.value)}
              className="mt-1 min-h-11 w-full rounded-control border border-borde bg-white px-3 py-2 text-sm text-tinta"
            />
          </div>
          <label className="flex min-h-11 items-center gap-2 text-sm text-tinta">
            <input
              type="checkbox"
              checked={tercerizado}
              onChange={(e) => setTercerizado(e.target.checked)}
            />
            Servicio tercerizado
          </label>
        </fieldset>

        {corrigiendo && (
          <div>
            <label htmlFor="act-motivo" className="block text-sm font-bold text-tinta">
              Motivo de la corrección
            </label>
            <textarea
              id="act-motivo"
              required
              value={motivoCorreccion}
              onChange={(e) => setMotivoCorreccion(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-control border border-borde px-3 py-2 text-sm text-tinta"
            />
          </div>
        )}

        {error && <p className="text-sm font-medium text-critico-borde">{error}</p>}

        <AccionesModal
          onCancelar={onClose}
          etiqueta={corrigiendo ? "Guardar corrección" : "Registrar actividad"}
          guardando={guardando}
        />
      </form>
    </Modal>
  );
}
