import Link from "next/link";
import { notFound } from "next/navigation";
import type { DetalleParcelaPublico } from "@/lib/types";
import { TIPO_ACTIVIDAD_LABEL } from "@/lib/types";
import { formatearFecha } from "@/lib/format";
import { MiniMapaCliente } from "./mini-mapa-cliente";
import { RendimientoChart } from "./rendimiento-chart";

async function obtenerDetalle(
  id: string,
): Promise<DetalleParcelaPublico | null> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/public/parcelas/${id}`,
    { cache: "no-store" },
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("No se pudo cargar la parcela");
  return res.json();
}

export default async function ParcelaDetallePage(
  props: PageProps<"/parcelas/[id]">,
) {
  const { id } = await props.params;
  const parcela = await obtenerDetalle(id);
  if (!parcela) notFound();

  const produccionTotal =
    parcela.produccionEstimadaTotalTn !== null
      ? `${parcela.produccionEstimadaTotalTn} t`
      : "Sin datos suficientes";

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-bold text-emerald-700">
            AgriTrack
          </Link>
          <Link
            href="/parcelas"
            className="text-sm font-medium text-stone-600 hover:text-stone-900"
          >
            ← Volver al catálogo
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-stone-900">
              {parcela.nombre}
            </h1>
            <p className="mt-1 text-stone-600">{parcela.ubicacionTexto}</p>
          </div>
          {parcela.registrosVerificados && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1.5 text-sm font-medium text-emerald-800">
              ✓ Registros verificados
            </span>
          )}
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-stone-200 bg-white p-4">
            <p className="text-sm text-stone-500">Hectáreas</p>
            <p className="mt-1 text-xl font-semibold text-stone-900">
              {parcela.hectareas} ha
            </p>
          </div>
          <div className="rounded-lg border border-stone-200 bg-white p-4">
            <p className="text-sm text-stone-500">
              Produce actualmente ({parcela.temporadaActual ?? "sin campaña"})
            </p>
            <p className="mt-1 text-xl font-semibold text-stone-900">
              {parcela.cultivoActual ?? "Sin campaña activa"}
            </p>
          </div>
          <div className="rounded-lg border border-stone-200 bg-white p-4">
            <p className="text-sm text-stone-500">
              Estimación de producción
              {parcela.rendimientoEstimadoTnHa !== null && (
                <> ({parcela.rendimientoEstimadoTnHa} t/ha)</>
              )}
            </p>
            <p className="mt-1 text-xl font-semibold text-emerald-700">
              {produccionTotal}
            </p>
          </div>
        </div>

        {parcela.poligono && (
          <section className="mt-10">
            <h2 className="text-lg font-semibold text-stone-900">
              Ubicación de la parcela
            </h2>
            <div className="mt-4 overflow-hidden rounded-lg border border-stone-200">
              <MiniMapaCliente poligono={parcela.poligono} />
            </div>
          </section>
        )}

        <section className="mt-10">
          <h2 className="text-lg font-semibold text-stone-900">
            Historial de cuidado (campaña actual)
          </h2>
          {parcela.historialCuidado.length === 0 ? (
            <p className="mt-3 text-sm text-stone-500">
              Todavía no hay actividades registradas en la campaña actual.
            </p>
          ) : (
            <ol className="mt-4 space-y-3 border-l-2 border-emerald-200 pl-4">
              {parcela.historialCuidado.map((item, index) => (
                <li key={index}>
                  <p className="text-sm font-medium text-stone-900">
                    {TIPO_ACTIVIDAD_LABEL[item.tipo]}{" "}
                    <span className="text-stone-500">
                      · {formatearFecha(item.fecha)}
                    </span>
                  </p>
                  <p className="text-sm text-stone-600">{item.descripcion}</p>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold text-stone-900">
            Histórico de rendimiento (campañas anteriores)
          </h2>
          <div className="mt-4 rounded-lg border border-stone-200 bg-white p-4">
            <RendimientoChart datos={parcela.historicoRendimiento} />
          </div>
        </section>

        <section className="mt-10 rounded-lg border border-stone-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-stone-900">
            Contacto para negociar
          </h2>
          <dl className="mt-3 space-y-1 text-sm text-stone-700">
            {parcela.contacto.nombre && (
              <div>
                <dt className="inline font-medium">Empresa: </dt>
                <dd className="inline">{parcela.contacto.nombre}</dd>
              </div>
            )}
            {parcela.contacto.telefono && (
              <div>
                <dt className="inline font-medium">Teléfono: </dt>
                <dd className="inline">{parcela.contacto.telefono}</dd>
              </div>
            )}
            {parcela.contacto.email && (
              <div>
                <dt className="inline font-medium">Email: </dt>
                <dd className="inline">{parcela.contacto.email}</dd>
              </div>
            )}
          </dl>
        </section>
      </main>
    </div>
  );
}
