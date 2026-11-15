/**
 * Resumen de estado de una parcela, armado SOLO con datos que la API ya entrega.
 * Lo que no existe se muestra como "Sin datos", con la indicacion de donde cargarlo.
 *
 * Funciones puras (sin red): reciben los datos ya cargados y devuelven lo que se dibuja.
 */
import { contarAlertas, estadoGeneral, type EstadoIndicador } from "./estado";
import { formatearFecha } from "./format";
import { elegirCampanaActual } from "./parcelas";
import { TEXTOS, type TextoControlado } from "./textos";
import {
  CONDICION_CLIMA_LABEL,
  type AnalisisSuelo,
  type Campana,
  type CondicionClima,
  type Cultivo,
  type EstadoCampana,
  type HistoricoItem,
  type Parcela,
  type RegistroClima,
  type ResultadoVerificacion,
  type TipoActividad,
} from "./types";

export type AreaId = "SUELO" | "CULTIVO" | "CLIMA";

export interface Indicador {
  id: string;
  nombre: string;
  queMide: TextoControlado | null;
  /** Texto ya listo para mostrar; null = no hay dato. */
  valor: string | null;
  /** Solo BIEN/ATENCION/CRITICO si hay una regla. Sin ella: SIN_DATOS (aunque tenga valor). */
  estado: EstadoIndicador;
  /** Fecha ISO de la ultima medicion, si se conoce. */
  ultimaMedicion: string | null;
  /** Explicacion corta de por que no hay dato. */
  nota: string | null;
  /** Como se decide el estado cuando hay una regla (hoy solo la revision de registros). */
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
  /** Registros de suelo de la parcela, del mas reciente al mas antiguo. */
  suelo: AnalisisSuelo[];
  /** Clima anotado en los ultimos 30 dias (del mas reciente al mas antiguo). */
  clima: RegistroClima[];
}

const SIN_PERMISO = "Tu rol no puede ver este dato.";

function indicador(parcial: Partial<Indicador> & Pick<Indicador, "id" | "nombre">): Indicador {
  return {
    queMide: null,
    valor: null,
    estado: "SIN_DATOS",
    ultimaMedicion: null,
    nota: null,
    regla: null,
    ...parcial,
  };
}

type CampoSuelo = "ph" | "nitrogeno" | "fosforo" | "potasio" | "materiaOrganica" | "humedad";

/**
 * Cada valor se toma del registro MAS RECIENTE que lo trae (la lista viene del
 * mas nuevo al mas viejo). Asi, anotar hoy solo la humedad no borra el pH del
 * ultimo analisis de laboratorio.
 */
function indicadorDeSuelo(
  registros: AnalisisSuelo[],
  campo: CampoSuelo,
  base: Pick<Indicador, "id" | "nombre" | "queMide">,
  unidad: string,
): Indicador {
  const conValor = registros.find((registro) => registro[campo] !== null);
  if (conValor) {
    return indicador({
      ...base,
      valor: `${conValor[campo]}${unidad}`,
      ultimaMedicion: conValor.fecha,
    });
  }
  return indicador({ ...base, nota: "Todavía no se cargó este dato." });
}

