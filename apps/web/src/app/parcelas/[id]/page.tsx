import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Camera,
  CheckCircle2,
  LineChart,
  ListChecks,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Ruler,
  ShieldCheck,
  Sprout,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { notFound } from "next/navigation";
import { Advertencia } from "@/components/estado/advertencia";
import { EstadoBadge } from "@/components/estado/estado-badge";
import { EstadoVacio } from "@/components/estado/estado-vacio";
import { LandingNavbar } from "@/components/publico/landing-navbar";
import { PiePublico } from "@/components/publico/pie-publico";
import { ActivityItem } from "@/components/ui/activity-item";
import { CropChip } from "@/components/ui/crop-chip";
import { puedePublicarse, TEXTOS } from "@/lib/textos";
import type { DetalleParcelaPublico } from "@/lib/types";
import { GaleriaFotosCliente } from "./galeria-fotos-cliente";
import { MiniMapaCliente } from "./mini-mapa-cliente";
import { RendimientoChart } from "./rendimiento-chart";

async function obtenerDetalle(
  id: string,
): Promise<DetalleParcelaPublico | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) throw new Error("NEXT_PUBLIC_API_URL no configurada");

  const res = await fetch(`${apiUrl}/public/parcelas/${id}`, {
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("No se pudo cargar la parcela");
  return res.json();
}

/** Titulo de cada bloque: icono en un circulo y texto con serifa. */
function TituloSeccion({ icono: Icono, children }: { icono: LucideIcon; children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-3 font-titulo text-3xl leading-tight text-tinta">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-marca-suave text-marca">
        <Icono className="h-5 w-5" aria-hidden />
      </span>
      {children}
    </h2>
  );
}

/** Dato clave de la parcela (superficie, cultivo, promedio). El valor va en Inter, nunca en serifa. */
function DatoClave({
  icono: Icono,
  etiqueta,
  children,
}: {
  icono: LucideIcon;
  etiqueta: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-tarjeta bg-superficie p-5 shadow-tarjeta">
      <p className="flex items-center gap-2 text-sm font-medium text-tinta-suave">
        <Icono className="h-4 w-4 text-marca" aria-hidden />
        {etiqueta}
      </p>
      <div className="mt-2">{children}</div>
    </div>
  );
}

export default async function ParcelaDetallePage(
  props: PageProps<"/parcelas/[id]">,
) {
  const { id } = await props.params;
  const parcela = await obtenerDetalle(id);
  if (!parcela) notFound();

  const { contacto } = parcela;
  const tieneContacto = Boolean(
    contacto.nombre || contacto.telefono || contacto.email,
  );
  const whatsappNumero = (contacto.telefono ?? "").replace(/[^0-9]/g, "");
  const whatsappHref = whatsappNumero
    ? `https://wa.me/${whatsappNumero}?text=${encodeURIComponent(
        `Hola AgroAn, me interesa recibir información sobre la parcela "${parcela.nombre}" en AgriTrack.`,
      )}`
    : null;
  const publicarAdvertencia = puedePublicarse(TEXTOS.MENOS_DE_TRES_CAMPANAS);
  const estadoRegistros =
    parcela.registrosRevisados === 0
      ? "SIN_DATOS"
      : parcela.registrosVerificados
        ? "BIEN"
        : "CRITICO";

  return (
    <div className="flex min-h-screen flex-col bg-hueso text-tinta">
      <LandingNavbar sobreHero />

      {/* pt-20: deja libre el espacio de la barra superpuesta */}
      <main className="flex-1 bg-linear-to-b from-cielo via-hueso to-hueso to-30% pt-20">
        <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
          <Link
            href="/parcelas"
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-borde bg-superficie px-4 text-sm font-semibold text-tinta transition-colors hover:border-tinta"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Volver al catálogo
          </Link>

          {/* Encabezado: nombre grande con serifa, sin tarjeta */}
          <header className="mt-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                {parcela.temporadaActual && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-superficie px-3 py-1 text-sm font-medium text-tinta">
                    <Sprout className="h-4 w-4 text-marca" aria-hidden />
                    {parcela.temporadaActual}
                  </span>
                )}
                <CropChip cultivo={parcela.cultivoActual} />
                <span className="inline-flex items-center gap-1.5 rounded-full bg-marca-suave px-3 py-1 text-sm font-medium text-marca">
                  <CheckCircle2 className="h-4 w-4" aria-hidden />
                  Disponible para preventa
                </span>
              </div>
              <h1 className="mt-4 font-titulo text-5xl leading-[1.05] text-marca-oscuro sm:text-7xl">
                {parcela.nombre}
              </h1>
              <p className="mt-3 flex items-center gap-2 text-base text-tinta-suave">
                <MapPin className="h-4 w-4 shrink-0 text-marca" aria-hidden />
                {parcela.ubicacionTexto}
              </p>
            </div>

            <div className="shrink-0 rounded-tarjeta bg-superficie px-4 py-3.5 shadow-tarjeta">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-sm font-semibold text-tinta">Registros protegidos</span>
                <EstadoBadge estado={estadoRegistros} />
              </div>
              <p className="mt-1.5 flex items-center gap-1.5 text-sm text-tinta-suave">
                <ShieldCheck className="h-4 w-4 shrink-0 text-marca" aria-hidden />
                Verificados con cadena SHA-256
              </p>
            </div>
          </header>

          {/* Mapa grande + datos clave */}
          <div className="mt-8 grid gap-5 lg:grid-cols-12">
            <section aria-label="Ubicación de la parcela" className="lg:col-span-8">
              {parcela.poligono ? (
                <div className="overflow-hidden rounded-tarjeta bg-superficie p-2 shadow-flotante">
                  <div className="overflow-hidden rounded-control">
                    <MiniMapaCliente poligono={parcela.poligono} />
                  </div>
                </div>
              ) : (
                <div className="rounded-tarjeta bg-superficie p-5 shadow-tarjeta">
                  <EstadoVacio mini titulo="Sin polígono dibujado">
                    <p>Esta parcela aún no tiene su contorno dibujado en el mapa.</p>
                  </EstadoVacio>
                </div>
              )}
            </section>

            <div className="grid gap-5 sm:grid-cols-3 lg:col-span-4 lg:grid-cols-1 lg:content-start">
              <DatoClave icono={Ruler} etiqueta="Superficie total">
                <p className="text-3xl font-semibold text-tinta">{parcela.hectareas} ha</p>
                <p className="mt-1 text-sm text-tinta-suave">Medida sobre el polígono del mapa</p>
              </DatoClave>

              <DatoClave icono={Sprout} etiqueta="Cultivo actual">
                {parcela.cultivoActual ? (
                  <>
                    <p className="text-3xl font-semibold text-tinta">{parcela.cultivoActual}</p>
                    {parcela.temporadaActual && (
                      <p className="mt-1 text-sm text-tinta-suave">{parcela.temporadaActual}</p>
                    )}
                  </>
                ) : (
                  <EstadoBadge estado="SIN_DATOS" />
                )}
              </DatoClave>

              <DatoClave icono={TrendingUp} etiqueta={TEXTOS.LINEA_BASE_ETIQUETA.texto}>
                {parcela.rendimientoEstimadoTnHa === null ? (
                  <>
                    <EstadoBadge estado="SIN_DATOS" />
                    <p className="mt-1.5 text-sm text-tinta-suave">Sin cosechas previas para promediar</p>
                  </>
                ) : (
                  <>
                    <p className="text-3xl font-semibold text-tinta">
                      {parcela.rendimientoEstimadoTnHa}{" "}
                      <span className="text-base font-medium text-tinta-suave">t/ha</span>
                    </p>
                    <p className="mt-1 text-sm text-tinta-suave">
                      {parcela.produccionEstimadaTotalTn !== null
                        ? `≈ ${parcela.produccionEstimadaTotalTn} t en total · promedio histórico`
                        : TEXTOS.PRODUCCION_SIN_ESTIMACION.texto}
                    </p>
                    {publicarAdvertencia && (
                      <div className="mt-3">
                        <Advertencia
                          tipo="ATENCION"
                          titulo="No se puede validar"
                          texto={TEXTOS.MENOS_DE_TRES_CAMPANAS}
                        />
                      </div>
                    )}
                  </>
                )}
              </DatoClave>
            </div>
          </div>

          {/* Contenido en 2 columnas */}
          <div className="mt-14 grid gap-10 lg:grid-cols-12 lg:gap-8">
            <div className="space-y-12 lg:col-span-7">
              {parcela.fotos.length > 0 && (
                <section>
                  <TituloSeccion icono={Camera}>Fotos de campo ({parcela.fotos.length})</TituloSeccion>
                  <GaleriaFotosCliente fotos={parcela.fotos} nombreParcela={parcela.nombre} />
                </section>
              )}

              <section>
                <TituloSeccion icono={LineChart}>Histórico de rendimiento</TituloSeccion>
                <p className="mt-1 text-sm text-tinta-suave">Toneladas por hectárea de las campañas anteriores.</p>
                <div className="mt-5 rounded-tarjeta bg-superficie p-5 shadow-tarjeta">
                  <RendimientoChart datos={parcela.historicoRendimiento} />
                </div>
              </section>

              <section>
                <TituloSeccion icono={ListChecks}>Historial de cuidado</TituloSeccion>
                <p className="mt-1 text-sm text-tinta-suave">Labores de la campaña actual.</p>
                <div className="mt-5 rounded-tarjeta bg-superficie p-3 shadow-tarjeta sm:p-4">
                  {parcela.historialCuidado.length === 0 ? (
                    <EstadoVacio mini titulo="Todavía no hay labores registradas">
                      <p>Las labores de la campaña actual aparecerán aquí.</p>
                    </EstadoVacio>
                  ) : (
                    <ol className="divide-y divide-borde">
                      {parcela.historialCuidado.map((item, index) => (
                        <li key={index}>
                          <ActivityItem tipo={item.tipo} fecha={item.fecha} descripcion={item.descripcion} />
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              </section>
            </div>

            {/* Contacto: fijo al bajar en pantalla grande (top-24 = debajo de la barra) */}
            <aside className="lg:col-span-5">
              <section className="rounded-tarjeta bg-marca-oscuro p-6 text-white shadow-flotante sm:p-8 lg:sticky lg:top-24">
                <span className="inline-flex rounded-full border border-white/25 px-3 py-1 text-sm font-medium text-white/90">
                  Contacto directo
                </span>
                <h2 className="mt-4 font-titulo text-4xl leading-tight">¿Te interesa esta parcela?</h2>
                <p className="mt-2 text-base text-white/85">
                  Habla con el equipo de AgroAn para recibir más información o coordinar una visita
                  al campo.
                </p>

                {tieneContacto ? (
                  <div className="mt-6 space-y-3">
                    {contacto.nombre && (
                      <div className="flex items-center gap-3 rounded-control bg-white/10 px-4 py-3 text-sm">
                        <Building2 className="h-4 w-4 shrink-0" aria-hidden />
                        <span>
                          Empresa: <strong>{contacto.nombre}</strong>
                        </span>
                      </div>
                    )}
                    {contacto.telefono && (
                      <a
                        href={`tel:${contacto.telefono.replace(/\s+/g, "")}`}
                        className="flex min-h-11 items-center gap-3 rounded-control bg-white/10 px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-white/15"
                      >
                        <Phone className="h-4 w-4 shrink-0" aria-hidden />
                        {contacto.telefono}
                      </a>
                    )}
                    {contacto.email && (
                      <a
                        href={`mailto:${contacto.email}`}
                        className="flex min-h-11 items-center gap-3 break-all rounded-control bg-white/10 px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-white/15"
                      >
                        <Mail className="h-4 w-4 shrink-0" aria-hidden />
                        {contacto.email}
                      </a>
                    )}
                    {whatsappHref && (
                      <a
                        href={whatsappHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-superficie px-6 text-base font-semibold text-tinta transition-colors hover:bg-marca-suave"
                      >
                        <MessageCircle className="h-5 w-5 text-marca" aria-hidden />
                        Consultar por WhatsApp
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="mt-5 rounded-control border border-dashed border-white/30 bg-white/10 p-4 text-sm text-white/90">
                    Todavía no hay datos de contacto configurados para esta parcela.
                  </div>
                )}
              </section>
            </aside>
          </div>
        </div>
      </main>

      <PiePublico />
    </div>
  );
}
