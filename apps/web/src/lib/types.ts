export type Rol = "JEFE" | "CONTABILIDAD" | "OPERATIVO";

export type EstadoCampana = "PLANIFICADA" | "EN_CURSO" | "COSECHADA";

export type TipoActividad =
  | "SIEMBRA"
  | "FUMIGACION"
  | "FERTILIZACION"
  | "MEDICION_HUMEDAD_SUELO"
  | "MEDICION_HUMEDAD_GRANO"
  | "COSECHA";

export type TipoContacto =
  | "COMPRADOR"
  | "TRANSPORTISTA"
  | "MAQUINARIA"
  | "INSUMOS"
  | "SERVICIOS"
  | "OTRO";

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
  createdAt: string;
}

export interface LoginResponse {
  accessToken: string;
  usuario: Usuario;
}

export interface Parcela {
  id: string;
  nombre: string;
  hectareas: number;
  ubicacionTexto: string;
  lat: number | null;
  lng: number | null;
  disponibleParaPreventa: boolean;
  activa: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Cultivo {
  id: string;
  nombre: string;
  createdAt: string;
}

export interface Campana {
  id: string;
  parcelaId: string;
  cultivoId: string;
  temporada: string;
  fechaInicio: string;
  fechaFin: string | null;
  estado: EstadoCampana;
  createdAt: string;
  updatedAt: string;
}

export interface Actividad {
  id: string;
  secuencia: number;
  campanaId: string;
  tipo: TipoActividad;
  fecha: string;
  descripcion: string;
  insumo: string | null;
  cantidad: number | null;
  unidad: string | null;
  responsableId: string;
  tercerizado: boolean;
  maquinariaUtilizada: string | null;
  rendimientoTnHa: number | null;
  correccionDeId: string | null;
  motivoCorreccion: string | null;
  hash: string;
  hashAnterior: string | null;
  createdAt: string;
  vigente: boolean;
}

export interface Contacto {
  id: string;
  tipo: TipoContacto;
  nombre: string;
  empresa: string | null;
  telefono: string | null;
  email: string | null;
  notas: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface HistoricoItem {
  campanaId: string;
  parcelaId: string;
  parcelaNombre: string;
  cultivoId: string;
  cultivoNombre: string;
  temporada: string;
  rendimientoTnHa: number;
  fecha: string;
}

export interface ProximaCosecha {
  campanaId: string;
  parcelaNombre: string;
  cultivoNombre: string;
  fechaFin: string | null;
}

export interface PrediccionProximaCampana {
  campanaId: string;
  parcelaNombre: string;
  cultivoNombre: string;
  temporada: string;
  rendimientoEstimadoTnHa: number | null;
  campanasHistoricasUsadas: number;
}

export interface ResumenDashboard {
  hectareasTotales: number;
  campanasEnCurso: number;
  proximasCosechas: ProximaCosecha[];
  ultimaCosecha: HistoricoItem | null;
  historicoRendimiento: HistoricoItem[];
  prediccionProximaCampana: PrediccionProximaCampana | null;
}

export interface ResultadoVerificacion {
  valido: boolean;
  totalVerificadas: number;
  actividadAlteradaId: string | null;
  motivo: string | null;
}

export interface CatalogoParcela {
  id: string;
  nombre: string;
  hectareas: number;
  cultivoActual: string | null;
  produccionEstimadaTn: number | null;
}

export interface TimelineItem {
  tipo: TipoActividad;
  fecha: string;
  descripcion: string;
}

export interface HistoricoPublicoItem {
  temporada: string;
  rendimientoTnHa: number;
  fecha: string;
}

export interface DetalleParcelaPublico {
  id: string;
  nombre: string;
  hectareas: number;
  ubicacionTexto: string;
  cultivoActual: string | null;
  temporadaActual: string | null;
  rendimientoEstimadoTnHa: number | null;
  produccionEstimadaTotalTn: number | null;
  historialCuidado: TimelineItem[];
  historicoRendimiento: HistoricoPublicoItem[];
  registrosVerificados: boolean;
  contacto: {
    nombre: string | null;
    telefono: string | null;
    email: string | null;
  };
}

export const TIPO_ACTIVIDAD_LABEL: Record<TipoActividad, string> = {
  SIEMBRA: "Siembra",
  FUMIGACION: "Fumigación",
  FERTILIZACION: "Fertilización",
  MEDICION_HUMEDAD_SUELO: "Medición humedad de suelo",
  MEDICION_HUMEDAD_GRANO: "Medición humedad de grano",
  COSECHA: "Cosecha",
};

export const ESTADO_CAMPANA_LABEL: Record<EstadoCampana, string> = {
  PLANIFICADA: "Planificada",
  EN_CURSO: "En curso",
  COSECHADA: "Cosechada",
};

export const TIPO_CONTACTO_LABEL: Record<TipoContacto, string> = {
  COMPRADOR: "Comprador",
  TRANSPORTISTA: "Transportista",
  MAQUINARIA: "Maquinaria",
  INSUMOS: "Insumos",
  SERVICIOS: "Servicios",
  OTRO: "Otro",
};

export const ROL_LABEL: Record<Rol, string> = {
  JEFE: "Jefe",
  CONTABILIDAD: "Contabilidad",
  OPERATIVO: "Operativo",
};
