import { CircleDashed } from "lucide-react";

/**
 * Estado vacio: "Sin datos" no es un error, asi que se ve con el mismo peso que
 * los demas estados (borde punteado, icono y palabras claras).
 */
export function EstadoVacio({
  titulo,
  mini = false,
  children,
}: {
  titulo: string;
  mini?: boolean;
  children?: React.ReactNode;
}) {
  if (mini) {
    return (
      <div className="flex items-center gap-3 rounded-lg border-2 border-dashed border-sindatos-borde bg-sindatos-fondo p-3 text-sindatos-texto">
        <span className="grid size-8 shrink-0 place-items-center rounded-full border-2 border-dashed border-sindatos-borde bg-white text-sindatos-icono">
          <CircleDashed size={18} aria-hidden />
        </span>
        <div className="text-[15px]">
          <p className="font-bold">{titulo}</p>
          {children && <div>{children}</div>}
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-lg border-2 border-dashed border-sindatos-borde bg-sindatos-fondo px-5 py-7 text-center text-sindatos-texto">
      <span className="mx-auto mb-3 grid size-14 place-items-center rounded-full border-2 border-dashed border-sindatos-borde bg-white text-sindatos-icono">
        <CircleDashed size={28} aria-hidden />
      </span>
      <h3 className="text-xl font-bold">{titulo}</h3>
      {children && <div className="mt-2 space-y-2 text-base">{children}</div>}
    </div>
  );
}
