import { formatearFecha } from "@/lib/format";

/**
 * Escala NEUTRA con un marcador en el valor real. No tiene zonas de color:
 * sin reglas agronomicas validadas no se puede decir si un valor es bueno o malo.
 * Sin valor muestra "Sin datos".
 */
export function RangeBar({
  etiqueta,
  valor,
  min,
  max,
  unidad = "",
  fecha,
}: {
  etiqueta: string;
  /** null = no hay dato. */
  valor: number | null;
  min: number;
  max: number;
  unidad?: string;
  /** Fecha ISO de la medicion. */
  fecha?: string | null;
}) {
  const porcentaje =
    valor === null ? null : Math.min(100, Math.max(0, ((valor - min) / (max - min)) * 100));
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium text-tinta">{etiqueta}</p>
        {valor === null ? (
          <p className="text-sm font-semibold text-sindatos-texto">Sin datos</p>
        ) : (
          <p className="text-base font-semibold text-tinta">
            {valor}
            {unidad && <span className="ml-0.5 text-sm font-normal text-tinta-suave">{unidad}</span>}
          </p>
        )}
      </div>
      <div
        className={`relative mt-2 h-2.5 rounded-full ${
          valor === null ? "border border-dashed border-sindatos-borde bg-sindatos-fondo" : "bg-borde"
        }`}
        role={valor === null ? undefined : "meter"}
        aria-label={etiqueta}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={valor ?? undefined}
      >
        {porcentaje !== null && (
          <span
            className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white bg-marca shadow-tarjeta"
            style={{ left: `${porcentaje}%` }}
            aria-hidden
          />
        )}
      </div>
      <div className="mt-1 flex justify-between text-xs text-tinta-suave">
        <span>{min}</span>
        {fecha && valor !== null && <span>Medido el {formatearFecha(fecha)}</span>}
        <span>{max}</span>
      </div>
    </div>
  );
}
