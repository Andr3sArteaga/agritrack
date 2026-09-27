import Link from "next/link";
import type { CatalogoParcela } from "@/lib/types";

async function obtenerCatalogo(): Promise<CatalogoParcela[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/public/parcelas`, {
    cache: "no-store",
  });
  if (!res.ok) return [];
  return res.json();
}

export default async function CatalogoPage() {
  const parcelas = await obtenerCatalogo();

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-bold text-emerald-700">
            AgriTrack
          </Link>
          <Link
            href="/login"
            className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
          >
            Ingresar
          </Link>
        </div>
      </header>

      <main className="mx-auto flex-1 w-full max-w-6xl px-6 py-12">
        <h1 className="text-2xl font-bold text-stone-900">
          Parcelas disponibles para preventa
        </h1>
        <p className="mt-2 text-stone-600">
          Producción estimada de la campaña actual de cada parcela.
        </p>

        {parcelas.length === 0 ? (
          <p className="mt-10 text-stone-500">
            No hay parcelas disponibles para preventa en este momento.
          </p>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {parcelas.map((parcela) => (
              <Link
                key={parcela.id}
                href={`/parcelas/${parcela.id}`}
                className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm transition hover:border-emerald-300 hover:shadow-md"
              >
                <h2 className="text-lg font-semibold text-stone-900">
                  {parcela.nombre}
                </h2>
                <dl className="mt-4 space-y-1 text-sm text-stone-600">
                  <div className="flex justify-between">
                    <dt>Hectáreas</dt>
                    <dd className="font-medium text-stone-900">
                      {parcela.hectareas} ha
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Cultivo actual</dt>
                    <dd className="font-medium text-stone-900">
                      {parcela.cultivoActual ?? "Sin campaña activa"}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Producción estimada</dt>
                    <dd className="font-medium text-emerald-700">
                      {parcela.produccionEstimadaTn !== null
                        ? `${parcela.produccionEstimadaTn} t`
                        : "Sin datos"}
                    </dd>
                  </div>
                </dl>
                <span className="mt-4 inline-block text-sm font-medium text-emerald-700">
                  Ver detalle →
                </span>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
