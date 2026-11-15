/**
 * Resumen de estado de una parcela, armado SOLO con datos que la API ya entrega.
 * No crea campos nuevos: lo que no existe queda marcado como pendiente.
 *
 * Funciones puras (sin red): reciben los datos ya cargados y devuelven lo que se dibuja.
 */
import { contarAlertas, estadoGeneral, type EstadoIndicador } from "./estado";
import { formatearFecha } from "./format";
import { elegirCampanaActual } from "./parcelas";
import { TEXTOS, type TextoControlado } from "./textos";
import type {
  Campana,
  Cultivo,
  EstadoCampana,
  HistoricoItem,
  Parcela,
  ResultadoVerificacion,
  TipoActividad,
} from "./types";

export type AreaId = "SUELO" | "CULTIVO" | "CLIMA";

/** Por que un indicador no tiene estado todavia (aunque tenga o no valor). */
export type Pendiente = "REGLA" | "DATOS";

export interface Indicador {
  id: string;
  nombre: string;
  queMide: TextoControlado | null;
  /** Texto ya listo para mostrar; null = no hay dato. */
  valor: string | null;
  /** Solo BIEN/ATENCION/CRITICO si hay una regla validada. Sin ella: SIN_DATOS. */
  estado: EstadoIndicador;
  pendiente: Pendiente | null;
  /** Fecha ISO de la ultima medicion, si se conoce. */
  ultimaMedicion: string | null;
  /** Explicacion corta de por que no hay dato o estado. */
  nota: string | null;
  /** Como se decide el estado cuando YA hay una regla (hoy solo la revision de registros). */
  regla: string | null;
}

export interface AreaResumen {
  id: AreaId;
  nombre: string;
  indicadores: Indicador[];
  estado: EstadoIndicador;
  alertas: number;
  conDato: number;
}

export interface EstimacionRendimiento {
  /** Linea base en t/ha; null = no hay cosechas de ese cultivo. */
  rendimientoTnHa: number | null;
  /** Campañas usadas; null = no se sabe. */
  campanasUsadas: number | null;
}

export interface ResumenParcela {
  parcelaId: string;
  nombre: string;
  ubicacion: string;
  hectareas: number;
  campanaActual: { id: string; temporada: string; estado: EstadoCampana; cultivoId: string } | null;
  cultivoActual: string | null;
  /** Fecha ISO de la ultima labor; null = no hay o no se puede ver. */
  ultimoRegistroLabor: string | null;
  areas: AreaResumen[];
  estado: EstadoIndicador;
  alertas: number;
  areasSinDatos: number;
  /** Decision D2: no tiene campaña actual o su cultivo no tiene cosechas con rendimiento. */
  sinDatosBasicos: boolean;
  /** null = la parcela no tiene campaña actual, asi que no hay estimacion que mostrar. */
  estimacion: EstimacionRendimiento | null;
}

/** Lo minimo de una actividad que necesita el resumen (viene de /actividades o del reporte por campaña). */
export interface ActividadResumen {
  tipo: TipoActividad;
  fecha: string;
  cantidad: number | null;
  unidad: string | null;
}

export interface EntradaResumen {
  parcela: Parcela;
  /** Solo las campañas de esta parcela. */
  campanas: Campana[];
  cultivos: Cultivo[];
  /** null = este rol no puede ver el historico. */
  historico: HistoricoItem[] | null;
  /** null = la parcela no tiene campaña actual. */
  actividades: ActividadResumen[] | null;
  /** null = este rol no puede pedir la revision de registros. */
  integridad: ResultadoVerificacion | null;
  /** null = no hay campaña actual (no se pidio). */
  prediccion: { rendimientoEstimadoTnHa: number | null; campanasHistoricasUsadas: number } | null;
}

const SIN_PERMISO = "Tu rol no puede ver este dato.";

function indicador(parcial: Partial<Indicador> & Pick<Indicador, "id" | "nombre">): Indicador {
  return {
    queMide: null,
    valor: null,
    estado: "SIN_DATOS",
    pendiente: null,
    ultimaMedicion: null,
    nota: null,
    regla: null,
    ...parcial,
  };
}

/** El analisis de suelo no existe en ningun archivo: estos indicadores quedan siempre sin datos. */
function indicadoresSuelo(actividades: ActividadResumen[] | null): Indicador[] {
  const mediciones = (actividades ?? [])
    .filter((a) => a.tipo === "MEDICION_HUMEDAD_SUELO" && a.cantidad !== null)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
  const ultima = mediciones[0];

  return [
    indicador({ id: "ph", nombre: "Acidez del suelo (pH)", queMide: TEXTOS.QUE_MIDE_PH, nota: "No hay análisis de suelo cargado." }),
    indicador({ id: "nitrogeno", nombre: "Nitrógeno", queMide: TEXTOS.QUE_MIDE_NITROGENO, nota: "No hay análisis de suelo cargado." }),
    indicador({ id: "fosforo", nombre: "Fósforo", queMide: TEXTOS.QUE_MIDE_FOSFORO, nota: "No hay análisis de suelo cargado." }),
    indicador({ id: "potasio", nombre: "Potasio", queMide: TEXTOS.QUE_MIDE_POTASIO, nota: "No hay análisis de suelo cargado." }),
    ultima
      ? indicador({
          id: "humedad-suelo",
          nombre: "Humedad del suelo",
          queMide: TEXTOS.QUE_MIDE_HUMEDAD_SUELO,
          valor: `${ultima.cantidad} ${ultima.unidad ?? ""}`.trim(),
          pendiente: "REGLA",
          ultimaMedicion: ultima.fecha,
        })
      : indicador({
          id: "humedad-suelo",
          nombre: "Humedad del suelo",
          queMide: TEXTOS.QUE_MIDE_HUMEDAD_SUELO,
          nota: "No hay mediciones con valor.",
        }),
  ];
}

