import { TEXTOS } from "@/lib/textos";
import { Advertencia } from "./advertencia";
import { EstadoVacio } from "./estado-vacio";
import { MarcadorPendiente } from "./marcadores";

/** RF-32: con menos de tres campañas la estimacion no se puede validar. */
export const MINIMO_CAMPANAS_PARA_VALIDAR = 3;

/**
 * Linea base de rendimiento. Va SIEMPRE junto a su advertencia, en todo lugar donde
 * se muestre una estimacion: el usuario debe saber cuando no se puede validar.
 */
export function EstimacionRendimiento({
  rendimientoTnHa,
  campanasUsadas,
  contexto,
}: {
  /** Linea base en t/ha; null = todavia no hay cosechas de ese cultivo. */
  rendimientoTnHa: number | null;
  /** Campañas usadas; null = no se sabe. */
  campanasUsadas: number | null;
  /** Ej. "Parcela El Ceibo · Soya". */
  contexto?: string;
}) {
  if (rendimientoTnHa === null) {
    return (
      <EstadoVacio mini titulo="Línea base por cultivo: sin datos">
        <p>Todavía no hay cosechas registradas de este cultivo.</p>
      </EstadoVacio>
    );
  }

  const faltanCampanas = campanasUsadas === null || campanasUsadas < MINIMO_CAMPANAS_PARA_VALIDAR;

  return (
    <div className="rounded-lg border border-stone-200 bg-white p-5">
      <p className="text-sm text-stone-600">
        Línea base por cultivo <span className="text-stone-500">(promedio de campañas anteriores)</span>
      </p>
      {contexto && <p className="text-sm text-stone-500">{contexto}</p>}
      <p className="mt-1 text-3xl font-bold text-stone-900">
        {rendimientoTnHa} <span className="text-lg font-semibold">t/ha</span>
      </p>
      <p className="mb-3 mt-1 flex flex-wrap items-center gap-2 text-sm text-stone-600">
        {campanasUsadas === null ? (
          <MarcadorPendiente tipo="DATOS" etiqueta="Campañas usadas: pendiente" />
        ) : (
          <>
            Calculada con {campanasUsadas} {campanasUsadas === 1 ? "campaña" : "campañas"}.
          </>
        )}
      </p>
      {faltanCampanas ? (
        <Advertencia
          tipo="ATENCION"
          titulo="No se puede validar"
          texto={TEXTOS.MENOS_DE_TRES_CAMPANAS}
        />
      ) : (
        <Advertencia
          tipo="PENDIENTE"
          titulo="Todavía no hay una estimación validada"
          texto={TEXTOS.ESTIMACION_NO_VALIDADA}
        />
      )}
    </div>
  );
}
