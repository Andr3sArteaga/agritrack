import { Ruler, Sprout } from "lucide-react";
import { Advertencia } from "@/components/estado/advertencia";
import { EstadoVacio } from "@/components/estado/estado-vacio";
import { EnlaceBoton } from "@/components/enlace-boton";
import { EncabezadoPublico } from "@/components/publico/encabezado-publico";
import { LineaBasePublica } from "@/components/publico/linea-base-publica";
import { lineaBaseDesdeToneladas } from "@/lib/linea-base";
import type { CatalogoParcela } from "@/lib/types";

/** null = no se pudo cargar (distinto de "no hay parcelas"). */
async function obtenerCatalogo(): Promise<CatalogoParcela[] | null> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/public/parcelas`, {
      cache: "no-store",
    });
    return res.ok ? res.json() : null;
  } catch {
    return null;
  }
}

export default async function CatalogoPage() {
  const parcelas = await obtenerCatalogo();

  return (
    <div className="flex flex-1 flex-col">
      <EncabezadoPublico>
        <EnlaceBoton href="/login">Ingresar</EnlaceBoton>
      </EncabezadoPublico>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 sm:py-12">
        <h1 className="text-3xl font-bold text-stone-900">Parcelas disponibles para preventa</h1>
        <p className="mt-2 text-lg text-stone-700">Elige una parcela para ver su detalle.</p>

        <div className="mt-8">
          {parcelas === null ? (
            <Advertencia tipo="ATENCION" titulo="No pudimos cargar las parcelas" rol="alert">
              Intenta de nuevo en unos minutos.
            </Advertencia>
          ) : parcelas.length === 0 ? (
            <EstadoVacio titulo="Todavía no hay parcelas disponibles">
              <p>Cuando haya parcelas para preventa, aparecerán aquí.</p>
            </EstadoVacio>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {parcelas.map((parcela) => (
                <article
                  key={parcela.id}
                  className="flex flex-col rounded-lg border border-stone-200 bg-white p-5 shadow-sm"
                >
                  <h2 className="text-xl font-bold text-stone-900">{parcela.nombre}</h2>
                  <dl className="mt-4 space-y-2 text-base text-stone-700">
                    <div className="flex items-center justify-between gap-3">
                      <dt className="flex items-center gap-2">
                        <Ruler className="h-4 w-4 shrink-0 text-stone-600" aria-hidden />
                        Hectáreas
                      </dt>
                      <dd className="font-bold text-stone-900">{parcela.hectareas} ha</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="flex items-center gap-2">
                        <Sprout className="h-4 w-4 shrink-0 text-stone-600" aria-hidden />
                        Cultivo actual
                      </dt>
                      <dd className="font-bold text-stone-900">
                        {parcela.cultivoActual ?? "Sin campaña activa"}
                      </dd>
                    </div>
                  </dl>
                  <div className="mt-4">
                    <LineaBasePublica
                      rendimientoTnHa={lineaBaseDesdeToneladas(
                        parcela.produccionEstimadaTn,
                        parcela.hectareas,
                      )}
                    />
                  </div>
                  <div className="mt-auto pt-5">
                    <EnlaceBoton href={`/parcelas/${parcela.id}`} variante="secundario" completo>
                      Ver detalle
                    </EnlaceBoton>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
