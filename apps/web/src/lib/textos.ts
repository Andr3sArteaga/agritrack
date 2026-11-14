/**
 * Textos nuevos de advertencia, recomendacion y ayuda de la interfaz.
 *
 * Regla: un texto PENDIENTE_REVISION no se publica hasta que lo apruebe el
 * Responsable del equipo. Mientras tanto se muestra solo en el panel privado
 * con la etiqueta "Texto pendiente de revisión". Para aprobar uno, se cambia su
 * estado a APROBADO (con commit propio).
 *
 * DADO_POR_EQUIPO = el texto lo escribio el equipo en el pedido de rediseno.
 */
export type EstadoTexto = "DADO_POR_EQUIPO" | "PENDIENTE_REVISION";

export interface TextoControlado {
  id: string;
  texto: string;
  estado: EstadoTexto;
}

export const TEXTOS = {
  /** Texto de la parte publica dictado en el pedido (punto 8): RF-52. */
  PRODUCCION_SIN_ESTIMACION: {
    id: "T1",
    texto: "Producción: sin estimación validada.",
    estado: "DADO_POR_EQUIPO",
  },
  LINEA_BASE_ETIQUETA: {
    id: "T2",
    texto: "Línea base por cultivo",
    estado: "DADO_POR_EQUIPO",
  },
  /** RF-32: la advertencia de menos de tres campañas. */
  MENOS_DE_TRES_CAMPANAS: {
    id: "T3",
    texto: "Con menos de 3 campañas, este número no se puede validar.",
    estado: "PENDIENTE_REVISION",
  },
  ESTIMACION_NO_VALIDADA: {
    id: "T4",
    texto: "Es el promedio de campañas anteriores, nada más.",
    estado: "PENDIENTE_REVISION",
  },
  REGLA_PENDIENTE: {
    id: "T5",
    texto: "Pendiente de regla validada por agrónomo",
    estado: "DADO_POR_EQUIPO",
  },
  SUELO_SIN_ANALISIS: {
    id: "T7",
    texto: "Todavía no hay análisis de suelo. Cuando se carguen los resultados, aparecerán aquí.",
    estado: "PENDIENTE_REVISION",
  },
  AYUDA_ESTADOS: {
    id: "T8",
    texto:
      "Bien: dato al día que cumple la regla. Atención: conviene revisarlo pronto. Crítico: requiere acción ahora. Sin datos: falta el dato o está vencido.",
    estado: "PENDIENTE_REVISION",
  },
  /** Descripciones de lo que mide cada indicador agronomico (informativas, no son reglas). */
  QUE_MIDE_PH: {
    id: "T10",
    texto: "Qué tan ácida o alcalina es la tierra.",
    estado: "PENDIENTE_REVISION",
  },
  QUE_MIDE_NITROGENO: {
    id: "T11",
    texto: "Cuánto nitrógeno hay en la tierra.",
    estado: "PENDIENTE_REVISION",
  },
  QUE_MIDE_FOSFORO: {
    id: "T12",
    texto: "Cuánto fósforo hay en la tierra.",
    estado: "PENDIENTE_REVISION",
  },
  QUE_MIDE_POTASIO: {
    id: "T13",
    texto: "Cuánto potasio hay en la tierra.",
    estado: "PENDIENTE_REVISION",
  },
  QUE_MIDE_HUMEDAD_SUELO: {
    id: "T14",
    texto: "Cuánta agua tiene la tierra al momento de medirla.",
    estado: "PENDIENTE_REVISION",
  },
  QUE_MIDE_COSECHA: {
    id: "T15",
    texto: "Toneladas cosechadas por hectárea en la cosecha más reciente.",
    estado: "PENDIENTE_REVISION",
  },
  QUE_MIDE_LABOR: {
    id: "T16",
    texto: "Fecha de la última labor anotada en la campaña actual.",
    estado: "PENDIENTE_REVISION",
  },
  QUE_MIDE_REGISTROS: {
    id: "T17",
    texto: "Que nadie haya cambiado los registros de labores. Esta revisión sí funciona hoy.",
    estado: "PENDIENTE_REVISION",
  },
  QUE_MIDE_LLUVIA: {
    id: "T18",
    texto: "Cuánta lluvia cayó en la zona.",
    estado: "PENDIENTE_REVISION",
  },
  QUE_MIDE_TEMPERATURA: {
    id: "T19",
    texto: "Qué temperatura hubo en la zona.",
    estado: "PENDIENTE_REVISION",
  },
} as const satisfies Record<string, TextoControlado>;

/** Solo los textos aprobados o dados por el equipo pueden salir en la parte publica. */
export function puedePublicarse(texto: TextoControlado): boolean {
  return texto.estado !== "PENDIENTE_REVISION";
}
