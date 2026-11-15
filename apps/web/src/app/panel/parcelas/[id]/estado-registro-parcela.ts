import { formatearFecha } from "@/lib/format";
import type { RegistroCosechaCampana } from "@/lib/prediccion";
import {
  CONDICION_CLIMA_LABEL,
  TIPO_ACTIVIDAD_LABEL,
  type Actividad,
  type AnalisisSuelo,
  type Campana,
  type CondicionClima,
  type Parcela,
  type RegistroClima,
} from "@/lib/types";

export type EstadoRegistroItem = "COMPLETO" | "INCOMPLETO" | "SIN_DATOS";

export interface IndicadorSueloValor {
  campo: "ph" | "materiaOrganica" | "humedad" | "nitrogeno" | "fosforo" | "potasio";
  etiqueta: string;
  unidad: string;
  valor: number | null;
  fecha: string | null;
}

export interface ObservacionUnificada {
  id: string;
  origen: "Suelo" | "Clima" | "Actividad";
  fecha: string;
  titulo: string;
  detalle: string;
}

export interface DimensionEstadoRegistro {
  id: "general" | "actividades" | "suelo" | "clima" | "manejo";
  nombre: string;
  estado: EstadoRegistroItem;
  resumen: string;
  faltantes: string[];
  accionLabel?: string;
}

export interface EvaluacionRegistroParcela {
  indicadoresSuelo: IndicadorSueloValor[];
  sueloConDato: number;
  estadoSuelo: EstadoRegistroItem;
  clima30d: RegistroClima[];
  lluvia30dMm: number;
  eventosAdversos30d: number;
  estadoClima: EstadoRegistroItem;
  manejoConDato: number;
  estadoManejo: EstadoRegistroItem;
  observaciones: ObservacionUnificada[];
  estadoObservaciones: EstadoRegistroItem;
  dimensiones: DimensionEstadoRegistro[];
  completadas: number;
  totalFaltantes: number;
}

const EVENTOS_ADVERSOS: readonly CondicionClima[] = [
  "HELADA",
  "GRANIZO",
  "VIENTO_FUERTE",
];

const hace30DiasIso = (): string =>
  new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

const DEFINICION_SUELO: {
  campo: IndicadorSueloValor["campo"];
  etiqueta: string;
  unidad: string;
}[] = [
  { campo: "ph", etiqueta: "Acidez (pH)", unidad: "" },
  { campo: "materiaOrganica", etiqueta: "Materia orgánica", unidad: "%" },
  { campo: "humedad", etiqueta: "Humedad del suelo", unidad: "%" },
  { campo: "nitrogeno", etiqueta: "Nitrógeno (N)", unidad: "ppm" },
  { campo: "fosforo", etiqueta: "Fósforo (P)", unidad: "ppm" },
  { campo: "potasio", etiqueta: "Potasio (K)", unidad: "ppm" },
];

