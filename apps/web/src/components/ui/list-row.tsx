/**
 * Fila de lista: miniatura a la izquierda, titulo + datos + chips al centro y
 * acciones a la derecha (como las filas de parcelas de la referencia).
 */
export function ListRow({
  miniatura,
  titulo,
  detalle,
  chips,
  acciones,
  resaltada = false,
  ...eventos
}: {
  miniatura?: React.ReactNode;
  titulo: React.ReactNode;
  /** Texto corto al lado del titulo (ej. "5,2 ha"). */
  detalle?: React.ReactNode;
  chips?: React.ReactNode;
  acciones?: React.ReactNode;
  resaltada?: boolean;
} & Pick<React.HTMLAttributes<HTMLDivElement>, "onMouseEnter" | "onMouseLeave" | "onFocus" | "onBlur">) {
  return (
    <div
      {...eventos}
      className={`flex items-center gap-3.5 rounded-control px-2 py-2.5 transition-colors ${
        resaltada ? "bg-marca-suave" : "hover:bg-fondo-suave"
      }`}
    >
      {miniatura}
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-baseline gap-x-2 text-base font-semibold text-tinta">
          {titulo}
          {detalle && <span className="text-sm font-normal text-tinta-suave">{detalle}</span>}
        </p>
        {chips && <div className="mt-1.5 flex flex-wrap items-center gap-1.5">{chips}</div>}
      </div>
      {acciones && <div className="flex shrink-0 items-center gap-1">{acciones}</div>}
    </div>
  );
}
