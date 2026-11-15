/**
 * Carga de los datos del resumen de parcelas. Solo lee de la API que ya existe.
 *
 * Los permisos cambian segun el rol:
 *   - /actividades:           JEFE y OPERATIVO. CONTABILIDAD usa las labores del reporte por campaña.
 *   - /integridad y /reportes: JEFE y CONTABILIDAD (OPERATIVO no los ve: queda "Sin datos" con su nota).
 *   - /prediccion:            cualquier usuario con sesion.
 */
import { useEffect, useState } from "react";
import { api, apiErrorMessage } from "./api";
import { useAuth } from "./auth-context";
import { elegirCampanaActual } from "./parcelas";
import { cargarIdsDemo } from "./prediccion";
import {
  construirResumenParcela,
  type ActividadResumen,
  type ResumenParcela,
} from "./resumen-parcela";
import type {
  Actividad,
  AnalisisSuelo,
  RegistroClima,
  Campana,
  Cultivo,
  HistoricoItem,
  Parcela,
  ReporteCampana,
  ResultadoVerificacion,
  Rol,
} from "./types";

interface ContextoResumen {
  campanas: Campana[];
  cultivos: Cultivo[];
  /** null = este rol no puede ver el historico. */
  historico: HistoricoItem[] | null;
}

const veRegistrosYReportes = (rol: Rol) => rol === "JEFE" || rol === "CONTABILIDAD";

/** Fecha de hace 30 dias, como "AAAA-MM-DD". */
const hace30Dias = (): string =>
  new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

async function pedirActividades(campanaId: string, rol: Rol): Promise<ActividadResumen[]> {
  if (rol === "CONTABILIDAD") {
    const { data } = await api.get<ReporteCampana>(`/reportes/campanas/${campanaId}`);
    return data.actividades.map(({ tipo, fecha, cantidad, unidad }) => ({ tipo, fecha, cantidad, unidad }));
  }
  const { data } = await api.get<Actividad[]>("/actividades", { params: { campanaId } });
  return data
    .filter((actividad) => actividad.vigente)
    .map(({ tipo, fecha, cantidad, unidad }) => ({ tipo, fecha, cantidad, unidad }));
}

export async function cargarResumenParcela(
  parcela: Parcela,
  contexto: ContextoResumen,
  rol: Rol,
): Promise<ResumenParcela> {
  const campanas = contexto.campanas.filter((c) => c.parcelaId === parcela.id);
  const actual = elegirCampanaActual(campanas);

  const [actividades, integridad, prediccion, analisis, clima] = await Promise.all([
    actual ? pedirActividades(actual.id, rol) : Promise.resolve(null),
    veRegistrosYReportes(rol)
      ? api.get<ResultadoVerificacion>(`/integridad/parcela/${parcela.id}`).then((res) => res.data)
      : Promise.resolve(null),
    actual
      ? api
          .get<{ rendimientoEstimadoTnHa: number | null; campanasHistoricasUsadas: number }>("/prediccion", {
            params: { parcelaId: parcela.id, cultivoId: actual.cultivoId },
          })
          .then((res) => res.data)
      : Promise.resolve(null),
    api.get<AnalisisSuelo[]>("/monitoreo/suelo", { params: { parcelaId: parcela.id } }).then((res) => res.data),
    api
      .get<RegistroClima[]>("/monitoreo/clima", { params: { parcelaId: parcela.id, desde: hace30Dias() } })
      .then((res) => res.data),
  ]);

  return construirResumenParcela({
    suelo: analisis,
    clima,
    parcela,
    campanas,
    cultivos: contexto.cultivos,
    historico: contexto.historico,
    actividades,
    integridad,
    prediccion,
  });
}

async function cargarHistorico(rol: Rol, parcelaId?: string): Promise<HistoricoItem[] | null> {
  if (!veRegistrosYReportes(rol)) return null;
  const { data } = await api.get<HistoricoItem[]>("/reportes/historico", { params: { parcelaId } });
  return data;
}

interface EstadoCarga<T> {
  datos: T | null;
  error: string | null;
}

/**
 * Resumen de TODAS las parcelas activas (dashboard y mapa de parcelas).
 * `version`: al cambiarla se vuelve a pedir todo (ej. tras activar o editar una parcela).
 * `incluirDemo`: por defecto las parcelas de demostracion (enmascaradas) quedan fuera.
 */
export function useResumenesParcelas(
  version = 0,
  incluirDemo = false,
): EstadoCarga<ResumenParcela[]> {
  const rol = useAuth().usuario?.rol;
  const [estado, setEstado] = useState<EstadoCarga<ResumenParcela[]>>({ datos: null, error: null });

  useEffect(() => {
    if (!rol) return;
    let cancelado = false;
    (async () => {
      const [parcelas, campanas, cultivos, historico, idsDemo] = await Promise.all([
        api.get<Parcela[]>("/parcelas").then((res) => res.data),
        api.get<Campana[]>("/campanas").then((res) => res.data),
        api.get<Cultivo[]>("/cultivos").then((res) => res.data),
        cargarHistorico(rol),
        cargarIdsDemo(),
      ]);
      return Promise.all(
        parcelas
          .filter((p) => p.activa && (incluirDemo || !idsDemo.has(p.id)))
          .map((p) => cargarResumenParcela(p, { campanas, cultivos, historico }, rol)),
      );
    })()
      .then((datos) => !cancelado && setEstado({ datos, error: null }))
      .catch((err) => !cancelado && setEstado({ datos: null, error: apiErrorMessage(err, "No se pudo cargar el resumen de parcelas") }));
    return () => {
      cancelado = true;
    };
  }, [rol, version, incluirDemo]);

  return estado;
}

/** Resumen de UNA parcela (detalle). Recibe lo que la pagina ya cargo. */
export function useResumenParcela(
  parcela: Parcela | null,
  campanas: Campana[],
  cultivos: Cultivo[],
  /** Al cambiarla se vuelve a cargar (ej. tras agregar un analisis de suelo). */
  version = 0,
): EstadoCarga<ResumenParcela> {
  const rol = useAuth().usuario?.rol;
  const [estado, setEstado] = useState<EstadoCarga<ResumenParcela>>({ datos: null, error: null });

  useEffect(() => {
    // Los cultivos siempre existen en el sistema: si aun no llegaron, la pagina esta cargando.
    if (!rol || !parcela || cultivos.length === 0) return;
    let cancelado = false;
    cargarHistorico(rol, parcela.id)
      .then((historico) => cargarResumenParcela(parcela, { campanas, cultivos, historico }, rol))
      .then((datos) => !cancelado && setEstado({ datos, error: null }))
      .catch((err) => !cancelado && setEstado({ datos: null, error: apiErrorMessage(err, "No se pudo cargar el estado de la parcela") }));
    return () => {
      cancelado = true;
    };
  }, [rol, parcela, campanas, cultivos, version]);

  return estado;
}
