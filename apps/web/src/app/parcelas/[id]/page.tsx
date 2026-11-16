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
  MapPinned,
  MessageCircle,
  Phone,
  Ruler,
  ShieldCheck,
  Sprout,
  TrendingUp,
} from "lucide-react";
import { notFound } from "next/navigation";
import { Advertencia } from "@/components/estado/advertencia";
import { EstadoBadge } from "@/components/estado/estado-badge";
import { EstadoVacio } from "@/components/estado/estado-vacio";
import { IconoActividad } from "@/components/icono-actividad";
import { LandingNavbar } from "@/components/publico/landing-navbar";
import { formatearFecha } from "@/lib/format";
import { puedePublicarse, TEXTOS } from "@/lib/textos";
import type { DetalleParcelaPublico } from "@/lib/types";
import { TIPO_ACTIVIDAD_LABEL } from "@/lib/types";
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

  return (
    <div className="flex min-h-screen flex-col bg-[#f8faf9] text-[#17211D]">
      <LandingNavbar />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        {/* Barra de navegacion superior */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/parcelas"
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#E4EAE6] bg-white px-4 text-sm font-semibold text-[#17211D] shadow-xs transition-colors hover:border-[#00a859] hover:text-[#006B4F]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Volver al catálogo de parcelas
          </Link>

          <Link
            href="/#parcelas-preventa"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-[#68736D] transition-colors hover:text-[#006B4F]"
          >
            Inicio
          </Link>
        </div>

        {/* Encabezado principal unificado */}
        <section className="rounded-3xl border border-[#E4EAE6] bg-white p-6 shadow-xs sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#00a859]/12 px-3 py-1 text-xs font-bold text-[#004b36]">
                  <Sprout className="h-3.5 w-3.5 text-[#00a859]" aria-hidden />
                  {parcela.temporadaActual ?? "Campaña actual"}
                </span>
                {parcela.cultivoActual && (
                  <span className="rounded-full bg-[#f8faf9] px-3 py-1 text-xs font-semibold text-stone-700 ring-1 ring-stone-200">
                    {parcela.cultivoActual}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 rounded-full bg-[#E8F5EF] px-3 py-1 text-xs font-semibold text-[#006B4F]">
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                  Disponible para preventa
                </span>
              </div>

              <h1 className="mt-4 text-2xl font-bold tracking-tight text-[#17211D] sm:text-3xl">
                {parcela.nombre}
              </h1>
              <p className="mt-2 flex items-center gap-2 text-base text-[#68736D]">
                <MapPin className="h-4 w-4 shrink-0 text-[#00a859]" aria-hidden />
                {parcela.ubicacionTexto}
              </p>
            </div>

            <div className="shrink-0 rounded-2xl border border-[#E4EAE6] bg-[#f8faf9] px-4 py-3.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-sm font-semibold text-[#17211D]">
                  Registros protegidos contra cambios:
                </span>
                <EstadoBadge
                  estado={parcela.registrosVerificados ? "BIEN" : "CRITICO"}
                />
              </div>
              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-[#68736D]">
                <ShieldCheck className="h-4 w-4 shrink-0 text-[#00a859]" aria-hidden />
                Verificados con cadena SHA-256
              </p>
            </div>
          </div>

          {/* 3 tarjetas resumen fáciles de leer */}
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-[#E4EAE6] bg-[#f8faf9] p-5">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#68736D]">
                <Ruler className="h-4 w-4 text-[#00a859]" aria-hidden />
                Superficie total
              </p>
              <p className="mt-2 text-2xl font-bold text-[#17211D]">
                {parcela.hectareas} ha
              </p>
              <p className="mt-1 text-xs text-[#68736D]">
                Área medida sobre polígono georreferenciado
              </p>
            </div>

            <div className="rounded-2xl border border-[#E4EAE6] bg-[#f8faf9] p-5">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#68736D]">
                <Sprout className="h-4 w-4 text-[#00a859]" aria-hidden />
                Cultivo actual
              </p>
              <p className="mt-2 text-2xl font-bold text-[#17211D]">
                {parcela.cultivoActual ?? "Sin campaña activa"}
              </p>
              <p className="mt-1 text-xs text-[#68736D]">
                {parcela.temporadaActual ?? "Sin temporada asignada"}
              </p>
            </div>

            <div className="rounded-2xl border border-[#E4EAE6] bg-[#f8faf9] p-5">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#68736D]">
                <TrendingUp className="h-4 w-4 text-[#00a859]" aria-hidden />
                {TEXTOS.LINEA_BASE_ETIQUETA.texto}
              </p>
              {parcela.rendimientoEstimadoTnHa === null ? (
                <div className="mt-2">
                  <EstadoBadge estado="SIN_DATOS" />
                  <p className="mt-1.5 text-xs text-[#68736D]">
                    Sin cosechas previas para promediar
                  </p>
                </div>
              ) : (
                <>
                  <p className="mt-2 text-2xl font-bold text-[#006B4F]">
                    {parcela.rendimientoEstimadoTnHa}{" "}
                    <span className="text-base font-semibold text-[#17211D]">
                      t/ha
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-[#68736D]">
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
            </div>
          </div>
        </section>

        {/* Contenido principal en 2 columnas */}
        <div className="mt-6 grid gap-6 lg:grid-cols-12">
          {/* Columna izquierda */}
          <div className="space-y-6 lg:col-span-7">
            {/* Mapa */}
            <section className="rounded-3xl border border-[#E4EAE6] bg-white p-6 shadow-xs">
              <h2 className="flex items-center gap-2.5 text-lg font-bold text-[#17211D]">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#00a859]/12 text-[#006B4F]">
                  <MapPinned className="h-5 w-5" aria-hidden />
                </span>
                Dónde está la parcela (polígono georreferenciado)
              </h2>

              {parcela.poligono ? (
                <div className="mt-4 overflow-hidden rounded-2xl border border-[#E4EAE6]">
                  <MiniMapaCliente poligono={parcela.poligono} />
                </div>
              ) : (
                <div className="mt-4">
                  <EstadoVacio mini titulo="Sin polígono dibujado">
                    <p>
                      Esta parcela aún no tiene su contorno dibujado en el mapa.
                    </p>
                  </EstadoVacio>
                </div>
              )}
            </section>

            {/* Fotos */}
            {parcela.fotos.length > 0 && (
              <section className="rounded-3xl border border-[#E4EAE6] bg-white p-6 shadow-xs">
                <h2 className="flex items-center gap-2.5 text-lg font-bold text-[#17211D]">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#00a859]/12 text-[#006B4F]">
                    <Camera className="h-5 w-5" aria-hidden />
                  </span>
                  Fotos de campo ({parcela.fotos.length})
                </h2>

                <GaleriaFotosCliente
                  fotos={parcela.fotos}
                  nombreParcela={parcela.nombre}
                />
              </section>
            )}

            {/* Historico de rendimiento */}
            <section className="rounded-3xl border border-[#E4EAE6] bg-white p-6 shadow-xs">
              <h2 className="flex items-center gap-2.5 text-lg font-bold text-[#17211D]">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#00a859]/12 text-[#006B4F]">
                  <LineChart className="h-5 w-5" aria-hidden />
                </span>
                Histórico de rendimiento (campañas anteriores)
              </h2>

              <div className="mt-4">
                <RendimientoChart datos={parcela.historicoRendimiento} />
              </div>
            </section>
          </div>

          {/* Columna derecha */}
          <div className="space-y-6 lg:col-span-5">
            {/* Historial de cuidado */}
            <section className="rounded-3xl border border-[#E4EAE6] bg-white p-6 shadow-xs">
              <h2 className="flex items-center gap-2.5 text-lg font-bold text-[#17211D]">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#00a859]/12 text-[#006B4F]">
                  <ListChecks className="h-5 w-5" aria-hidden />
                </span>
                Historial de cuidado (campaña actual)
              </h2>

              <div className="mt-4">
                {parcela.historialCuidado.length === 0 ? (
                  <EstadoVacio mini titulo="Todavía no hay labores registradas">
                    <p>Las labores de la campaña actual aparecerán aquí.</p>
                  </EstadoVacio>
                ) : (
                  <ol className="space-y-4 border-l-2 border-[#00a859]/35 pl-4">
                    {parcela.historialCuidado.map((item, index) => (
                      <li key={index} className="rounded-2xl bg-[#f8faf9] p-3.5">
                        <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-[#17211D]">
                          <IconoActividad tipo={item.tipo} />
                          <span>{TIPO_ACTIVIDAD_LABEL[item.tipo]}</span>
                          <span className="font-normal text-[#68736D]">
                            · {formatearFecha(item.fecha)}
                          </span>
                        </p>
                        <p className="mt-1 text-sm text-[#68736D]">
                          {item.descripcion}
                        </p>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </section>

            {/* Tarjeta de contacto directo */}
            <section className="rounded-3xl bg-[#004b36] p-6 text-white shadow-xl sm:p-7">
              <span className="inline-flex rounded-full bg-[#00a859]/25 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#00a859]">
                Preventa directa
              </span>
              <h2 className="mt-3 text-xl font-bold tracking-tight sm:text-2xl">
                ¿Te interesa esta parcela? Contáctate con AgroAn
              </h2>
              <p className="mt-2 text-sm text-emerald-100/85">
                Comunícate directamente con nuestro equipo para recibir más
                información técnica o coordinar una visita en campo.
              </p>

              {tieneContacto ? (
                <div className="mt-5 space-y-3">
                  {contacto.nombre && (
                    <div className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 text-sm">
                      <Building2
                        className="h-4 w-4 shrink-0 text-[#00a859]"
                        aria-hidden
                      />
                      <span>
                        Empresa: <strong>{contacto.nombre}</strong>
                      </span>
                    </div>
                  )}

                  {contacto.telefono && (
                    <a
                      href={`tel:${contacto.telefono.replace(/\s+/g, "")}`}
                      className="flex min-h-11 items-center gap-3 rounded-2xl bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/15"
                    >
                      <Phone
                        className="h-4 w-4 shrink-0 text-[#00a859]"
                        aria-hidden
                      />
                      {contacto.telefono}
                    </a>
                  )}

                  {contacto.email && (
                    <a
                      href={`mailto:${contacto.email}`}
                      className="flex min-h-11 items-center gap-3 rounded-2xl bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/15"
                    >
                      <Mail
                        className="h-4 w-4 shrink-0 text-[#00a859]"
                        aria-hidden
                      />
                      {contacto.email}
                    </a>
                  )}

                  {whatsappHref && (
                    <a
                      href={whatsappHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-bold text-[#004b36] shadow-md transition-transform hover:-translate-y-0.5 hover:bg-[#E8F5EF]"
                    >
                      <MessageCircle
                        className="h-5 w-5 text-[#00a859]"
                        aria-hidden
                      />
                      Consultar por WhatsApp
                    </a>
                  )}
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-white/15 bg-white/10 p-4 text-sm text-emerald-100">
                  Todavía no hay datos de contacto configurados para esta parcela.
                </div>
              )}
            </section>
          </div>
        </div>
      </main>

      <footer className="border-t border-[#E4EAE6] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-[#68736D] sm:flex-row sm:px-6">
          <Link href="/#inicio" className="inline-flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#004b36] text-[#00a859]">
              <Sprout className="h-4 w-4" aria-hidden />
            </span>
            <span className="font-bold text-[#17211D]">AgriTrack</span>
            <span>· AgroAn</span>
          </Link>

          <div className="flex flex-wrap items-center gap-5 font-medium">
            <Link href="/#inicio" className="hover:text-[#00a859]">
              Inicio
            </Link>
            <Link href="/parcelas" className="hover:text-[#00a859]">
              Catálogo completo
            </Link>
            <Link href="/login" className="hover:text-[#00a859]">
              Acceder al panel
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