export function evaluarRegistroParcela({
  parcela,
  campanaActiva,
  cultivoNombre,
  actividadesCampana,
  suelo,
  clima,
  registroActivo,
}: {
  parcela: Parcela;
  campanaActiva: Campana | null;
  cultivoNombre: string | null;
  actividadesCampana: Actividad[];
  suelo: AnalisisSuelo[];
  clima: RegistroClima[];
  registroActivo: RegistroCosechaCampana | null;
}): EvaluacionRegistroParcela {
  const actividadesVigentes = actividadesCampana.filter((a) => a.vigente);

  // 1. Indicadores reales de suelo (mas reciente primero)
  const medicionHumedadLabor = actividadesVigentes
    .filter((a) => a.tipo === "MEDICION_HUMEDAD_SUELO" && a.cantidad !== null)
    .sort((a, b) => b.fecha.localeCompare(a.fecha))[0];

  const indicadoresSuelo: IndicadorSueloValor[] = DEFINICION_SUELO.map((def) => {
    const registro = suelo.find((s) => s[def.campo] !== null);
    let valor = registro ? registro[def.campo] : null;
    let fecha = registro ? registro.fecha : null;

    if (
      def.campo === "humedad" &&
      medicionHumedadLabor &&
      medicionHumedadLabor.cantidad !== null &&
      (!fecha || medicionHumedadLabor.fecha > fecha)
    ) {
      valor = medicionHumedadLabor.cantidad;
      fecha = medicionHumedadLabor.fecha;
    }

    return {
      campo: def.campo,
      etiqueta: def.etiqueta,
      unidad: def.unidad,
      valor,
      fecha,
    };
  });

  const sueloConDato = indicadoresSuelo.filter((i) => i.valor !== null).length;
  const estadoSuelo: EstadoRegistroItem =
    sueloConDato === 6 ? "COMPLETO" : sueloConDato > 0 ? "INCOMPLETO" : "SIN_DATOS";

  // 2. Registros reales de clima
  const corte30d = hace30DiasIso();
  const clima30d = clima.filter((c) => c.fecha.slice(0, 10) >= corte30d);
  const lluvia30dMm =
    Math.round(clima30d.reduce((acc, c) => acc + (c.lluviaMm ?? 0), 0) * 10) / 10;
  const eventosAdversos30d = clima30d.filter((c) =>
    EVENTOS_ADVERSOS.includes(c.condicion),
  ).length;
  const estadoClima: EstadoRegistroItem =
    clima30d.length > 0 ? "COMPLETO" : clima.length > 0 ? "INCOMPLETO" : "SIN_DATOS";

  // 3. Variables reales de manejo pre-siembra (modelo predictivo)
  const tieneHa = Boolean(registroActivo && registroActivo.haSembradas > 0);
  const tieneFechaSiembra = Boolean(registroActivo?.fechaSiembra);
  const tieneVariedad = Boolean(registroActivo?.variedad?.trim());
  const manejoConDato =
    (tieneHa ? 1 : 0) + (tieneFechaSiembra ? 1 : 0) + (tieneVariedad ? 1 : 0);
  const estadoManejo: EstadoRegistroItem =
    manejoConDato === 3
      ? "COMPLETO"
      : manejoConDato > 0
        ? "INCOMPLETO"
        : "SIN_DATOS";

  // 4. Observaciones consolidadas de suelo, clima y actividades
  const observaciones: ObservacionUnificada[] = [
    ...suelo
      .filter((s) => Boolean(s.notas?.trim()))
      .map((s) => ({
        id: `suelo-${s.id}`,
        origen: "Suelo" as const,
        fecha: s.fecha,
        titulo: "Nota en análisis de suelo",
        detalle: s.notas!.trim(),
      })),
    ...clima
      .filter((c) => Boolean(c.notas?.trim()))
      .map((c) => ({
        id: `clima-${c.id}`,
        origen: "Clima" as const,
        fecha: c.fecha,
        titulo: `Nota climática (${CONDICION_CLIMA_LABEL[c.condicion]})`,
        detalle: c.notas!.trim(),
      })),
    ...actividadesVigentes.map((a) => ({
      id: `act-${a.id}`,
      origen: "Actividad" as const,
      fecha: a.fecha,
      titulo: `#${a.secuencia} ${TIPO_ACTIVIDAD_LABEL[a.tipo]}`,
      detalle: a.motivoCorreccion
        ? `${a.descripcion} (Corrección: ${a.motivoCorreccion})`
        : a.descripcion,
    })),
  ].sort((a, b) => b.fecha.localeCompare(a.fecha));

  const estadoObservaciones: EstadoRegistroItem =
    observaciones.length > 0 ? "COMPLETO" : "SIN_DATOS";

  // 5. Cinco dimensiones de "Estado del registro"
  const faltantesGeneral: string[] = [];
  if (!parcela.ubicacionTexto.trim()) faltantesGeneral.push("Ubicación de la parcela");
  if (!(parcela.hectareas > 0)) faltantesGeneral.push("Superficie en hectáreas");
  if (!campanaActiva) faltantesGeneral.push("Crear o activar una campaña agrícola");

  const estadoGeneral: EstadoRegistroItem =
    faltantesGeneral.length === 0 ? "COMPLETO" : "INCOMPLETO";

  const tieneSiembraActividad = actividadesVigentes.some((a) => a.tipo === "SIEMBRA");
  const faltantesActividades: string[] = [];
  if (!campanaActiva) {
    faltantesActividades.push("Crear una campaña para registrar actividades");
  } else if (actividadesVigentes.length === 0) {
    faltantesActividades.push("Registrar labores de campo en la campaña (iniciando por Siembra)");
  } else if (!tieneSiembraActividad) {
    faltantesActividades.push("Registrar la actividad de Siembra en la línea de tiempo");
  }

  const estadoActividades: EstadoRegistroItem = !campanaActiva
    ? "SIN_DATOS"
    : actividadesVigentes.length === 0
      ? "SIN_DATOS"
      : tieneSiembraActividad
        ? "COMPLETO"
        : "INCOMPLETO";

  const faltantesSuelo = indicadoresSuelo
    .filter((i) => i.valor === null)
    .map((i) => i.etiqueta);

  const faltantesClima: string[] = [];
  if (clima.length === 0) {
    faltantesClima.push("Registrar al menos una medición climática diaria");
  } else if (clima30d.length === 0) {
    faltantesClima.push(
      `Sin mediciones en los últimos 30 días (última: ${formatearFecha(clima[0].fecha)})`,
    );
  }

  const faltantesManejo: string[] = [];
  if (!campanaActiva) {
    faltantesManejo.push("Seleccionar o crear una campaña activa");
  } else {
    if (!tieneHa) faltantesManejo.push("Superficie sembrada (ha)");
    if (!tieneFechaSiembra) faltantesManejo.push("Fecha de siembra (variable del modelo)");
    if (!tieneVariedad) faltantesManejo.push("Variedad o semilla utilizada (variable del modelo)");
  }

  const dimensiones: DimensionEstadoRegistro[] = [
    {
      id: "general",
      nombre: "Información general",
      estado: estadoGeneral,
      resumen: campanaActiva
        ? `${parcela.hectareas} ha · ${campanaActiva.temporada}${cultivoNombre ? ` (${cultivoNombre})` : ""}`
        : `${parcela.hectareas} ha · Sin campaña activa`,
      faltantes: faltantesGeneral,
      accionLabel: campanaActiva ? "Editar parcela" : "Crear campaña",
    },
    {
      id: "actividades",
      nombre: "Actividades agrícolas",
      estado: estadoActividades,
      resumen: campanaActiva
        ? `${actividadesVigentes.length} ${actividadesVigentes.length === 1 ? "labor registrada" : "labores registradas"}`
        : "Sin campaña activa",
      faltantes: faltantesActividades,
      accionLabel: campanaActiva ? "Registrar actividad" : undefined,
    },
    {
      id: "suelo",
      nombre: "Variables de suelo",
      estado: estadoSuelo,
      resumen: `${sueloConDato}/6 indicadores cargados`,
      faltantes: faltantesSuelo,
      accionLabel: "Registrar análisis de suelo",
    },
    {
      id: "clima",
      nombre: "Variables climáticas",
      estado: estadoClima,
      resumen:
        clima30d.length > 0
          ? `${clima30d.length} registros en últimos 30 días`
          : clima.length > 0
            ? `${clima.length} registros antiguos (>30 días)`
            : "0 mediciones registradas",
      faltantes: faltantesClima,
      accionLabel: "Registrar medición climática",
    },
    {
      id: "manejo",
      nombre: "Variables de manejo",
      estado: estadoManejo,
      resumen: campanaActiva
        ? `${manejoConDato}/3 predictores de siembra listos`
        : "Sin campaña activa",
      faltantes: faltantesManejo,
      accionLabel: campanaActiva ? "Configurar manejo / siembra" : undefined,
    },
  ];

  const completadas = dimensiones.filter((d) => d.estado === "COMPLETO").length;
  const totalFaltantes = dimensiones.reduce((acc, d) => acc + d.faltantes.length, 0);

  return {
    indicadoresSuelo,
    sueloConDato,
    estadoSuelo,
    clima30d,
    lluvia30dMm,
    eventosAdversos30d,
    estadoClima,
    manejoConDato,
    estadoManejo,
    observaciones,
    estadoObservaciones,
    dimensiones,
    completadas,
    totalFaltantes,
  };
}
