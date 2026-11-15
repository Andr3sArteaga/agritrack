import { CalendarClock, FileClock, Ruler, Sprout } from "lucide-react";
import { Ayuda } from "@/components/ayuda";
import { EnlaceBoton } from "@/components/enlace-boton";
import { formatearFecha } from "@/lib/format";
import type { ResumenParcela } from "@/lib/resumen-parcela";
import { TEXTOS } from "@/lib/textos";
import { ESTADO_CAMPANA_LABEL } from "@/lib/types";
import { DesgloseAreas, ICONO_AREA } from "./desglose-areas";
import { ESTILO_ESTADO, EstadoBadge } from "./estado-badge";
import { EstimacionRendimiento } from "./estimacion-rendimiento";
import { MarcadorPendiente } from "./marcadores";

function Dato({
  icono: Icono,
  etiqueta,
  children,
  pendiente,
}: {
  icono: typeof Ruler;
  etiqueta: string;
  children: React.ReactNode;
  pendiente?: string;
}) {
  return (
    <div className="flex items-start gap-2 text-sm text-stone-600">
      <Icono size={18} className="mt-0.5 shrink-0 text-stone-600" aria-hidden />
      <div>
        {etiqueta}
        <p className="text-base font-bold text-stone-900">{children}</p>
        {pendiente && (
          <div className="mt-1">
            <MarcadorPendiente tipo="DATOS" etiqueta={pendiente} />
          </div>
        )}
      </div>
    </div>
  );
}

function textoAlertas(resumen: ResumenParcela): string {
  if (resumen.alertas > 0) return String(resumen.alertas);
  // "0 alertas" solo se puede decir si de verdad todo esta bien; con datos faltantes no se puede contar.
  return resumen.estado === "BIEN" ? "0" : "no se pueden contar";
}

/**
 * Resumen de una parcela: estado general, datos clave, estado por area, estimacion
 * de rendimiento y desglose por indicador. Se usa en el resumen y en el detalle.
 */
export function PanelEstadoParcela({
  resumen,
  mostrarEnlace = false,
  idPestana,
}: {
  resumen: ResumenParcela;
  mostrarEnlace?: boolean;
  /** Si el panel va debajo de un selector de pestañas, id de la pestaña que lo controla. */
  idPestana?: string;
}) {
  return (
    <div
      {...(idPestana ? { id: "panel-parcela", role: "tabpanel", "aria-labelledby": idPestana } : {})}
      className="space-y-4"
    >
      <article className="rounded-lg border border-stone-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <h3 className="text-xl font-bold text-stone-900">{resumen.nombre}</h3>
          <span className="inline-flex items-center gap-2">
            <EstadoBadge estado={resumen.estado} tamano="lg" />
            <Ayuda texto={TEXTOS.AYUDA_ESTADOS.texto} />
          </span>
        </div>
        <p className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[15px] text-stone-600">
          <span><b className="text-stone-900">Alertas:</b> {textoAlertas(resumen)}</span>
          <span><b className="text-stone-900">Áreas sin datos:</b> {resumen.areasSinDatos} de {resumen.areas.length}</span>
        </p>

        <div className="my-4 grid gap-4 border-y border-stone-200 py-4 sm:grid-cols-2 lg:grid-cols-4">
          <Dato icono={Ruler} etiqueta="Tamaño">{resumen.hectareas} ha</Dato>
          <Dato icono={Sprout} etiqueta="Cultivo" pendiente="% de superficie: pendiente">
            {resumen.cultivoActual ?? "Sin campaña actual"}
          </Dato>
          <Dato icono={CalendarClock} etiqueta="Etapa de la campaña" pendiente="Etapa del cultivo: pendiente">
            {resumen.campanaActual ? ESTADO_CAMPANA_LABEL[resumen.campanaActual.estado] : "Sin campaña"}
          </Dato>
          <Dato icono={FileClock} etiqueta="Último registro de labor">
            {resumen.ultimoRegistroLabor ? formatearFecha(resumen.ultimoRegistroLabor) : "Sin datos"}
          </Dato>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {resumen.areas.map((area) => {
            const estilo = ESTILO_ESTADO[area.estado];
            const Icono = ICONO_AREA[area.id];
            const sinDato = area.indicadores.length - area.conDato;
            return (
              <div
                key={area.id}
                className={`rounded-lg border-2 p-3 text-sm ${estilo.caja} ${estilo.punteado ? "border-dashed" : ""}`}
              >
                <p className="mb-1.5 flex items-center gap-1.5 text-[15px] font-bold">
                  <Icono size={18} className={estilo.claseIcono} aria-hidden />
                  {area.nombre}
                </p>
                <EstadoBadge estado={area.estado} tamano="sm" />
                <p className="mt-1.5">
                  {area.alertas > 0
                    ? `${area.alertas} ${area.alertas === 1 ? "alerta" : "alertas"}`
                    : area.estado === "BIEN"
                      ? "0 alertas"
                      : sinDato > 0
                        ? `${sinDato} sin dato`
                        : "Falta una regla validada"}
                </p>
              </div>
            );
          })}
        </div>

        {mostrarEnlace && (
          <p className="mt-4">
            <EnlaceBoton href={`/panel/parcelas/${resumen.parcelaId}`}>Ver detalle</EnlaceBoton>
          </p>
        )}
      </article>

      {resumen.estimacion && (
        <EstimacionRendimiento
          rendimientoTnHa={resumen.estimacion.rendimientoTnHa}
          campanasUsadas={resumen.estimacion.campanasUsadas}
          contexto={resumen.cultivoActual ? `${resumen.nombre} · ${resumen.cultivoActual}` : resumen.nombre}
        />
      )}

      <DesgloseAreas areas={resumen.areas} />
    </div>
  );
}
