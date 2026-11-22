import { useId } from "react";

/** Clases de un campo de formulario (input, select, textarea): 44 px y borde de token. */
export const CLASE_CAMPO =
  "min-h-11 w-full rounded-control border border-borde bg-superficie px-3 text-base text-tinta placeholder:text-tinta-suave focus:border-marca";

/**
 * Etiqueta + campo + ayuda + error, ligados por id para lectores de pantalla.
 * El campo se pasa como funcion para recibir su id.
 */
export function Field({
  etiqueta,
  opcional = false,
  ayuda,
  error,
  children,
}: {
  etiqueta: string;
  opcional?: boolean;
  ayuda?: string;
  error?: string | null;
  children: (props: { id: string; "aria-describedby"?: string; "aria-invalid"?: boolean }) => React.ReactNode;
}) {
  const id = useId();
  const idNota = `${id}-nota`;
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-tinta">
        {etiqueta}
        {opcional && <span className="ml-1 font-normal text-tinta-suave">(opcional)</span>}
      </label>
      <div className="mt-1.5">
        {children({
          id,
          "aria-describedby": ayuda || error ? idNota : undefined,
          "aria-invalid": error ? true : undefined,
        })}
      </div>
      {(error || ayuda) && (
        <p id={idNota} className={`mt-1 text-sm ${error ? "font-medium text-critico-borde" : "text-tinta-suave"}`}>
          {error || ayuda}
        </p>
      )}
    </div>
  );
}
