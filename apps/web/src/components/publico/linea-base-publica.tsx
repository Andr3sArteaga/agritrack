import { Advertencia } from "@/components/estado/advertencia";
import { EstadoBadge } from "@/components/estado/estado-badge";
import { puedePublicarse, TEXTOS } from "@/lib/textos";

/**
 * Bloque de produccion de la parte PUBLICA (RF-52): nunca muestra una estimacion de
 * produccion; dice que no esta validada y muestra solo la linea base.
 *
 * La advertencia de menos de 3 campañas (RF-32) es un texto nuevo: solo se publica cuando
 * el Responsable del equipo lo aprueba (ver lib/textos.ts). Hasta entonces no sale aqui.
 */
export function LineaBasePublica({ rendimientoTnHa }: { rendimientoTnHa: number | null }) {
  const publicarAdvertencia = puedePublicarse(TEXTOS.MENOS_DE_TRES_CAMPANAS);
  return (
    <div className="rounded-lg border border-stone-200 bg-stone-50 p-4">
      <p className="font-bold text-stone-900">{TEXTOS.PRODUCCION_SIN_ESTIMACION.texto}</p>
      <p className="mt-2 text-stone-700">
        {TEXTOS.LINEA_BASE_ETIQUETA.texto}{" "}
        <span className="text-sm text-stone-600">(promedio de campañas anteriores)</span>
      </p>
      {rendimientoTnHa === null ? (
        <p className="mt-1">
          <EstadoBadge estado="SIN_DATOS" />
        </p>
      ) : (
        <>
          <p className="mt-1 text-2xl font-bold text-stone-900">
            {rendimientoTnHa} <span className="text-base font-semibold">t/ha</span>
          </p>
          {publicarAdvertencia && (
            <div className="mt-3">
              <Advertencia
                tipo="ATENCION"
                titulo="No se puede validar"
                texto={TEXTOS.MENOS_DE_TRES_CAMPANAS}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
