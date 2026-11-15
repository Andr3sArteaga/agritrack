import { ESTADOS_EN_PANTALLA, ETIQUETA_ESTADO, type EstadoIndicador } from "@/lib/estado";
import { ESTILO_ESTADO } from "./estado-badge";

const LEYENDA: Record<EstadoIndicador, string> = {
  SIN_DATOS: "parcelas sin datos",
  BIEN: "parcelas bien",
  ATENCION: "parcelas en atención",
  CRITICO: "parcelas críticas",
};

/**
 * Cuantas parcelas hay en cada estado. "Sin datos" va primero y pesa igual que los demas:
 * hoy es el caso mas frecuente y no es un error.
 */
export function ContadorEstados({
  conteo,
  sinDatosBasicos,
}: {
  conteo: Record<EstadoIndicador, number>;
  /** Cuantas parcelas no tienen campaña actual o cosechas de su cultivo (decision D2). */
  sinDatosBasicos: number;
}) {
  return (
    <div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {ESTADOS_EN_PANTALLA.map((estado) => {
          const estilo = ESTILO_ESTADO[estado];
          const Icono = estilo.icono;
          return (
            <div
              key={estado}
              className={`rounded-lg border-2 border-l-[10px] p-4 ${estilo.caja} ${
                estilo.punteado ? "border-dashed [border-left-style:solid]" : ""
              }`}
            >
              <div className="text-4xl font-bold leading-none">{conteo[estado]}</div>
              <p className="mt-2 flex items-center gap-1.5 font-bold">
                <Icono size={18} className={`shrink-0 ${estilo.claseIcono}`} aria-hidden />
                {ETIQUETA_ESTADO[estado]}
              </p>
              <p className="text-[15px]">{LEYENDA[estado]}</p>
            </div>
          );
        })}
      </div>
      {conteo.SIN_DATOS > 0 && (
        <p className="mt-3 text-[15px] text-stone-700">
          {sinDatosBasicos === 0
            ? "Todas las parcelas sin datos tienen campaña actual y cosechas de su cultivo; les faltan datos de suelo o clima."
            : `De las parcelas sin datos, ${sinDatosBasicos} no tienen campaña actual o cosechas de su cultivo.`}
        </p>
      )}
    </div>
  );
}
