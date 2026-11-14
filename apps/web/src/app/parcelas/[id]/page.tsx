import { ArrowLeft, Building2, ListChecks, LineChart, Mail, MapPin, MapPinned, Phone, Ruler, Sprout } from "lucide-react";
import { notFound } from "next/navigation";
import { EstadoBadge } from "@/components/estado/estado-badge";
import { EstadoVacio } from "@/components/estado/estado-vacio";
import { EnlaceBoton } from "@/components/enlace-boton";
import { IconoActividad } from "@/components/icono-actividad";
import { EncabezadoPublico } from "@/components/publico/encabezado-publico";
import { LineaBasePublica } from "@/components/publico/linea-base-publica";
import { formatearFecha } from "@/lib/format";
import type { DetalleParcelaPublico } from "@/lib/types";
import { TIPO_ACTIVIDAD_LABEL } from "@/lib/types";
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

function Seccion({
  titulo,
  icono: Icono,
  children,
}: {
  titulo: string;
  icono: typeof ListChecks;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <h2 className="flex items-center gap-2 text-[22px] font-bold text-stone-900">
        <Icono className="h-6 w-6 text-emerald-700" aria-hidden />
        {titulo}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** Dato de contacto que se toca para llamar o escribir (alto minimo 44 px). */
function EnlaceContacto({
  icono: Icono,
  href,
  children,
}: {
  icono: typeof Phone;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className="inline-flex min-h-11 items-center gap-2 font-bold text-emerald-800 underline underline-offset-2 hover:text-emerald-900"
    >
      <Icono className="h-5 w-5 shrink-0" aria-hidden />
      {children}
    </a>
  );
}

export default async function ParcelaDetallePage(
  props: PageProps<"/parcelas/[id]">,
) {
  const { id } = await props.params;
  const parcela = await obtenerDetalle(id);
  if (!parcela) notFound();

  const { contacto } = parcela;
  const tieneContacto = Boolean(contacto.nombre || contacto.telefono || contacto.email);

  return (
    <div className="flex flex-1 flex-col">
      <EncabezadoPublico ancho="max-w-5xl">
        <EnlaceBoton href="/parcelas" variante="secundario">
          <ArrowLeft className="h-5 w-5" aria-hidden />
          Volver al catálogo
        </EnlaceBoton>
      </EncabezadoPublico>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-stone-900">{parcela.nombre}</h1>
            <p className="mt-1 flex items-center gap-2 text-lg text-stone-700">
              <MapPin className="h-5 w-5 shrink-0 text-stone-600" aria-hidden />
              {parcela.ubicacionTexto}
            </p>
          </div>
          <p className="flex flex-wrap items-center gap-2 text-base text-stone-700">
            Registros protegidos contra cambios:
            <EstadoBadge estado={parcela.registrosVerificados ? "BIEN" : "CRITICO"} />
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border border-stone-200 bg-white p-4">
            <p className="flex items-center gap-2 text-base text-stone-600">
              <Ruler className="h-5 w-5 shrink-0" aria-hidden />
              Hectáreas
            </p>
            <p className="mt-1 text-2xl font-bold text-stone-900">{parcela.hectareas} ha</p>
          </div>
          <div className="rounded-lg border border-stone-200 bg-white p-4">
            <p className="flex items-center gap-2 text-base text-stone-600">
              <Sprout className="h-5 w-5 shrink-0" aria-hidden />
              Produce actualmente ({parcela.temporadaActual ?? "sin campaña"})
            </p>
            <p className="mt-1 text-2xl font-bold text-stone-900">
              {parcela.cultivoActual ?? "Sin campaña activa"}
            </p>
          </div>
          <div className="sm:col-span-2 lg:col-span-1">
            <LineaBasePublica rendimientoTnHa={parcela.rendimientoEstimadoTnHa} />
          </div>
        </div>

        {parcela.poligono && (
          <Seccion titulo="Dónde está la parcela" icono={MapPinned}>
            <div className="overflow-hidden rounded-lg border border-stone-300">
              <MiniMapaCliente poligono={parcela.poligono} />
            </div>
          </Seccion>
        )}

        <Seccion titulo="Historial de cuidado (campaña actual)" icono={ListChecks}>
          {parcela.historialCuidado.length === 0 ? (
            <EstadoVacio mini titulo="Todavía no hay labores registradas">
              <p>Las labores de la campaña actual aparecerán aquí.</p>
            </EstadoVacio>
          ) : (
            <ol className="space-y-4 border-l-2 border-emerald-300 pl-4">
              {parcela.historialCuidado.map((item, index) => (
                <li key={index}>
                  <p className="flex flex-wrap items-center gap-2 text-base font-bold text-stone-900">
                    <IconoActividad tipo={item.tipo} />
                    {TIPO_ACTIVIDAD_LABEL[item.tipo]}
                    <span className="font-normal text-stone-600">· {formatearFecha(item.fecha)}</span>
                  </p>
                  <p className="text-base text-stone-700">{item.descripcion}</p>
                </li>
              ))}
            </ol>
          )}
        </Seccion>

        <Seccion titulo="Histórico de rendimiento (campañas anteriores)" icono={LineChart}>
          <div className="rounded-lg border border-stone-200 bg-white p-4">
            <RendimientoChart datos={parcela.historicoRendimiento} />
          </div>
        </Seccion>

        <section className="mt-10 rounded-lg border border-stone-200 bg-white p-6">
          <h2 className="text-[22px] font-bold text-stone-900">Contacto para negociar</h2>
          {tieneContacto ? (
            <div className="mt-3 flex flex-col items-start gap-1 text-base text-stone-800">
              {contacto.nombre && (
                <p className="flex min-h-11 items-center gap-2">
                  <Building2 className="h-5 w-5 shrink-0 text-stone-600" aria-hidden />
                  <span>
                    <span className="text-stone-600">Empresa: </span>
                    <b>{contacto.nombre}</b>
                  </span>
                </p>
              )}
              {contacto.telefono && (
                <EnlaceContacto icono={Phone} href={`tel:${contacto.telefono.replace(/\s+/g, "")}`}>
                  {contacto.telefono}
                </EnlaceContacto>
              )}
              {contacto.email && (
                <EnlaceContacto icono={Mail} href={`mailto:${contacto.email}`}>
                  {contacto.email}
                </EnlaceContacto>
              )}
            </div>
          ) : (
            <div className="mt-3">
              <EstadoVacio mini titulo="Contacto: sin datos">
                <p>Todavía no hay datos de contacto.</p>
              </EstadoVacio>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
