import { ChevronDown, CloudSun, Layers, Sprout, type LucideIcon } from "lucide-react";
import { formatearFecha } from "@/lib/format";
import type { AreaId, AreaResumen, Indicador } from "@/lib/resumen-parcela";
import { EstadoBadge } from "./estado-badge";
import { MarcadorPendiente } from "./marcadores";

export const ICONO_AREA: Record<AreaId, LucideIcon> = {
  SUELO: Layers,
  CULTIVO: Sprout,
  CLIMA: CloudSun,
};

/** Lo que se ve a la derecha de cada fila: la regla pendiente o el estado. */
function EtiquetaIndicador({ indicador }: { indicador: Indicador }) {
  if (indicador.pendiente === "REGLA") return <MarcadorPendiente tipo="REGLA" corto />;
  return <EstadoBadge estado={indicador.estado} tamano="sm" />;
}

function FilaIndicador({ indicador }: { indicador: Indicador }) {
  return (
    <details className="group border-b border-stone-200 last:border-b-0">
      <summary className="grid min-h-[52px] cursor-pointer list-none grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 px-4 py-3 md:grid-cols-[1.4fr_1fr_auto] [&::-webkit-details-marker]:hidden">
        <span className="font-bold text-stone-900">{indicador.nombre}</span>
        <span className="order-3 col-span-2 text-sm text-stone-600 md:order-none md:col-span-1">
          {indicador.valor ? `Valor: ${indicador.valor}` : "Sin dato"}
        </span>
        <span className="justify-self-end">
          <EtiquetaIndicador indicador={indicador} />
        </span>
      </summary>
      <div className="px-4 pb-4 text-sm text-stone-600">
        <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1.5">
          {indicador.queMide && (
            <>
              <dt className="font-bold text-stone-900">Qué mide</dt>
              <dd>{indicador.queMide.texto}</dd>
            </>
          )}
          {indicador.regla ? (
            <>
              <dt className="font-bold text-stone-900">Última revisión</dt>
              <dd>Ahora mismo, al abrir esta pantalla.</dd>
            </>
          ) : (
            <>
              <dt className="font-bold text-stone-900">Última medición</dt>
              <dd>{indicador.ultimaMedicion ? formatearFecha(indicador.ultimaMedicion) : "Sin registro"}</dd>
            </>
          )}
          {indicador.nota && (
            <>
              <dt className="font-bold text-stone-900">Motivo</dt>
              <dd>{indicador.nota}</dd>
            </>
          )}
          <dt className="font-bold text-stone-900">{indicador.pendiente === "DATOS" ? "Datos" : "Regla"}</dt>
          <dd>
            {indicador.pendiente === "DATOS" ? (
              <MarcadorPendiente tipo="DATOS" />
            ) : indicador.regla ? (
              indicador.regla
            ) : (
              <MarcadorPendiente tipo="REGLA" />
            )}
          </dd>
        </dl>
      </div>
    </details>
  );
}

function Area({ area, abierta }: { area: AreaResumen; abierta: boolean }) {
  const Icono = ICONO_AREA[area.id];
  const total = area.indicadores.length;
  return (
    <details open={abierta} className="group mb-3 rounded-lg border border-stone-200 bg-white">
      <summary className="flex min-h-[52px] cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-[17px] font-bold text-stone-900 [&::-webkit-details-marker]:hidden">
        <Icono size={20} className="shrink-0 text-stone-600" aria-hidden />
        {area.nombre}
        <EstadoBadge estado={area.estado} />
        <span className="text-sm font-normal text-stone-600">
          {total} indicadores: {area.conDato} con dato, {total - area.conDato} sin dato
          {area.alertas > 0 && ` · ${area.alertas} ${area.alertas === 1 ? "alerta" : "alertas"}`}
          {area.estado === "SIN_DATOS" && area.conDato === total && " · falta una regla validada"}
        </span>
        <ChevronDown
          size={20}
          className="ml-auto shrink-0 text-stone-600 transition-transform group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <div className="border-t border-stone-200">
        {area.indicadores.map((indicador) => (
          <FilaIndicador key={indicador.id} indicador={indicador} />
        ))}
      </div>
    </details>
  );
}

/** Desglose por area y por indicador. Cada area y cada indicador se abre y se cierra. */
export function DesgloseAreas({ areas }: { areas: AreaResumen[] }) {
  return (
    <div>
      {areas.map((area) => (
        // Se abre sola la que tiene alertas: lo urgente no queda escondido.
        <Area key={area.id} area={area} abierta={area.alertas > 0} />
      ))}
    </div>
  );
}