function indicadoresSuelo(
  registros: AnalisisSuelo[],
  actividades: ActividadResumen[] | null,
): Indicador[] {
  const humedad = { id: "humedad-suelo", nombre: "Humedad del suelo", queMide: TEXTOS.QUE_MIDE_HUMEDAD_SUELO };
  const deSuelo = indicadorDeSuelo(registros, "humedad", humedad, " %");
  // La humedad tambien puede venir de una labor "Medicion de humedad del suelo": gana la mas reciente.
  const deLabor = (actividades ?? [])
    .filter((a) => a.tipo === "MEDICION_HUMEDAD_SUELO" && a.cantidad !== null)
    .sort((a, b) => b.fecha.localeCompare(a.fecha))[0];
  const laborEsMasNueva =
    deLabor !== undefined &&
    (deSuelo.ultimaMedicion === null || deLabor.fecha > deSuelo.ultimaMedicion);

  return [
    indicadorDeSuelo(registros, "ph", { id: "ph", nombre: "Acidez del suelo (pH)", queMide: TEXTOS.QUE_MIDE_PH }, ""),
    indicadorDeSuelo(registros, "nitrogeno", { id: "nitrogeno", nombre: "Nitrógeno", queMide: TEXTOS.QUE_MIDE_NITROGENO }, " ppm"),
    indicadorDeSuelo(registros, "fosforo", { id: "fosforo", nombre: "Fósforo", queMide: TEXTOS.QUE_MIDE_FOSFORO }, " ppm"),
    indicadorDeSuelo(registros, "potasio", { id: "potasio", nombre: "Potasio", queMide: TEXTOS.QUE_MIDE_POTASIO }, " ppm"),
    indicadorDeSuelo(registros, "materiaOrganica", { id: "materia-organica", nombre: "Materia orgánica", queMide: null }, " %"),
    laborEsMasNueva
      ? indicador({
          ...humedad,
          valor: `${deLabor.cantidad} ${deLabor.unidad ?? ""}`.trim(),
          ultimaMedicion: deLabor.fecha,
        })
      : deSuelo,
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
  const cosecha = {
    id: "ultima-cosecha",
    nombre: "Rendimiento de la última cosecha",
    queMide: TEXTOS.QUE_MIDE_COSECHA,
  };
  const labor = {
    id: "ultimo-registro",
    nombre: "Último registro de labor",
    queMide: TEXTOS.QUE_MIDE_LABOR,
  };

  return [
    indicador(
      entrada.historico === null
        ? { ...cosecha, nota: SIN_PERMISO }
        : ultimaCosecha
          ? { ...cosecha, valor: `${ultimaCosecha.rendimientoTnHa} t/ha`, ultimaMedicion: ultimaCosecha.fecha }
          : { ...cosecha, nota: "Todavía no hay cosechas registradas." },
    ),
    indicador(
      !hayCampana
        ? { ...labor, nota: "La parcela no tiene una campaña actual." }
        : ultimoRegistro
          ? { ...labor, valor: formatearFecha(ultimoRegistro), ultimaMedicion: ultimoRegistro }
          : { ...labor, nota: "La campaña actual todavía no tiene labores." },
    ),
    indicadorIntegridad(entrada.integridad),
  ];
}

const EVENTOS: readonly CondicionClima[] = ["HELADA", "GRANIZO", "VIENTO_FUERTE"];
const LLUVIAS: readonly CondicionClima[] = ["LLUVIA_LIGERA", "LLUVIA_FUERTE"];
const contarDias = (n: number): string => `${n} ${n === 1 ? "día" : "días"}`;

/** Resumen del clima anotado en los ultimos 30 dias (registros del mas reciente al mas antiguo). */
export function indicadoresClima(clima: RegistroClima[]): Indicador[] {
  const ultimoClima = { id: "ultimo-clima", nombre: "Último clima anotado", queMide: null };
  const lluvia = { id: "lluvia", nombre: "Días con lluvia (últimos 30 días)", queMide: TEXTOS.QUE_MIDE_LLUVIA };
  const eventosClima = { id: "eventos-clima", nombre: "Heladas, granizo o viento fuerte (últimos 30 días)", queMide: null };

  if (clima.length === 0) {
    const nota = "Todavía no se anotó el clima en los últimos 30 días.";
    return [
      indicador({ ...ultimoClima, nota }),
      indicador({ ...lluvia, nota }),
      indicador({ ...eventosClima, nota }),
    ];
  }

  const ultimo = clima[0];
  const lluvias = clima.filter((r) => LLUVIAS.includes(r.condicion));
  const milimetros = lluvias.reduce((total, r) => total + (r.lluviaMm ?? 0), 0);
  const eventos = clima.filter((r) => EVENTOS.includes(r.condicion));

  return [
    indicador({
      ...ultimoClima,
      valor:
        CONDICION_CLIMA_LABEL[ultimo.condicion] +
        (ultimo.lluviaMm !== null ? ` · ${ultimo.lluviaMm} mm` : ""),
      ultimaMedicion: ultimo.fecha,
      nota: ultimo.notas,
    }),
    indicador({
      ...lluvia,
      valor:
        contarDias(lluvias.length) +
        (milimetros > 0 ? ` · ${Math.round(milimetros * 10) / 10} mm anotados` : ""),
      ultimaMedicion: lluvias[0]?.fecha ?? null,
      nota: `Sobre ${contarDias(clima.length)} con clima anotado. Los días sin anotar no se cuentan.`,
    }),
    indicador({
      ...eventosClima,
      valor:
        eventos.length === 0
          ? "Ninguno anotado"
          : eventos
              .map((r) => `${CONDICION_CLIMA_LABEL[r.condicion]} (${formatearFecha(r.fecha)})`)
              .join(", "),
      ultimaMedicion: eventos[0]?.fecha ?? null,
    }),
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
    armarArea("SUELO", "Suelo", indicadoresSuelo(entrada.suelo, entrada.actividades)),
    // Se llama "Labores y cosecha": el cultivo ya se eligio al crear la campaña.
    armarArea("CULTIVO", "Labores y cosecha", indicadoresCultivo(entrada, ultimoRegistroLabor, campana !== null)),
    armarArea("CLIMA", "Clima", indicadoresClima(entrada.clima)),
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