function indicadorIntegridad(integridad: ResultadoVerificacion | null): Indicador {
  const base = {
    id: "registros-protegidos",
    nombre: "Registros protegidos contra cambios",
    queMide: TEXTOS.QUE_MIDE_REGISTROS,
    regla: "Se revisa solo: es Bien si nada cambió y Crítico si algo cambió.",
  };
  if (integridad === null) return indicador({ ...base, nota: SIN_PERMISO });
  if (integridad.totalVerificadas === 0) {
    return indicador({ ...base, nota: "Todavía no hay registros de labores para revisar." });
  }
  if (integridad.valido) {
    return indicador({
      ...base,
      valor: `${integridad.totalVerificadas} registros revisados`,
      estado: "BIEN",
    });
  }
  return indicador({
    ...base,
    valor: "Se detectó un cambio en los registros",
    estado: "CRITICO",
    nota: integridad.motivo,
  });
}

function indicadoresCultivo(entrada: EntradaResumen, ultimoRegistro: string | null, hayCampana: boolean): Indicador[] {
  const ultimaCosecha = (entrada.historico ?? [])
    .filter((h) => h.parcelaId === entrada.parcela.id)
    .sort((a, b) => b.fecha.localeCompare(a.fecha))[0];

  const rendimiento = indicador(
    entrada.historico === null
      ? { id: "ultima-cosecha", nombre: "Rendimiento de la última cosecha", queMide: TEXTOS.QUE_MIDE_COSECHA, nota: SIN_PERMISO }
      : ultimaCosecha
        ? {
            id: "ultima-cosecha",
            nombre: "Rendimiento de la última cosecha",
            queMide: TEXTOS.QUE_MIDE_COSECHA,
            valor: `${ultimaCosecha.rendimientoTnHa} t/ha`,
            pendiente: "REGLA",
            ultimaMedicion: ultimaCosecha.fecha,
          }
        : { id: "ultima-cosecha", nombre: "Rendimiento de la última cosecha", queMide: TEXTOS.QUE_MIDE_COSECHA, nota: "Todavía no hay cosechas registradas." },
  );

  const labor = indicador(
    !hayCampana
      ? { id: "ultimo-registro", nombre: "Último registro de labor", queMide: TEXTOS.QUE_MIDE_LABOR, nota: "La parcela no tiene una campaña actual." }
      : ultimoRegistro
        ? {
            id: "ultimo-registro",
            nombre: "Último registro de labor",
            queMide: TEXTOS.QUE_MIDE_LABOR,
            valor: formatearFecha(ultimoRegistro),
            pendiente: "REGLA",
            ultimaMedicion: ultimoRegistro,
            nota: "No hay un plazo definido para decir si está al día.",
          }
        : { id: "ultimo-registro", nombre: "Último registro de labor", queMide: TEXTOS.QUE_MIDE_LABOR, nota: "La campaña actual todavía no tiene labores." },
  );

  return [rendimiento, labor, indicadorIntegridad(entrada.integridad)];
}

function indicadoresClima(): Indicador[] {
  const nota = "El sistema todavía no guarda datos de clima.";
  return [
    indicador({ id: "lluvia", nombre: "Lluvia", queMide: TEXTOS.QUE_MIDE_LLUVIA, pendiente: "DATOS", nota }),
    indicador({ id: "temperatura", nombre: "Temperatura", queMide: TEXTOS.QUE_MIDE_TEMPERATURA, pendiente: "DATOS", nota }),
  ];
}

function armarArea(id: AreaId, nombre: string, indicadores: Indicador[]): AreaResumen {
  const estados = indicadores.map((i) => i.estado);
  return {
    id,
    nombre,
    indicadores,
    estado: estadoGeneral(estados),
    alertas: contarAlertas(estados),
    conDato: indicadores.filter((i) => i.valor !== null).length,
  };
}

export function construirResumenParcela(entrada: EntradaResumen): ResumenParcela {
  const { parcela } = entrada;
  const campana = elegirCampanaActual(entrada.campanas) ?? null;
  const cultivoActual = campana
    ? (entrada.cultivos.find((c) => c.id === campana.cultivoId)?.nombre ?? null)
    : null;

  const ultimoRegistroLabor =
    (entrada.actividades ?? []).map((a) => a.fecha).sort((a, b) => b.localeCompare(a))[0] ?? null;

  const areas = [
    armarArea("SUELO", "Suelo", indicadoresSuelo(entrada.actividades)),
    armarArea("CULTIVO", "Cultivo", indicadoresCultivo(entrada, ultimoRegistroLabor, campana !== null)),
    armarArea("CLIMA", "Clima", indicadoresClima()),
  ];

  return {
    parcelaId: parcela.id,
    nombre: parcela.nombre,
    ubicacion: parcela.ubicacionTexto,
    hectareas: parcela.hectareas,
    campanaActual: campana
      ? { id: campana.id, temporada: campana.temporada, estado: campana.estado, cultivoId: campana.cultivoId }
      : null,
    cultivoActual,
    ultimoRegistroLabor,
    areas,
    estado: estadoGeneral(areas.map((a) => a.estado)),
    alertas: areas.reduce((total, a) => total + a.alertas, 0),
    areasSinDatos: areas.filter((a) => a.estado === "SIN_DATOS").length,
    sinDatosBasicos: campana === null || entrada.prediccion?.rendimientoEstimadoTnHa == null,
    estimacion: entrada.prediccion
      ? {
          rendimientoTnHa: entrada.prediccion.rendimientoEstimadoTnHa,
          campanasUsadas: entrada.prediccion.campanasHistoricasUsadas,
        }
      : null,
  };
}
